import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/refreshtoken", authController.refreshToken.bind(authController));

export const authRouter = router;