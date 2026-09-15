import type { User } from "../../../../domain/user/entities/User.js";

export interface RdsUserRow {
    id: string;
    email: string;
    password_hash: string;
    created_at: Date;
}

export const toDomainUser = (row: RdsUserRow): User => {
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
    };
};