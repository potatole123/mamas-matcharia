import { ProfileModel } from "../models/profile"
import { SessionModel } from "../models/session"
import { SinglePlayerGameStateModel } from "../models/singlePlayerGameState"
import type { RequestHandler } from "express"
import { MultiplayerGameStateModel } from "../models/multiplayerGameState"
import type { HydratedDocument, Types } from "mongoose"
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
  type Status,
} from "../types/enums"

const JOIN_CODE_PATTERN = /^\d{6}$/
const MAX_GROUP_CODE_ATTEMPTS = 10
const MIN_MULTIPLAYER_PLAYERS = 2
const MAX_MULTIPLAYER_PLAYERS = 4
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

function roundCurrencyAmount(amount: number) {
  return Math.round(amount * 100) / 100
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

function hashStringToNumber(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
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

async function getOrCreateRecipe(
    recipe: Omit<Recipe, "createdAt" | "updatedAt">,
) {
  const existingRecipe = await RecipeModel.findOne({ recipeId: recipe.recipeId })

  if (existingRecipe) {
    return existingRecipe
  }

  try {
    return await RecipeModel.create(recipe)
  } catch (err) {
    if (getErrorCode(err) === 11000) {
      const createdRecipe = await RecipeModel.findOne({ recipeId: recipe.recipeId })

      if (createdRecipe) {
        return createdRecipe
      }
    }

    throw err
  }
}

async function getOrCreateCustomerOrder(
    order: {
      orderId: number
      recipe: Types.ObjectId
      expirationTime: Date
      status: Status
    },
) {
  const existingOrder = await CustomerOrderModel.findOne({
    orderId: order.orderId,
  })

  if (existingOrder) {
    return existingOrder
  }

  try {
    return await CustomerOrderModel.create(order)
  } catch (err) {
    if (getErrorCode(err) === 11000) {
      const createdOrder = await CustomerOrderModel.findOne({
        orderId: order.orderId,
      })

      if (createdOrder) {
        return createdOrder
      }
    }

    throw err
  }
}

async function getOrCreateNpc(npc: {
  npcId: number
  order: Types.ObjectId
  enterTime: Date
}) {
  const existingNpc = await NPCModel.findOne({ npcId: npc.npcId })

  if (existingNpc) {
    return existingNpc
  }

  try {
    return await NPCModel.create(npc)
  } catch (err) {
    if (getErrorCode(err) === 11000) {
      const createdNpc = await NPCModel.findOne({ npcId: npc.npcId })

      if (createdNpc) {
        return createdNpc
      }
    }

    throw err
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
  const batchId = `${activeGameId}-${level}`
  const baseNumberId = hashStringToNumber(batchId) * 100 + level * 10_000
  const baseTime = new Date(Date.UTC(2026, 0, 1, level, 0, 0))
  const npcs = []

  for (let index = 0; index < config.npcCount; index += 1) {
    const numberId = baseNumberId + index
    const enterTime = new Date(baseTime)
    const expirationTime = new Date(
        enterTime.getTime() + ORDER_EXPIRATION_SECONDS * 1000,
    )
    const recipe = await getOrCreateRecipe(
        buildRecipe(`game-${batchId}-recipe-${index + 1}`, recipeSet, random),
    )
    const order = await getOrCreateCustomerOrder({
      orderId: numberId,
      recipe: recipe._id,
      expirationTime,
      status: "waiting",
    })
    const npc = await getOrCreateNpc({
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
      status?: string
    }
  }
  const recipe = payload.order?.recipe ?? {}

  return {
    npcId: payload.npcId,
    order: {
      orderId: payload.order?.orderId,
      status: payload.order?.status,
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
  const seed =
      Object.prototype.hasOwnProperty.call(body, "npcSeed")
        ? body.npcSeed
        : body.seed

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
  startedAt?: Date | null
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
    startedAt: game.startedAt ?? null,
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
      startedAt: game.startedAt ?? null,
    }
  }

  return null
}

async function clearSessionActiveGame(session: {
  set: (values: Record<string, unknown>) => unknown
  save: () => Promise<unknown>
}) {
  session.set({
    activeGame: null,
    activeGameModel: null,
    activeLevel: null,
  })
  await session.save()
}

async function clearActiveMultiplayerSessions(gameId: unknown, userIds: string[]) {
  if (userIds.length === 0) {
    return
  }

  const affectedProfiles = await ProfileModel.find({
    userId: {
      $in: userIds,
    },
  }).select("_id")

  await SessionModel.updateMany(
      {
        profile: {
          $in: affectedProfiles.map((affectedProfile) => affectedProfile._id),
        },
        activeGame: gameId as Types.ObjectId,
        activeGameModel: "MultiplayerGameState",
      },
      {
        $set: {
          activeGame: null,
          activeGameModel: null,
          activeLevel: null,
        },
      },
  )
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
  const value =
      Object.prototype.hasOwnProperty.call(body, "groupCode")
        ? body.groupCode
        : body.joinCode

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
  const rawTipsEarned = assertFiniteNumber(dayScore.tipsEarned, "dayScore.tipsEarned")

  if (rawTipsEarned < 0) {
    throw new BadRequestError("dayScore.tipsEarned must be non-negative")
  }

  const tipsEarned = roundCurrencyAmount(rawTipsEarned)

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

    if (activeGame.mode === "multiplayer" && !activeGame.startedAt) {
      return res.status(409).json({
        error: "Multiplayer game has not started",
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
        npcFrequencySeconds: dayConfig.npcFrequencySeconds,
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
      return res.sendStatus(204)
    }

    await Promise.all([
      SinglePlayerGameStateModel.deleteOne({ _id: game._id }),
      SessionModel.deleteOne(
          {
            _id: game.session,
            activeGame: game._id,
            activeGameModel: "SinglePlayerGameState",
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
      if (session.activeGameModel === "MultiplayerGameState") {
        const existingGame = await MultiplayerGameStateModel.findById(
            session.activeGame,
        )

        if (existingGame) {
          if (!existingGame.playerIds.includes(userId)) {
            await clearSessionActiveGame(session)
          } else {
            return res.status(200).json({
              game: serializeMultiplayerGame(existingGame),
              session: serializeSession(session),
            })
          }
        } else {
          await clearSessionActiveGame(session)
        }
      } else if (session.activeGameModel === "SinglePlayerGameState") {
        await SinglePlayerGameStateModel.deleteOne({
          _id: session.activeGame,
        })
        await clearSessionActiveGame(session)
      } else {
        await clearSessionActiveGame(session)
      }
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
        if (session.activeGameModel === "SinglePlayerGameState") {
          await SinglePlayerGameStateModel.deleteOne({
            _id: session.activeGame,
          })
          await clearSessionActiveGame(session)
        } else if (session.activeGameModel === "MultiplayerGameState") {
          const activeGame = await MultiplayerGameStateModel.findById(
              session.activeGame,
          )

          if (activeGame && activeGame.playerIds.includes(userId)) {
            return res.status(409).json({
              error: "User already has an active game",
            })
          }

          if (activeGame) {
            await MultiplayerGameStateModel.updateOne(
                { _id: activeGame._id },
                {
                  $pull: {
                    playerIds: userId,
                  },
                },
            )
          }

          await clearSessionActiveGame(session)
        } else {
          await clearSessionActiveGame(session)
        }
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

export const startMultiplayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await SessionModel.findOne({ profile: profile._id })

    if (
        !session?.activeGame ||
        session.activeGameModel !== "MultiplayerGameState"
    ) {
      return res.status(409).json({
        error: "User does not have an active multiplayer game",
      })
    }

    const game = await MultiplayerGameStateModel.findById(session.activeGame)

    if (!game) {
      return res.status(404).json({
        error: "Multiplayer game was not found",
      })
    }

    if (game.creatorId !== userId) {
      return res.status(403).json({
        error: "Only the room creator can start the game",
      })
    }

    if (
        game.playerIds.length < MIN_MULTIPLAYER_PLAYERS ||
        game.playerIds.length > MAX_MULTIPLAYER_PLAYERS
    ) {
      return res.status(409).json({
        error: `Multiplayer game requires ${MIN_MULTIPLAYER_PLAYERS}-${MAX_MULTIPLAYER_PLAYERS} players`,
      })
    }

    if (!game.startedAt) {
      game.startedAt = new Date()
      await game.save()
    }

    return res.status(200).json({
      game: serializeMultiplayerGame(game),
      session: serializeSession(session),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not start multiplayer game",
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
      return res.sendStatus(204)
    }

    const affectedUserIds = Array.from(new Set([game.creatorId, ...game.playerIds]))

    await Promise.all([
      MultiplayerGameStateModel.deleteOne({ _id: game._id }),
      clearActiveMultiplayerSessions(game._id, affectedUserIds),
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

export const leaveMultiplayerGame: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const profile = await ProfileModel.findOne({ userId })

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await SessionModel.findOne({ profile: profile._id })

    if (
        !session?.activeGame ||
        session.activeGameModel !== "MultiplayerGameState"
    ) {
      return res.sendStatus(204)
    }

    const game = await MultiplayerGameStateModel.findById(session.activeGame)

    if (!game) {
      session.activeGame = null
      session.activeGameModel = null
      session.activeLevel = null
      await session.save()
      return res.sendStatus(204)
    }

    if (game.creatorId === userId) {
      const affectedUserIds = Array.from(new Set([game.creatorId, ...game.playerIds]))

      await Promise.all([
        MultiplayerGameStateModel.deleteOne({ _id: game._id }),
        clearActiveMultiplayerSessions(game._id, affectedUserIds),
      ])

      return res.sendStatus(204)
    }

    await Promise.all([
      MultiplayerGameStateModel.updateOne(
          { _id: game._id },
          {
            $pull: {
              playerIds: userId,
            },
          },
      ),
      SessionModel.updateOne(
          { _id: session._id },
          {
            $set: {
              activeGame: null,
              activeGameModel: null,
              activeLevel: null,
            },
          },
      ),
    ])

    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not leave multiplayer game",
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

      profile.coinBalance = roundCurrencyAmount(profile.coinBalance + dayScore.tipsEarned)

      if (level === 1 && !profile.tutorialCompleted) {
        profile.tutorialCompleted = true
      }

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
