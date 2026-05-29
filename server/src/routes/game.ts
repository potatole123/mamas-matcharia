import { Router } from "express"
import authenticate from "../authenticate"
import {
  createMultiplayerGame,
  createSinglePlayerGame,
  deleteMultiplayerGame,
  deleteSinglePlayerGame,
  generateNPCs,
  joinMultiplayerGame,
  updateProfile,
} from "../controllers/gameController"

const router = Router()

router.post("/singleplayer/startGame", authenticate, createSinglePlayerGame)
router.delete("/singleplayer/deleteGame", authenticate, deleteSinglePlayerGame)
router.post("/multiplayer/startGame", authenticate, createMultiplayerGame)
router.post("/multiplayer/joinGame", authenticate, joinMultiplayerGame)
router.delete("/multiplayer/deleteGame", authenticate, deleteMultiplayerGame)
router.post("/general/npcGenerate", authenticate, generateNPCs)
router.put("/general/updateProfile", authenticate, updateProfile)

export default router
