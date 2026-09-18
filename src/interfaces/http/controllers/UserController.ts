import { parseRequest } from "../validators/parseRequest.js";
import type { Request, Response } from "express";
import { getCurrentUser, findById, findByEmail } from "../../../composition/userContainer.js";
import { UnauthorizedError } from "../../../application/errors/UnauthorizedError.js";
import { findByIdSchema } from "../validators/findByIdSchema.js";
import { findByEmailSchema } from "../validators/findByEmailSchema.js";

export class UserController {
    async getCurrentUser(req: Request, res: Response): Promise<void> {
        if (!req.userId) {
            throw new UnauthorizedError("Authentication required");
        }
        const result = await getCurrentUser.execute(req.userId);
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(result);
    }


    async findById(req: Request, res: Response): Promise<void> {
        const input = parseRequest(findByIdSchema, req.body);
        const result = await findById.execute(input);
        res.status(200).json(result);
    }

    async findByEmail(req: Request, res: Response): Promise<void> {
        const input = parseRequest(findByEmailSchema, req.body);
        const result = await findByEmail.execute(input);
        res.status(200).json(result);
    }

}
