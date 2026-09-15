import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({
  region: "ap-northeast-1",
});

export interface RdsSecret {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

let cachedSecret: RdsSecret | null = null;

export async function getRdsSecret(): Promise<RdsSecret> {
  if (cachedSecret) {
    return cachedSecret;
  }

  const secretName = process.env.DB_SECRET_NAME;

  if (!secretName) {
    throw new Error("DB_SECRET_NAME is missing");
  }

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    }),
  );

  if (!response.SecretString) {
    throw new Error("SecretString is empty");
  }

  cachedSecret = JSON.parse(response.SecretString) as RdsSecret;

  return cachedSecret;
}