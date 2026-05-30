import { Router } from "express"
import authenticate from "../authenticate"
import {
  createMultiplayerGame,
  createSinglePlayerGame,
  deleteMultiplayerGame,
  deleteSinglePlayerGame,
  generateNPCs,
  joinMultiplayerGame,
  submitGameResults,
} from "../controllers/gameController"

const router = Router()

router.post("/singleplayer", authenticate, createSinglePlayerGame)
router.delete("/singleplayer/current", authenticate, deleteSinglePlayerGame)
router.post("/multiplayer", authenticate, createMultiplayerGame)
router.post("/multiplayer/join", authenticate, joinMultiplayerGame)
router.delete("/multiplayer/current", authenticate, deleteMultiplayerGame)
router.post("/npcs", authenticate, generateNPCs)
router.post("/results", authenticate, submitGameResults)

export default router
