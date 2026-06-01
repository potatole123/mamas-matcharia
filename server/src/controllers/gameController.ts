import { ProfileModel } from "../models/profile"
import { SessionModel } from "../models/session"
import { SinglePlayerGameStateModel } from "../models/singlePlayerGameState"
import type { RequestHandler } from "express"
import { MultiplayerGameStateModel } from "../models/multiplayerGameState"
import type { HydratedDocument } from "mongoose"
import {
  buildFullRecipeSet,
  buildRecipeSetForUnlockedLevel,
  getLevelConfig,
  type LevelConfig,
  type RecipeSetInput,
} from "../gameProgression"
import { CustomerOrderModel } from "../models/customerOrder"
import { NPCModel, type NPC } from "../models/npc"
import { RecipeModel, type Recipe } from "../models/recipe"
import { RecipeSetModel } from "../models/recipeSet"
import {
  CREAM_TOP,
  CUP_SIZE,
  FLAVOR,
  ICE_LEVEL,
  MATCHA,
  MILK,
  POWDER,
  SWEETENER,
  SWEETNESS_LEVEL,
  TEMP,
} from "../types/enums"

const JOIN_CODE_PATTERN = /^\d{6}$/
const MAX_GROUP_CODE_ATTEMPTS = 10
const MAX_MULTIPLAYER_PLAYERS = 6
const MAX_RANDOM_SEED = 123_456_789
const MAX_NPC_COUNT = 20
const ORDER_EXPIRATION_SECONDS = 90

type DayStartBody = {
  level?: unknown
}

const MULTIPLAYER_LEVEL = 1

type LevelResultsBody = {
  dayScore?: unknown
  waitingScore?: unknown
  accuracyScore?: unknown
  measurementScore?: unknown
  toppingScore?: unknown
  totalScore?: unknown
  tipsEarned?: unknown
}

type DayScoreInput = {
  waitingScore?: unknown
  accuracyScore?: unknown
  measurementScore?: unknown
  toppingScore?: unknown
  totalScore?: unknown
  tipsEarned?: unknown
}

class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

function getErrorCode(err: unknown): unknown {
  if (typeof err === "object" && err !== null && "code" in err) {
    return err.code
  }
  return null
}

function getRequestBody(reqBody: unknown): Partial<Record<string, unknown>> {
  if (typeof reqBody === "object" && reqBody !== null) {
    return reqBody as Partial<Record<string, unknown>>
  }
  return {}
}

function assertFiniteNumber(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestError(`${fieldName} must be a finite number`)
  }

  return value
}

function assertInteger(value: unknown, fieldName: string) {
  const numberValue = assertFiniteNumber(value, fieldName)

  if (!Number.isInteger(numberValue)) {
    throw new BadRequestError(`${fieldName} must be an integer`)
  }

  return numberValue
}

function assertNonNegativeInteger(value: unknown, fieldName: string) {
  const numberValue = assertInteger(value, fieldName)

  if (numberValue < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`)
  }

  return numberValue
}

function normalizeLevel(value: unknown) {
  const level = assertInteger(value, "level")

  if (level < 1) {
    throw new BadRequestError("level must be an integer greater than or equal to 1")
  }

  return level
}

function getDaySeed(npcSeed: number, level: number) {
  return npcSeed + level * 10_000
}

function makeSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function normalizeOptions<T extends string>(
    values: unknown,
    defaults: readonly T[],
    fieldName: string,
) {
  if (values === undefined) {
    return [...defaults]
  }

  if (!Array.isArray(values) || values.length === 0) {
    throw new BadRequestError(`${fieldName} must be a non-empty array`)
  }

  const allowed = new Set<string>(defaults)
  const normalized = values.map((value) => {
    if (typeof value !== "string" || !allowed.has(value)) {
      throw new BadRequestError(`${fieldName} contains an invalid value`)
    }

    return value as T
  })

  return [...new Set(normalized)]
}

function normalizeRecipeSet(value: unknown) {
  const input =
      typeof value === "object" && value !== null ? (value as RecipeSetInput) : {}

  return {
    cupSizeSet: normalizeOptions(input.cupSizeSet, CUP_SIZE, "cupSizeSet"),
    tempSet: normalizeOptions(input.tempSet, TEMP, "tempSet"),
    iceLevelSet: normalizeOptions(input.iceLevelSet, ICE_LEVEL, "iceLevelSet"),
    matchaSet: normalizeOptions(input.matchaSet, MATCHA, "matchaSet"),
    milkSet: normalizeOptions(input.milkSet, MILK, "milkSet"),
    flavorSet: normalizeOptions(input.flavorSet, FLAVOR, "flavorSet"),
    sweetenerSet: normalizeOptions(
        input.sweetenerSet,
        SWEETENER,
        "sweetenerSet",
    ),
    sweetnessLevelSet: normalizeOptions(
        input.sweetnessLevelSet,
        SWEETNESS_LEVEL,
        "sweetnessLevelSet",
    ),
    creamTopSet: normalizeOptions(input.creamTopSet, CREAM_TOP, "creamTopSet"),
    powderSet: normalizeOptions(input.powderSet, POWDER, "powderSet"),
  }
}

function choose<T>(values: readonly T[], random: () => number) {
  return values[Math.floor(random() * values.length)] as T
}

function buildRecipe(
    recipeId: string,
    recipeSet: ReturnType<typeof normalizeRecipeSet>,
    random: () => number,
): Omit<Recipe, "createdAt" | "updatedAt"> {
  return {
    recipeId,
    cupSize: choose(recipeSet.cupSizeSet, random),
    temp: choose(recipeSet.tempSet, random),
    iceLevel: choose(recipeSet.iceLevelSet, random),
    matcha: choose(recipeSet.matchaSet, random),
    milk: choose(recipeSet.milkSet, random),
    flavor: choose(recipeSet.flavorSet, random),
    sweetener: choose(recipeSet.sweetenerSet, random),
    sweetnessLevel: choose(recipeSet.sweetnessLevelSet, random),
    creamTop: choose(recipeSet.creamTopSet, random),
    powder: choose(recipeSet.powderSet, random),
  }
}

async function createDayNpcs(
    activeGameId: string,
    level: number,
    seed: number,
    config: LevelConfig,
) {
  const random = makeSeededRandom(seed)
  const recipeSet = normalizeRecipeSet(config.recipeSet)
  const batchId = `${activeGameId}-${level}-${Date.now()}`
  const baseNumberId = Date.now() * 1000 + Math.abs(seed % 1000)
  const now = Date.now()
  const npcs = []

  for (let index = 0; index < config.npcCount; index += 1) {
    const numberId = baseNumberId + index
    const enterTime = new Date(now)
    const expirationTime = new Date(
        enterTime.getTime() + ORDER_EXPIRATION_SECONDS * 1000,
    )
    const recipe = await RecipeModel.create(
        buildRecipe(`game-${batchId}-recipe-${index + 1}`, recipeSet, random),
    )
    const order = await CustomerOrderModel.create({
      orderId: numberId,
      recipe: recipe._id,
      expirationTime,
      status: "waiting",
    })
    const npc = await NPCModel.create({
      npcId: numberId,
      order: order._id,
      enterTime,
    })
    const populatedNpc = await npc.populate({
      path: "order",
      populate: { path: "recipe" },
    })

    npcs.push(serializeDayNpc(populatedNpc))
  }

  return npcs
}

function serializeDayNpc(npc: HydratedDocument<NPC>) {
  const payload = npc.toObject({
    depopulate: false,
    flattenObjectIds: true,
    versionKey: false,
  }) as unknown as {
    npcId: number
    order?: {
      orderId: number
      recipe?: Partial<Recipe>
    }
  }
  const recipe = payload.order?.recipe ?? {}

  return {
    npcId: payload.npcId,
    order: {
      orderId: payload.order?.orderId,
      recipe: {
        recipeId: recipe.recipeId,
        cupSize: recipe.cupSize,
        temp: recipe.temp,
        iceLevel: recipe.iceLevel,
        matcha: recipe.matcha,
        milk: recipe.milk,
        flavor: recipe.flavor,
        sweetener: recipe.sweetener,
        sweetnessLevel: recipe.sweetnessLevel,
        creamTop: recipe.creamTop,
        powder: recipe.powder,
      },
    },
  }
}

function serializeNpc(npc: HydratedDocument<NPC>) {
  const payload = npc.toObject({
    depopulate: false,
    flattenObjectIds: true,
    versionKey: false,
  })

  return {
    npcId: payload.npcId,
    order: payload.order,
    enterTime: payload.enterTime,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  }
}

function createRandomSeed() {
  return Math.floor(Math.random() * MAX_RANDOM_SEED)
}

function parseNpcSeed(reqBody: unknown) {
  const body = getRequestBody(reqBody)
  const seed = body.npcSeed ?? body.seed

  if (seed === undefined) {
    return createRandomSeed()
  }

  if (
      typeof seed !== "number" ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > Number.MAX_SAFE_INTEGER
  ) {
    throw new BadRequestError("npcSeed must be a non-negative integer")
  }
  return seed
}

function serializeSinglePlayerGame(game: {
  _id: unknown
  playerId: string
  results: unknown[]
  session: unknown
  npcSeed: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    gameId: String(game._id),
    playerId: game.playerId,
    results: game.results,
    session: String(game.session),
    npcSeed: game.npcSeed,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  }
}

function serializeSession(session: {
  _id: unknown
  profile: unknown
  activeGame?: unknown
  activeGameModel?: string | null
  activeLevel?: number | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    sessionId: String(session._id),
    profile: String(session.profile),
    activeGame: session.activeGame ? String(session.activeGame) : null,
    activeGameModel: session.activeGameModel ?? null,
    activeLevel: session.activeLevel ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

function serializeProfile(profile: {
  userId: string
  displayName: string
  coinBalance: number
  highestDayUnlocked: number
  tutorialCompleted: boolean
  recipeSet?: unknown
  createdAt: Date
  updatedAt: Date
}) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    coinBalance: profile.coinBalance,
    highestDayUnlocked: profile.highestDayUnlocked,
    tutorialCompleted: profile.tutorialCompleted,
    recipeSet: serializeProfileRecipeSet(profile.recipeSet),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

function serializeProfileRecipeSet(recipeSet: unknown) {
  if (typeof recipeSet !== "object" || recipeSet === null) {
    return recipeSet ? String(recipeSet) : null
  }

  if (!("cupSizeSet" in recipeSet)) {
    return "_id" in recipeSet ? String(recipeSet._id) : null
  }

  const payload = recipeSet as Record<string, unknown>

  return {
    id: "_id" in payload ? String(payload._id) : undefined,
    cupSizeSet: payload.cupSizeSet,
    tempSet: payload.tempSet,
    iceLevelSet: payload.iceLevelSet,
    matchaSet: payload.matchaSet,
    milkSet: payload.milkSet,
    flavorSet: payload.flavorSet,
    sweetenerSet: payload.sweetenerSet,
    sweetnessLevelSet: payload.sweetnessLevelSet,
    creamTopSet: payload.creamTopSet,
    powderSet: payload.powderSet,
  }
}

async function updateProfileRecipeSet(profile: {
  recipeSet?: unknown
  highestDayUnlocked: number
}) {
  const recipeSet = buildRecipeSetForUnlockedLevel(profile.highestDayUnlocked)

  if (profile.recipeSet) {
    await RecipeSetModel.findByIdAndUpdate(
        profile.recipeSet,
        { $set: recipeSet },
        { runValidators: true },
    )
    return
  }

  const createdRecipeSet = await RecipeSetModel.create(recipeSet)
  profile.recipeSet = createdRecipeSet._id
}

function serializeMultiplayerGame(game: {
  _id: unknown
  creatorId: string
  playerIds: string[]
  results: unknown[]
  session: unknown
  groupCode: string
  ranking: string[]
  npcSeed: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    gameId: String(game._id),
    creatorId: game.creatorId,
    playerIds: game.playerIds,
    results: game.results,
    session: String(game.session),
    groupCode: game.groupCode,
    ranking: game.ranking,
    npcSeed: game.npcSeed,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  }
}

async function getActiveGameInfo(session: {
  activeGame?: unknown
  activeGameModel?: string | null
}) {
  if (!session.activeGame || !session.activeGameModel) {
    return null
  }

  if (session.activeGameModel === "SinglePlayerGameState") {
    const game = await SinglePlayerGameStateModel.findById(session.activeGame)

    if (!game) {
      return null
    }

    return {
      gameId: String(game._id),
      mode: "singleplayer",
      npcSeed: game.npcSeed,
    }
  }

  if (session.activeGameModel === "MultiplayerGameState") {
    const game = await MultiplayerGameStateModel.findById(session.activeGame)

    if (!game) {
      return null
    }

    return {
      gameId: String(game._id),
      mode: "multiplayer",
      npcSeed: game.npcSeed,
    }
  }

  return null
}

async function appendDayResult(
    session: {
      activeGame?: unknown
      activeGameModel?: string | null
    },
    dayResult: {
      level: number
      waitingScore: number
      accuracyScore: number
      measurementScore: number
      toppingScore: number
      totalScore: number
      tipsEarned: number
      passed: boolean
      completedAt: Date
    },
) {
  if (!session.activeGame || !session.activeGameModel) {
    return
  }

  if (session.activeGameModel === "SinglePlayerGameState") {
    await SinglePlayerGameStateModel.updateOne(
        { _id: session.activeGame },
        { $push: { results: dayResult } },
    )
    return
  }

  if (session.activeGameModel === "MultiplayerGameState") {
    await MultiplayerGameStateModel.updateOne(
        { _id: session.activeGame },
        { $push: { results: dayResult } },
    )
  }
}

function createGroupCode() {
  return Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0")
}

async function createUniqueGroupCode() {
  for (let attempt = 0; attempt < MAX_GROUP_CODE_ATTEMPTS; attempt += 1) {
    const groupCode = createGroupCode()
    const existingGame = await MultiplayerGameStateModel.exists({ groupCode })

    if (!existingGame) {
      return groupCode
    }
  }
  throw new Error("Could not generate unique group code")
}

function parseGroupCode(reqBody: unknown, required: boolean) {
  const body = getRequestBody(reqBody)
  const value = body.groupCode ?? body.joinCode

  if (value === undefined) {
    if (required) {
      throw new BadRequestError("groupCode is required")
    }
    return null
  }

  if (typeof value !== "string") {
    throw new BadRequestError("groupCode must be exactly 6 digits")
  }

  const groupCode = value.trim()

  if (!JOIN_CODE_PATTERN.test(groupCode)) {
    throw new BadRequestError("groupCode must be exactly 6 digits")
  }

  return groupCode
}

function hasSameObjectId(left: unknown, right: unknown) {
  return String(left) === String(right)
}

function parseDayScore(reqBody: unknown) {
  const body = getRequestBody(reqBody) as LevelResultsBody
  const rawDayScore = body.dayScore === undefined ? body : body.dayScore
  const dayScore = getRequestBody(rawDayScore) as DayScoreInput
  const waitingScore = assertNonNegativeInteger(
      dayScore.waitingScore,
      "dayScore.waitingScore",
  )
  const accuracyScore = assertNonNegativeInteger(
      dayScore.accuracyScore,
      "dayScore.accuracyScore",
  )
  const measurementScore = assertNonNegativeInteger(
      dayScore.measurementScore,
      "dayScore.measurementScore",
  )
  const toppingScore = assertNonNegativeInteger(
      dayScore.toppingScore,
      "dayScore.toppingScore",
  )
  const totalScore = assertNonNegativeInteger(
      dayScore.totalScore,
      "dayScore.totalScore",
  )
  const tipsEarned = assertFiniteNumber(dayScore.tipsEarned, "dayScore.tipsEarned")

  if (tipsEarned < 0) {
    throw new BadRequestError("dayScore.tipsEarned must be non-negative")
  }

  return {
    waitingScore,
    accuracyScore,
    measurementScore,
    toppingScore,
    totalScore,
    tipsEarned,
  }
}

export const startGameDay: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const body = (req.body ?? {}) as DayStartBody
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await SessionModel.findOne({ profile: profile._id })

    if (!session?.activeGame) {
      return res.status(409).json({
        error: "User does not have an active game",
      })
    }

    const activeGame = await getActiveGameInfo(session)

    if (!activeGame) {
      return res.status(404).json({
        error: "Active game was not found",
      })
    }

    const level =
        activeGame.mode === "multiplayer"
          ? MULTIPLAYER_LEVEL
          : body.level === undefined
            ? profile.highestDayUnlocked
            : normalizeLevel(body.level)

    if (activeGame.mode === "singleplayer" && level > profile.highestDayUnlocked) {
      return res.status(403).json({
        error: "Level is locked",
      })
    }

    const config = getLevelConfig(level)
    const dayConfig =
        activeGame.mode === "multiplayer"
          ? {
              ...config,
              recipeSet: buildFullRecipeSet(),
            }
          : config
    const seed = getDaySeed(activeGame.npcSeed, level)
    session.activeLevel = level
    await session.save()

    return res.status(200).json({
      day: {
        level,
        mode: activeGame.mode,
        gameId: activeGame.gameId,
        seed,
        targetScore: dayConfig.targetScore,
        npcCount: dayConfig.npcCount,
      },
      npcs: await createDayNpcs(activeGame.gameId, level, seed, dayConfig),
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    console.error(err)
    return res.status(500).json({
      error: "Could not start game day",
    })
  }
}

export const createSinglePlayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const npcSeed = parseNpcSeed(req.body)
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const existingGame = await SinglePlayerGameStateModel.findOne({
      playerId: userId,
    })

    if (existingGame) {
      return res.status(409).json({
        error: "Single-player game already exists",
        game: serializeSinglePlayerGame(existingGame),
      })
    }

    let session = await SessionModel.findOne({ profile: profile._id })

    if (session?.activeGame) {
      return res.status(409).json({
        error: "User already has an active game",
      })
    }

    if (!session) {
      session = await SessionModel.create({
        profile: profile._id,
        activeGame: null,
        activeGameModel: null,
      })
    }

    const game = await SinglePlayerGameStateModel.create({
      playerId: userId,
      results: [],
      session: session._id,
      npcSeed,
    })

    session.activeGame = game._id
    session.activeGameModel = "SinglePlayerGameState"
    await session.save()

    return res.status(201).json({
      game: serializeSinglePlayerGame(game),
      session: serializeSession(session),
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    if (getErrorCode(err) === 11000) {
      return res.status(409).json({
        error: "Single-player game already exists",
      })
    }

    console.error(err)
    return res.status(500).json({
      error: "Could not create single-player game",
    })
  }
}

export const deleteSinglePlayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const game = await SinglePlayerGameStateModel.findOne({
      playerId: userId,
    })

    if (!game) {
      return res.status(404).json({
        error: "Single-player game was not found",
      })
    }

    await Promise.all([
      SinglePlayerGameStateModel.deleteOne({ _id: game._id }),
      SessionModel.updateOne(
          {
            _id: game.session,
            activeGame: game._id,
            activeGameModel: "SinglePlayerGameState",
          },
          {
            $set: {
              activeGame: null,
              activeGameModel: null,
            },
          },
      ),
    ])

    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not delete single-player game",
    })
  }
}

export const createMultiplayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const requestedGroupCode = parseGroupCode(req.body, false)
    const npcSeed = parseNpcSeed(req.body)
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    let session = await SessionModel.findOne({ profile: profile._id })

    if (session?.activeGame) {
      return res.status(409).json({
        error: "User already has an active game",
      })
    }

    if (!session) {
      session = await SessionModel.create({
        profile: profile._id,
        activeGame: null,
        activeGameModel: null,
      })
    }

    const groupCode = requestedGroupCode ?? (await createUniqueGroupCode())
    const game = await MultiplayerGameStateModel.create({
      creatorId: userId,
      playerIds: [userId],
      results: [],
      session: session._id,
      groupCode,
      ranking: [],
      npcSeed,
    })

    session.activeGame = game._id
    session.activeGameModel = "MultiplayerGameState"
    await session.save()

    return res.status(201).json({
      game: serializeMultiplayerGame(game),
      session: serializeSession(session),
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    if (getErrorCode(err) === 11000) {
      return res.status(409).json({
        error: "Multiplayer game code already exists",
      })
    }

    console.error(err)
    return res.status(500).json({
      error: "Could not create multiplayer game",
    })
  }
}

export const joinMultiplayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const groupCode = parseGroupCode(req.body, true)
    const [profile, game] = await Promise.all([
      ProfileModel.findOne({ userId }),
      MultiplayerGameStateModel.findOne({ groupCode }),
    ])

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    if (!game) {
      return res.status(404).json({
        error: "Multiplayer game was not found",
      })
    }

    if (
        !game.playerIds.includes(userId) &&
        game.playerIds.length >= MAX_MULTIPLAYER_PLAYERS
    ) {
      return res.status(409).json({
        error: "Multiplayer game is full",
      })
    }

    let session = await SessionModel.findOne({ profile: profile._id })

    if (session?.activeGame) {
      const alreadyInThisGame =
          session.activeGameModel === "MultiplayerGameState" &&
          hasSameObjectId(session.activeGame, game._id)

      if (!alreadyInThisGame) {
        return res.status(409).json({
          error: "User already has an active game",
        })
      }
    }

    if (!session) {
      session = await SessionModel.create({
        profile: profile._id,
        activeGame: null,
        activeGameModel: null,
      })
    }

    const updatedGame = await MultiplayerGameStateModel.findByIdAndUpdate(
        game._id,
        {
          $addToSet: {
            playerIds: userId,
          },
        },
        {
          new: true,
        },
    )

    if (!updatedGame) {
      return res.status(404).json({
        error: "Multiplayer game was not found",
      })
    }

    session.activeGame = updatedGame._id
    session.activeGameModel = "MultiplayerGameState"
    await session.save()

    return res.status(200).json({
      game: serializeMultiplayerGame(updatedGame),
      session: serializeSession(session),
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }
    console.error(err)
    return res.status(500).json({
      error: "Could not join multiplayer game",
    })
  }
}

export const deleteMultiplayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const groupCode = parseGroupCode(req.body, false)
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await SessionModel.findOne({ profile: profile._id })
    let game = null

    if (groupCode) {
      game = await MultiplayerGameStateModel.findOne({
        creatorId: userId,
        groupCode,
      })
    } else if (
        session?.activeGame &&
        session.activeGameModel === "MultiplayerGameState"
    ) {
      game = await MultiplayerGameStateModel.findOne({
        _id: session.activeGame,
        creatorId: userId,
      })
    }

    if (!game) {
      return res.status(404).json({
        error: "Multiplayer game was not found",
      })
    }

    const affectedUserIds = Array.from(
        new Set([game.creatorId, ...game.playerIds]),
    )
    const affectedProfiles = await ProfileModel.find({
      userId: {
        $in: affectedUserIds,
      },
    }).select("_id")

    await Promise.all([
      MultiplayerGameStateModel.deleteOne({ _id: game._id }),
      SessionModel.updateMany(
          {
            profile: {
              $in: affectedProfiles.map((affectedProfile) => affectedProfile._id),
            },
            activeGame: game._id,
            activeGameModel: "MultiplayerGameState",
          },
          {
            $set: {
              activeGame: null,
              activeGameModel: null,
            },
          },
      ),
    ])
    return res.sendStatus(204)
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }
    console.error(err)
    return res.status(500).json({
      error: "Could not delete multiplayer game",
    })
  }
}

export const submitGameResults: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const body = getRequestBody(req.body)

    if ("dayScore" in body || "totalScore" in body) {
      const dayScore = parseDayScore(body)
      const profile = await ProfileModel.findOne({ userId })

      if (!profile) {
        return res.status(404).json({
          error: "User profile was not found",
        })
      }

      const session = await SessionModel.findOne({ profile: profile._id })
      const activeGame = session ? await getActiveGameInfo(session) : null

      if (!session?.activeGame || !activeGame) {
        return res.status(409).json({
          error: "User does not have an active game",
        })
      }

      if (!session.activeLevel) {
        return res.status(409).json({
          error: "User does not have an active level",
        })
      }

      const level = session.activeLevel

      if (level > profile.highestDayUnlocked) {
        return res.status(403).json({
          error: "Level is locked",
        })
      }

      const config = getLevelConfig(level)
      const passed = dayScore.totalScore >= config.targetScore
      const canUpdateProgression = activeGame.mode === "singleplayer"
      const unlockedNextLevel =
          canUpdateProgression && passed && level === profile.highestDayUnlocked

      profile.coinBalance += dayScore.tipsEarned

      if (unlockedNextLevel) {
        profile.highestDayUnlocked = level + 1
      }

      if (unlockedNextLevel || !profile.recipeSet) {
        await updateProfileRecipeSet(profile)
      }

      session.activeLevel = null
      await profile.save()
      await session.save()
      await profile.populate("recipeSet")
      await appendDayResult(session, {
        level,
        ...dayScore,
        passed,
        completedAt: new Date(),
      })

      return res.status(200).json({
        passed,
        unlockedNextLevel,
        targetScore: config.targetScore,
        level,
        dayScore,
        profile: serializeProfile(profile),
      })
    }

    return res.status(400).json({
      error: "dayScore is required",
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }
    console.error(err)
    return res.status(500).json({
      error: "Could not submit game results",
    })
  }
}
