export interface TokenService {
    generateAccessToken(userId: string): string;
    generateRefreshToken(userId: string): string;
    verifyRefreshToken(token: string): { userId: string };
}