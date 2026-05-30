import { ProfileModel } from "../models/profile"
import { SessionModel } from "../models/session"
import { SinglePlayerGameStateModel } from "../models/singlePlayerGameState"
import type { RequestHandler } from "express"
import { MultiplayerGameStateModel } from "../models/multiplayerGameState"

const JOIN_CODE_PATTERN = /^\d{6}$/
const MAX_GROUP_CODE_ATTEMPTS = 10
const MAX_RANDOM_SEED = 123_456_789

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

export const generateNPCs: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}

export const submitGameResults: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}
