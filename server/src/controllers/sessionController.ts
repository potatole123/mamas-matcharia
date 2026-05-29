import type { RequestHandler } from "express"

export const getSession: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}

export const deleteSession: RequestHandler = async (_req, res) => {
  res.sendStatus(501)
}
