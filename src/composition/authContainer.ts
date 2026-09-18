import { LoginUser } from "../application/auth/usecases/LoginUser.js";
import { RefreshToken } from "../application/auth/usecases/RefreshToken.js";
import { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../infrastructure/security/JwtTokenService.js";
import { createUserRepository } from "./userRepository.js";
const accessSecret = process.env.JWT_ACCESS_SECRET || "";
const refreshSecret = process.env.JWT_REFRESH_SECRET || "";
const userRepository = await createUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const jwtService = new JwtTokenService(accessSecret,refreshSecret);

export const login = new LoginUser(userRepository,passwordHasher,jwtService)
export const refreshToken = new RefreshToken(jwtService);