import { Router } from "express"
import authenticate from "../authenticate"
import { deleteSession, getSession } from "../controllers/sessionController"

const router = Router()

router.get("/", authenticate, getSession)
router.delete("/", authenticate, deleteSession)

export default router
