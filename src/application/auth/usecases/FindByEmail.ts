import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import type { FindByEmailInput } from "../dto/FindByEmailInput.js";
import type { FindByEmailOutput } from "../dto/FindByEmailOutput.js";

export class FindByEmail {
    constructor(
        private readonly userRepository: UserRepository
    ){}

    async execute(input: FindByEmailInput):Promise<FindByEmailOutput | null>{
        const result = await this.userRepository.findByEmail(input.email)

        if(!result){
            return null;
        }

        return {
            id: result.id,
            email: result.email,
            createdAt: result.createdAt
        }
    }
}