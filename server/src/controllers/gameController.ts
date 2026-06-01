import { ProfileModel } from "../models/profile"
import { SessionModel } from "../models/session"
import { SinglePlayerGameStateModel } from "../models/singlePlayerGameState"
import type { RequestHandler } from "express"
import { MultiplayerGameStateModel } from "../models/multiplayerGameState"
import type { HydratedDocument } from "mongoose"
import { CustomerOrderModel } from "../models/customerOrder"
import { NPCModel, type NPC } from "../models/npc"
import { RecipeModel, type Recipe } from "../models/recipe"
import type { RecipeSet } from "../models/recipeSet"
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
const MAX_RANDOM_SEED = 123_456_789
const MIN_NPC_FREQUENCY_SECONDS = 2
const MAX_NPC_FREQUENCY_SECONDS = 6
const DEFAULT_NPC_COUNT = 5
const MAX_NPC_COUNT = 20
const ORDER_EXPIRATION_SECONDS = 90

type ProfileUpdates = {
  displayName?: string
  coinBalance?: number
  highestDayUnlocked?: number
  tutorialCompleted?: boolean
}

type RecipeSetInput = Partial<
  Pick<
    RecipeSet,
    | "cupSizeSet"
    | "tempSet"
    | "iceLevelSet"
    | "matchaSet"
    | "milkSet"
    | "flavorSet"
    | "sweetenerSet"
    | "sweetnessLevelSet"
    | "creamTopSet"
    | "powderSet"
  >
>

type NpcGenerateBody = {
  seed?: unknown
  freq?: unknown
  count?: unknown
  recipeSet?: unknown
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

function normalizeNpcCount(value: unknown) {
  if (value === undefined) {
    return DEFAULT_NPC_COUNT
  }

  const count = assertInteger(value, "count")

  if (count < 1 || count > MAX_NPC_COUNT) {
    throw new BadRequestError(`count must be between 1 and ${MAX_NPC_COUNT}`)
  }

  return count
}

function normalizeNpcFrequency(value: unknown) {
  const frequency = assertFiniteNumber(value, "freq")

  if (
      frequency < MIN_NPC_FREQUENCY_SECONDS ||
      frequency > MAX_NPC_FREQUENCY_SECONDS
  ) {
    throw new BadRequestError(
        `freq must be between ${MIN_NPC_FREQUENCY_SECONDS} and ${MAX_NPC_FREQUENCY_SECONDS}`,
    )
  }

  return frequency
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
  createdAt: Date
  updatedAt: Date
}) {
  return {
    sessionId: String(session._id),
    profile: String(session.profile),
    activeGame: session.activeGame ? String(session.activeGame) : null,
    activeGameModel: session.activeGameModel ?? null,
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
  createdAt: Date
  updatedAt: Date
}) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    coinBalance: profile.coinBalance,
    highestDayUnlocked: profile.highestDayUnlocked,
    tutorialCompleted: profile.tutorialCompleted,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
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

function parseProfileUpdates(reqBody: unknown) {
  const body = getRequestBody(reqBody)
  const updates: ProfileUpdates = {}

  if ("displayName" in body) {
    const displayName = body.displayName

    if (typeof displayName !== "string" || displayName.trim().length === 0) {
      throw new BadRequestError("displayName must be a non-empty string")
    }
    updates.displayName = displayName.trim()
  }

  if ("coinBalance" in body) {
    const coinBalance = body.coinBalance

    if (typeof coinBalance !== "number" || !Number.isFinite(coinBalance) || coinBalance < 0) {
      throw new BadRequestError("coinBalance must be a non-negative number")
    }
    updates.coinBalance = coinBalance
  }

  if ("highestDayUnlocked" in body) {
    const highestDayUnlocked = body.highestDayUnlocked

    if (
        typeof highestDayUnlocked !== "number" ||
        !Number.isInteger(highestDayUnlocked) ||
        highestDayUnlocked < 1
    ) {
      throw new BadRequestError(
          "highestDayUnlocked must be an integer greater than or equal to 1",
      )
    }
    updates.highestDayUnlocked = highestDayUnlocked
  }

  if ("tutorialCompleted" in body) {
    const tutorialCompleted = body.tutorialCompleted

    if (typeof tutorialCompleted !== "boolean") {
      throw new BadRequestError("tutorialCompleted must be a boolean")
    }
    updates.tutorialCompleted = tutorialCompleted
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError("At least one profile field is required")
  }
  return updates
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

export const generateNPCs: RequestHandler = async (req, res) => {
  try {
    const body = (req.body ?? {}) as NpcGenerateBody
    const seed = assertInteger(body.seed, "seed")
    const freq = normalizeNpcFrequency(body.freq)
    const count = normalizeNpcCount(body.count)
    const recipeSet = normalizeRecipeSet(body.recipeSet)
    const random = makeSeededRandom(seed)
    const batchId = `${Date.now()}-${Math.abs(seed)}`
    const baseNumberId = Date.now() * 1000 + Math.abs(seed % 1000)
    const now = Date.now()
    const npcs = []

    for (let index = 0; index < count; index += 1) {
      const numberId = baseNumberId + index
      const enterTime = new Date(now + index * freq * 1000)
      const expirationTime = new Date(
          enterTime.getTime() + ORDER_EXPIRATION_SECONDS * 1000,
      )
      const recipe = await RecipeModel.create(
          buildRecipe(`recipe-${batchId}-${index}`, recipeSet, random),
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

      npcs.push(serializeNpc(populatedNpc))
    }

    return res.status(201).json({
      npcs,
      meta: {
        seed,
        freq,
        count,
      },
    })
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    console.error(err)
    return res.status(500).json({
      error: "Could not generate NPCs",
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
    const updates = parseProfileUpdates(req.body)
    const profile = await ProfileModel.findOneAndUpdate(
        { userId },
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        },
    )

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    return res.status(200).json({
      profile: serializeProfile(profile),
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
