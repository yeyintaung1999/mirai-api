import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { ApplicationError } from "../../../application/errors/ApplicationError.js";

export const errorMiddleware = (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if(error instanceof ZodError){
        res.status(400).json({
            error: "Validation failed",
            details: error.flatten(),
        });
        return;
    }

    if(error instanceof ApplicationError){
        res.status(error.statusCode).json({
            error: error.message,
        });
        return;
    }

    console.log(error);

    res.status(500).json({
        error: "Internal server error",
    });
     
};