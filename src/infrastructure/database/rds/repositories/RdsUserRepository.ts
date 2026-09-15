import type {UserRepository} from "../../../../domain/user/repositories/UserRepository.js";
import type {User} from "../../../../domain/user/entities/User.js";
import {rdsPool} from "../client.js";
import {type RdsUserRow, toDomainUser} from "../mappers/UserMapper.js";

export class RdsUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const result = await rdsPool.query<RdsUserRow>(
            `
            SELECT id, email, password_hash, created_at
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [id],
        );
        const row = result.rows[0];
        if(!row){
            return null;
        }
        return toDomainUser(row as RdsUserRow);
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await rdsPool.query<RdsUserRow>(
            `
            SELECT id, email, password_hash, created_at
            FROM users
            WHERE email = $1
            LIMIT 1`
            ,[email]
        );
        const row = result.rows[0];
        if(!row){
            return null;
        }
        return toDomainUser(row as RdsUserRow);
    }

    async create(user: User): Promise<void> {
        await rdsPool.query(
            `
            INSERT INTO users (id, email, password_hash, created_at)
            VALUES ($1, $2, $3, $4)
            `,
            [user.id, user.email, user.passwordHash, user.createdAt]
        );
    }
}