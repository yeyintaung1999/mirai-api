import { UnauthorizedError } from "../../errors/UnauthorizedError.js";
import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import type { PasswordHasher } from "../../user/ports/PasswordHasher.js";
import type { LoginInput } from "../dto/login/LoginInput.js";
import type { TokenService } from "../ports/TokenService.js";
import type { LoginOutput } from "../dto/login/LoginOutput.js";


export class LoginUser{
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly tokenService: TokenService
    ){}

    async execute(input: LoginInput): Promise<LoginOutput>{
        const existingUser = await this.userRepository.findByEmail(input.email);
        if(!existingUser){
            throw new UnauthorizedError("Invalid email or password");
            //user not found
        }

        const isMatch = await this.passwordHasher.compare(input.password, existingUser.passwordHash);
        if(!isMatch){
            throw new UnauthorizedError("Invalid email or password");
            //unauthenticated
        }

        const accessToken = this.tokenService.generateAccessToken(existingUser.id);

        const refreshToken = this.tokenService.generateRefreshToken(existingUser.id);

        return {
            accessToken,
            refreshToken
        }
    }
}
