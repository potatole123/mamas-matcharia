import { Router } from "express"
import authenticate from "../authenticate"
import {
  existingSession,
  loginUser,
  registerUser,
  signOutUser,
} from "../controllers/authenticationController"

const router = Router()

router.post("/register", registerUser)
router.post("/login", authenticate, loginUser)
router.post("/signout", authenticate, signOutUser)
router.get("/session", authenticate, existingSession)

export default router
