import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import type { FindByIdInput } from "../dto/FindByIdInput.js";
import type { FindByIdOutput } from "../dto/FindByIdOutput.js";

export class FindById{
    constructor(
        private readonly userRepository: UserRepository,
    ){}

    async execute(input: FindByIdInput):Promise<FindByIdOutput | null> {
        const user = await this.userRepository.findById(input.id);

        if(!user){
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        }
    }
}