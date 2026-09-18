import type { TokenService } from "../ports/TokenService.js";
import type { RefreshTokenInput } from "../dto/refreshToken/RefreshTokenInput.js";
import type { RefreshTokenOutput } from "../dto/refreshToken/RefreshTokenOutput.js";

export class RefreshToken{
    constructor(
        private readonly tokenService: TokenService
    ){}

    execute(input: RefreshTokenInput): RefreshTokenOutput {
        const { userId } = this.tokenService.verifyRefreshToken(input.refreshToken);

        return {
            accessToken: this.tokenService.generateAccessToken(userId)
        }
    }
}