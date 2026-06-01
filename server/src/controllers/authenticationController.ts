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

class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
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

function getDisplayName(firebaseUser: admin.auth.DecodedIdToken) {
  const name = typeof firebaseUser.name === "string" ? firebaseUser.name.trim() : ""
  const email = typeof firebaseUser.email === "string" ? firebaseUser.email.trim() : ""
  const emailName = email.split("@")[0]?.trim() ?? ""

  return name || emailName || `Player ${firebaseUser.uid.slice(0, 6)}`
}

function getUsername(firebaseUser: admin.auth.DecodedIdToken) {
  const email = typeof firebaseUser.email === "string" ? firebaseUser.email.trim() : ""
  const baseValue = email.split("@")[0] ?? getDisplayName(firebaseUser)
  const normalizedBase = baseValue
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  const base = normalizedBase || "player"

  return `${base}-${firebaseUser.uid}`
}

async function getOrCreateAuthPayload(firebaseUser: admin.auth.DecodedIdToken) {
  const userId = firebaseUser.uid
  const email = typeof firebaseUser.email === "string" ? firebaseUser.email.trim().toLowerCase() : ""

  if (!email) {
    throw new BadRequestError("Authenticated user is missing an email")
  }

  const existingPayload = await getAuthPayload(userId)

  if (existingPayload?.profile) {
    return existingPayload
  }

  const userWithEmail = await UserModel.findOne({ email })

  if (userWithEmail && userWithEmail.userId !== userId) {
    throw new ConflictError("Email is already linked to another account")
  }

  const displayName = getDisplayName(firebaseUser)

  const [user, profile] = await Promise.all([
    UserModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          email,
          username: getUsername(firebaseUser),
        },
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
      },
    ),
    ProfileModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          displayName,
          coinBalance: 0,
          highestDayUnlocked: 1,
          tutorialCompleted: false,
        },
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true,
      },
    ),
  ])

  return {
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
  const firebaseUser = req.user
  const userId = firebaseUser?.uid

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  try {
    const payload = await getOrCreateAuthPayload(firebaseUser)

    return res.status(200).json(payload)
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).json({
        error: err.message,
      })
    }

    if (err instanceof ConflictError) {
      return res.status(409).json({
        error: err.message,
      })
    }

    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return res.status(409).json({
        error: "Email or username already exists",
      })
    }

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
