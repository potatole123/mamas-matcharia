import type { RequestHandler } from "express"

export const registerUser: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}

export const loginUser: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}

export const signOutUser: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}

export const existingSession: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}
