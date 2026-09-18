import { randomUUID } from "crypto";
import type {User} from "../../../domain/user/entities/User.js";
import type {UserRepository} from "../../../domain/user/repositories/UserRepository.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import type {RegisterInput} from "../../user/dto/register/RegisterInput.js";
import type {RegisterOutput} from "../../user/dto/register/RegisterOutput.js";
import {ConflictError} from "../../errors/ConflictError.js"


export class RegisterUser{
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher
    ) {}

    async execute(input: RegisterInput): Promise<RegisterOutput>{
        const existingUser = await this.userRepository.findByEmail(input.email);

        if(existingUser){
            throw new ConflictError("User already exists");
        }

        const passwordHash = await this.passwordHasher.hash(input.password);

        const newUser: User = {
            id: randomUUID(),
            email: input.email,
            passwordHash,
            createdAt: new Date()
        };

        await this.userRepository.create(newUser);

        return {
            id: newUser.id,
            email: newUser.email,
            createdAt: newUser.createdAt
        }
    }
}