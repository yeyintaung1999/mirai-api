import type { GetCurrentUserOutput } from "../dto/getCurrentUser/GetCurrentUserOutput.js";
import type { UserRepository } from "../../../domain/user/repositories/UserRepository.js";
import { NotFoundError } from "../../errors/NotFoundError.js";


export class GetCurrentUser {
    constructor(
        private readonly userRepository: UserRepository
    ){}

    async execute(userId: string): Promise<GetCurrentUserOutput>{
        const user = await this.userRepository.findById(userId);

        if(!user){
            throw new NotFoundError('User Not Found');
        }

        return { id: user.id, email: user.email, createdAt: user.createdAt };
    }
}