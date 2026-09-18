import { parseRequest } from "../validators/parseRequest.js";
import type { Request, Response } from "express";
import { login, refreshToken } from "../../../composition/authContainer.js";
import { LoginSchema } from "../validators/loginSchema.js";
import { RefreshTokenSchema } from "../validators/refreshTokenSchema.js";
import { registerSchema } from "../validators/registerSchema.js";
import { registerUser } from "../../../composition/userContainer.js";

export class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        const input = parseRequest(registerSchema, req.body);
        const result = await registerUser.execute(input);
        res.status(201).json(result);
    }

    async login(req: Request, res: Response): Promise<void> {
        const input = parseRequest(LoginSchema, req.body);
        const result = await login.execute(input);
        res.status(200).json(result);
    }

    async refreshToken(req: Request, res: Response): Promise<void> {
        const input = parseRequest(RefreshTokenSchema, req.body);
        const result = refreshToken.execute(input);
        res.status(200).json(result);
    }

}
