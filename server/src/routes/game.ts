import { Router } from "express"
import authenticate from "../authenticate"
import {
  createMultiplayerGame,
  createSinglePlayerGame,
  deleteMultiplayerGame,
  deleteSinglePlayerGame,
  joinMultiplayerGame,
  startGameDay,
  submitGameResults,
} from "../controllers/gameController"

const router = Router()

router.post("/singleplayer", authenticate, createSinglePlayerGame)
router.delete("/singleplayer/current", authenticate, deleteSinglePlayerGame)
router.post("/multiplayer", authenticate, createMultiplayerGame)
router.post("/multiplayer/join", authenticate, joinMultiplayerGame)
router.delete("/multiplayer/current", authenticate, deleteMultiplayerGame)
router.post("/day/start", authenticate, startGameDay)
router.post("/results", authenticate, submitGameResults)

export default router
