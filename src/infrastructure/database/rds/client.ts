import { Pool } from "pg";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const secretName = process.env.DB_SECRET_NAME;

if (!secretName) {
  throw new Error("DB_SECRET_NAME is missing");
}

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "ap-northeast-1",
});

console.log("1. before Secrets Manager")

const response = await secretsClient.send(
  new GetSecretValueCommand({
    SecretId: secretName,
  }),
);

console.log("2. after Secrets Manager");

if (!response.SecretString) {
  throw new Error("RDS secret is empty");
}

const secret = JSON.parse(response.SecretString) as {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

export const rdsPool = new Pool({
  host: secret.host,
  port: secret.port,
  database: secret.database,
  user: secret.username,
  password: secret.password,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
});

console.log("3. RDS pool created");