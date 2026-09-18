import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../../application/errors/UnauthorizedError.js";
import type { TokenService } from "../../application/auth/ports/TokenService.js";


export class JwtTokenService implements TokenService {
    constructor(
        private readonly accessSecret: string,
        private readonly refreshSecret: string
    ){
        if(!accessSecret || !refreshSecret){
            throw new Error("JWT secrets are Required");
        }
        if(accessSecret == refreshSecret){
            throw new Error("JWT secrets can not be the same");
        }
    }

    generateAccessToken(userId: string): string {
        return jwt.sign(
            {userId},
            this.accessSecret,
            {expiresIn: "15m"}
        );
    }

    generateRefreshToken(userId: string): string {
        return jwt.sign(
            {userId},
            this.refreshSecret,
            {expiresIn: "7d"}
        );
    }

    verifyRefreshToken(token: string): { userId: string; } {
        let payload: string | jwt.JwtPayload;
        try {
            payload = jwt.verify(token, this.refreshSecret, { algorithms: ["HS256"] });
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError("Invalid or expired refresh token");
            }
            throw error;
        }
        if(
            typeof payload === "string" ||
            typeof payload.userId !== "string" ||
            payload.userId.length === 0 ||
            typeof payload.exp !== "number"
        ){
            throw new UnauthorizedError("Invalid or expired refresh token");
        }

        return  {userId: payload.userId};
    }
}