import { Router } from "express"
import authenticate from "../authenticate"
import {
  createMultiplayerGame,
  createSinglePlayerGame,
  deleteMultiplayerGame,
  deleteSinglePlayerGame,
  getCurrentMultiplayerResults,
  joinMultiplayerGame,
  leaveMultiplayerGame,
  startGameDay,
  startMultiplayerGame,
  submitGameResults,
} from "../controllers/gameController"

const router = Router()

router.post("/singleplayer", authenticate, createSinglePlayerGame)
router.delete("/singleplayer/current", authenticate, deleteSinglePlayerGame)
router.post("/multiplayer", authenticate, createMultiplayerGame)
router.post("/multiplayer/join", authenticate, joinMultiplayerGame)
router.post("/multiplayer/current/start", authenticate, startMultiplayerGame)
router.get("/multiplayer/current/results", authenticate, getCurrentMultiplayerResults)
router.delete("/multiplayer/current/player", authenticate, leaveMultiplayerGame)
router.delete("/multiplayer/current", authenticate, deleteMultiplayerGame)
router.post("/day/start", authenticate, startGameDay)
router.post("/results", authenticate, submitGameResults)

export default router
