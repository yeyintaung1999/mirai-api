import type {UserRepository} from "../domain/user/repositories/UserRepository.js";
import { env } from "../infrastructure/config/env.js";

export const createUserRepository = async (): Promise<UserRepository> => {
    const dbType = env.dbType;

    if(dbType === "dynamodb") {
        const { DynamoUserRepository } = await import("../infrastructure/database/dynamodb/repositories/DynamoUserRepository.js");
        return new DynamoUserRepository();
    } else if(dbType === "rds") {
        const { RdsUserRepository } = await import("../infrastructure/database/rds/repositories/RdsUserRepository.js");
        return new RdsUserRepository();
    } else {
        throw new Error(`Unsupported DB_TYPE: ${dbType}`);
    }
}
