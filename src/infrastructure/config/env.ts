export const env = {
  dbType: process.env.DB_TYPE ?? "dynamodb",

  aws: {
    region: process.env.AWS_REGION ?? "ap-northeast-1",
  },

  rds: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
};