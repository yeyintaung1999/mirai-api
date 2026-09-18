import { NotFoundError } from "../../errors/NotFoundError.js";
import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import type { FindByEmailInput } from "../../user/dto/findByEmail/FindByEmailInput.js";
import type { FindByEmailOutput } from "../../user/dto/findByEmail/FindByEmailOutput.js";

export class FindByEmail {
    constructor(
        private readonly userRepository: UserRepository
    ){}

    async execute(input: FindByEmailInput):Promise<FindByEmailOutput>{
        const result = await this.userRepository.findByEmail(input.email)

        if(!result){
            throw new NotFoundError("User not found");
        }
        return {
            id: result.id,
            email: result.email,
            createdAt: result.createdAt
        }
    }
}