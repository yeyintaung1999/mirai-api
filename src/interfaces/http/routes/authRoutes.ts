import {Router} from "express";
import { AuthController } from "../controllers/AuthController.js";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register.bind(authController));
router.post("/findbyid", authController.findById.bind(authController));
router.post("/findbyemail", authController.findByEmail.bind(authController));

export const authRoutes = router;