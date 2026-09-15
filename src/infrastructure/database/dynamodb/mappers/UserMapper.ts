import type { User } from "../../../../domain/user/entities/User.js";

export interface DynamoUserItem {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: string;
}

export const toDomainUser = (item: DynamoUserItem): User => {
    return {
        id: item.id,
        email: item.email,
        passwordHash: item.passwordHash,
        createdAt: new Date(item.createdAt),
    };
};