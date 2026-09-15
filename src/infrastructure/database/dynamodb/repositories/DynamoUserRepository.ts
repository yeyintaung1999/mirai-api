import { GetCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { UserRepository } from "../../../../domain/user/repositories/UserRepository.js";
import type { User } from "../../../../domain/user/entities/User.js";
import { dynamoDb } from "../client.js";
import { type DynamoUserItem, toDomainUser } from "../mappers/UserMapper.js";

const tableName = process.env.USERS_TABLE_NAME;

if (!tableName) {
  throw new Error("USERS_TABLE_NAME is not configured");
}

export class DynamoUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const result = await dynamoDb.send(
            new GetCommand({
                TableName: tableName,
                Key: { id },
            })
        );
        if(!result.Item){
            return null;
        }
        return toDomainUser(result.Item as DynamoUserItem);
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await dynamoDb.send(
            new QueryCommand({
                TableName: tableName,
                IndexName: "email-index",
                KeyConditionExpression: "email = :email",
                ExpressionAttributeValues: {
                    ":email": email,
                },
                Limit: 1,
            }),
        )
        const item = result.Items?.[0];
        if(!item){
            return null;
        }
        return toDomainUser(item as DynamoUserItem);
    }

    async create(user: User): Promise<void> {
        await dynamoDb.send(
            new PutCommand({
                TableName: tableName,
                Item: {
                    id: user.id,
                    email: user.email,
                    passwordHash: user.passwordHash,
                    createdAt: user.createdAt.toISOString(),
                },
                ConditionExpression: "attribute_not_exists(id)",
            })
        );
    }
}