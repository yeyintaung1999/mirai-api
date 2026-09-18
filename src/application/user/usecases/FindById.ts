import { NotFoundError } from "../../errors/NotFoundError.js";
import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import type { FindByIdInput } from "../../user/dto/findById/FindByIdInput.js";
import type { FindByIdOutput } from "../../user/dto/findById/FindByIdOutput.js";

export class FindById{
    constructor(
        private readonly userRepository: UserRepository,
    ){}

    async execute(input: FindByIdInput):Promise<FindByIdOutput> {
        const user = await this.userRepository.findById(input.id);

        if(!user){
            throw new NotFoundError("User not found");
        }

        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt
        }
    }
}