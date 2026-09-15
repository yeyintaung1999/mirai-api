import type { Request, Response, NextFunction } from "express";

import { registerUser, findById, findByEmail } from "../../../composition/authContainer.js";
import { registerSchema } from "../validators/registerSchema.js";
import { findByIdSchema } from "../validators/findByIdSchema.js";
import { findByEmailSchema } from "../validators/findByEmailSchema.js";

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = registerSchema.parse(req.body);
            
            const result = await registerUser.execute(input);
            
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = findByIdSchema.parse(req.body);

            const result = await findById.execute(input);

            if(!result){
                res.status(404).json({message: "No user is found"});
                return;
            }
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async findByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try{
            const input = findByEmailSchema.parse(req.body);
            const result = await findByEmail.execute(input);

            if(!result){
                res.status(404).json({message: "No user is found"});
                return;
            }
            res.status(200).json(result);

        } catch (error) {
            next(error);
        }
    }
}
