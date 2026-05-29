import type { RequestHandler } from "express"
import admin from "../firebaseAdmin"
import { ProfileModel } from "../models/profile"
import { UserModel } from "../models/user"

class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

function assertRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`Missing ${fieldName}`)
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) {
    throw new BadRequestError(`Missing ${fieldName}`)
  }
  return trimmed
}

async function getAuthPayload(userId: string) {
  const [user, profile] = await Promise.all([
    UserModel.findOne({ userId }),
    ProfileModel.findOne({ userId }),
  ])

  if (!user) {
    return null
  }

  let profilePayload = null

  if (profile) {
    profilePayload = {
      userId: profile.userId,
      displayName: profile.displayName,
      coinBalance: profile.coinBalance,
      highestDayUnlocked: profile.highestDayUnlocked,
      tutorialCompleted: profile.tutorialCompleted,
    }
  }

  return {
    user: {
      userId: user.userId,
      email: user.email,
      username: user.username,
    },
    profile: profilePayload,
  }
}

export const registerUser: RequestHandler = async (req, res) => {
  let firebaseUser: admin.auth.UserRecord | null = null

  try {
    const body = req.body as Partial<Record<string, unknown>> | undefined
    const emailInput = body?.email
    const usernameInput = body?.username
    const passwordInput = body?.password
    const email = assertRequiredString(emailInput, "email").toLowerCase()
    const username = assertRequiredString(usernameInput, "username")
    const password = assertRequiredString(passwordInput, "password")

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return res.status(409).json({
        error: "Email or username already exists",
      })
    }

    firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    })

    const user = await UserModel.create({
      userId: firebaseUser.uid,
      email,
      username,
    })

    const profile = await ProfileModel.create({
      userId: firebaseUser.uid,
      displayName: username,
      coinBalance: 0,
      highestDayUnlocked: 1,
      tutorialCompleted: false,
    })

    return res.status(201).json({
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
      },
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        coinBalance: profile.coinBalance,
        highestDayUnlocked: profile.highestDayUnlocked,
        tutorialCompleted: profile.tutorialCompleted,
      },
    })
  } catch (err) {
    if (firebaseUser) {
      await Promise.allSettled([
        UserModel.deleteOne({ userId: firebaseUser.uid }),
        ProfileModel.deleteOne({ userId: firebaseUser.uid }),
        admin.auth().deleteUser(firebaseUser.uid),
      ])
    }

    let errorCode: unknown = null

    if (typeof err === "object" && err !== null && "code" in err) {
      errorCode = err.code
    }

    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    if (errorCode === 11000 || errorCode === "auth/email-already-exists") {
      return res.status(409).json({
        error: "Email or username already exists",
      })
    }

    if (
      errorCode === "auth/invalid-email" ||
      errorCode === "auth/invalid-password"
    ) {
      return res.status(400).json({
        error: "Invalid email or password",
      })
    }

    console.error(err)
    return res.status(500).json({
      error: "Could not register user",
    })
  }
}

export const loginUser: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const payload = await getAuthPayload(userId)

    if (!payload) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    return res.status(200).json(payload)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not log in user",
    })
  }
}

export const signOutUser: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    await admin.auth().revokeRefreshTokens(userId)
    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not sign out user",
    })
  }
}

export const existingSession: RequestHandler = async (req, res) => {
  const userId = req.user?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const payload = await getAuthPayload(userId)

    if (!payload) {
      return res.status(404).json({
        error: "User profile was not found",
      })
    }

    return res.status(200).json(payload)
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      error: "Could not get session",
    })
  }
}
