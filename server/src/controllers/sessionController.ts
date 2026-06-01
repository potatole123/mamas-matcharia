import type { RequestHandler } from "express"
import type { HydratedDocument, Types } from "mongoose"
import { MultiplayerGameStateModel } from "../models/multiplayerGameState"
import { ProfileModel } from "../models/profile"
import {
  SessionModel,
  type ActiveGameModel,
  type Session,
} from "../models/session"
import { SinglePlayerGameStateModel } from "../models/singlePlayerGameState"

type SessionDocument = Awaited<ReturnType<typeof findGameplaySession>>

function getUserId(req: Parameters<RequestHandler>[0]) {
  return req.user?.uid ?? null
}

async function findProfile(userId: string) {
  return ProfileModel.findOne({ userId })
}

async function findGameplaySession(
  profileId: Types.ObjectId
): Promise<HydratedDocument<Session> | null> {
  return await SessionModel.findOne({ profile: profileId })
    .populate("profile")
    .populate("activeGame")
}

function toSessionPayload(session: NonNullable<SessionDocument>) {
  const payload = session.toObject({
    depopulate: false,
    flattenObjectIds: true,
    versionKey: false,
    virtuals: true,
  })

  return {
    id: session._id.toString(),
    profile: payload.profile,
    activeGame: payload.activeGame ?? null,
    activeGameModel: payload.activeGameModel ?? null,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  }
}

async function deleteActiveGame(
  activeGame: Session["activeGame"],
  activeGameModel: ActiveGameModel | null | undefined
) {
  if (!activeGame || !activeGameModel) {
    return
  }

  if (activeGameModel === "SinglePlayerGameState") {
    await SinglePlayerGameStateModel.deleteOne({ _id: activeGame })
    return
  }

  await MultiplayerGameStateModel.deleteOne({ _id: activeGame })
}

export const getSession: RequestHandler = async (req, res) => {
  const userId = getUserId(req)

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const profile = await findProfile(userId)

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await findGameplaySession(profile._id as Types.ObjectId)

    return res.status(200).json({
      session: session ? toSessionPayload(session) : null,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not get gameplay session",
    })
  }
}

export const deleteSession: RequestHandler = async (req, res) => {
  const userId = getUserId(req)

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const profile = await findProfile(userId)

    if (!profile) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    const session = await SessionModel.findOne({
      profile: profile._id as Types.ObjectId,
    })

    if (session) {
      await deleteActiveGame(session.activeGame, session.activeGameModel)
      await session.deleteOne()
    }

    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not delete gameplay session",
    })
  }
}
