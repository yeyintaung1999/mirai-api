import {Router} from "express";
import { UserController } from "../controllers/UserController.js";

const router = Router();
const userController = new UserController();

router.get("/me", userController.getCurrentUser.bind(userController));

router.post("/findbyid", userController.findById.bind(userController));
router.post("/findbyemail", userController.findByEmail.bind(userController));

export const userRoutes = router;