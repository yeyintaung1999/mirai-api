import type { Request,Response,NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from "../../../application/errors/UnauthorizedError.js";

export function authMiddleware(
    req: Request, res: Response, next: NextFunction
): void{
    const authHeader = req.headers.authorization;

    if(!authHeader){
        next(new UnauthorizedError('Authorization Header is Required'));
        return;
    }

    if(!authHeader.startsWith('Bearer ')){
        next(new UnauthorizedError('Authorization Token is Missing'));
        return;
    }

    const token = authHeader.slice(7);

    if(!token){
        next(new UnauthorizedError('Authorization Token is Required'));
        return;
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if(!secret){
        next(new Error('JWT_SECRET is not configured'));
        return;
    }

    let payload: string | jwt.JwtPayload;

    try {
            payload = jwt.verify(token, secret, {
            algorithms: ["HS256"],
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError("Invalid access token or access secret"));
            return;
        }

        next(error);
        return;
    }

    if (
        typeof payload === "string" ||
        typeof payload.userId !== "string" ||
        payload.userId.length === 0
    ) {
        next(new UnauthorizedError("Invalid access token"));
        return;
    }

    req.userId = payload.userId;

    next();
}