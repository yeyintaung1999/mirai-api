# MiRai API

A TypeScript and Express API for registering users and finding them by ID or email. It runs locally as an Express server or on AWS Lambda through `serverless-http`, with PostgreSQL (RDS) and DynamoDB repository implementations.

Registration hashes passwords with bcrypt. API responses contain user IDs, email addresses, and creation timestamps; they do not include passwords or password hashes. Login and user sessions are not implemented.

## Technology

- TypeScript with ES modules and strict type checking
- Express and Zod for HTTP handling and input validation
- PostgreSQL through `pg`, or DynamoDB through the AWS SDK
- AWS Secrets Manager for RDS connection credentials
- Serverless Framework for Lambda, API Gateway, and supporting infrastructure

## Project structure

```text
src/
  application/       Use cases, DTOs, application errors, and ports
  domain/            User entity and repository interface
  composition/       Use case wiring and database repository selection
  infrastructure/    Configuration, database adapters, and password hashing
  interfaces/http/   Routes, controllers, validators, and error middleware
  app.ts             Shared Express application
  server.ts          Local HTTP server; loads .env
  lambda.ts          AWS Lambda handler
migrations/          PostgreSQL schema SQL
serverless.yml       AWS deployment configuration
```

## Local setup

Use Node.js 22 to match the configured Lambda runtime, npm, and AWS credentials with access to the selected database services. Local RDS usage also requires network access to the database, such as through your existing VPN or tunnel.

Install dependencies:

```sh
npm ci
```

Create a local `.env` file with the configuration for your chosen backend. Environment files are ignored by Git. The following values are examples, not credentials.

### RDS / PostgreSQL

```dotenv
PORT=3000
DB_TYPE=rds
AWS_REGION=ap-northeast-1
AWS_PROFILE=mirai_api
DB_SECRET_NAME=mirai/dev/rds
```

The named Secrets Manager secret must already exist and contain a JSON object with these fields:

```json
{
  "host": "your-database-host",
  "port": 5432,
  "database": "mirai",
  "username": "your-database-user",
  "password": "your-database-password"
}
```

The active RDS client reads this secret during application initialization. Although `env.ts` defines `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, the RDS client does not use those variables.

Apply [the initial schema](migrations/001_create_users.sql) to the target PostgreSQL database before using the API. With `psql` connection settings already configured for that database:

```sh
psql -v ON_ERROR_STOP=1 -f migrations/001_create_users.sql
```

This SQL creates the `users` table, including a unique email constraint. It is a one-time schema script, not an automatic migration runner, and will fail if the table already exists.

### DynamoDB

```dotenv
PORT=3000
DB_TYPE=dynamodb
AWS_REGION=ap-northeast-1
AWS_PROFILE=mirai_api
USERS_TABLE_NAME=mirai-api-dev-users
```

The table must have a string partition key named `id` and a global secondary index named `email-index` with a string partition key named `email`. The current client connects to AWS; it does not configure a DynamoDB Local endpoint.

If `DB_TYPE` is omitted, the application defaults to `dynamodb`. The deployed Lambda is explicitly configured to use `rds`.

### Start the server

```sh
npm run dev
```

The default address is `http://localhost:3000`. To run compiled JavaScript:

```sh
npm run build
npm start
```

## API

All endpoints accept JSON with `Content-Type: application/json`.

| Method | Path | Request body | Success |
| --- | --- | --- | --- |
| POST | `/auth/register` | `email`, `password` | `201` with the created user |
| POST | `/auth/findbyid` | `id` | `200` with the matching user |
| POST | `/auth/findbyemail` | `email` | `200` with the matching user |

Registration requires a valid email and an 8–32 character password containing an uppercase letter, a lowercase letter, a number, and a special character.

```sh
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"ExamplePass1!"}'

curl -X POST http://localhost:3000/auth/findbyemail \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com"}'

curl -X POST http://localhost:3000/auth/findbyid \
  -H 'Content-Type: application/json' \
  -d '{"id":"replace-with-the-returned-user-id"}'
```

Example user response:

```json
{
  "id": "9d68edcb-d986-4a6c-9e27-2aeb03fa08cc",
  "email": "user@example.com",
  "createdAt": "2026-09-15T00:00:00.000Z"
}
```

| Status | Meaning |
| --- | --- |
| `400` | Zod request validation failed; response includes `error` and `details` |
| `404` | Lookup found no user; response is `{"message":"No user is found"}` |
| `409` | Registration's email pre-check found an existing user |
| `500` | An unhandled application or database error occurred |

Deployed POST routes require an `x-api-key` header. Local Express routes do not enforce that API Gateway requirement. The API key is not a user login or a per-user authorization mechanism.

## AWS deployment

The current configuration uses service name `mirai-api`, region `ap-northeast-1`, default stage `dev`, AWS profile `mirai_api`, and the Node.js 22 Lambda runtime.

```text
Client → CloudFront → API Gateway → Lambda / Express → existing RDS
                                         ↓
                             Secrets Manager VPC endpoint
```

The stack defines a DynamoDB users table, a Secrets Manager interface VPC endpoint, and a CloudFront distribution in addition to the API and Lambda. DynamoDB is provisioned even while RDS is selected. The RDS instance and secret are external prerequisites.

Before deploying:

1. Configure the AWS profile `mirai_api` and any required Serverless Framework authentication.
2. Review the existing subnet and security group IDs in `serverless.yml`; they are specific to the current AWS environment.
3. Make `API_KEY` and `VPC_ID` available to Serverless variable resolution through your environment or local `.env` file. The VPC must match the configured subnet and security group.
4. Ensure the secret `mirai/<stage>/rds` exists with the JSON structure documented above, and apply the database schema.
5. Ensure networking permits Lambda to reach PostgreSQL and the Secrets Manager endpoint. The endpoint uses the existing security group, which must permit the required HTTPS traffic from Lambda.

Build the handler before deploying:

```sh
npm run build
npx serverless deploy --stage dev
```

The handler points to `dist/lambda.handler`, so deployments need an up-to-date compiled build. The secret name, DynamoDB table name, and CloudFront origin path incorporate the selected stage; the subnet and security group IDs do not.

The stack exports `CloudFrontDomainName` and `SecretsManagerVpcEndpointId`. For CloudFront requests, use `https://<CloudFrontDomainName>/auth/register` without a stage prefix. Direct API Gateway URLs include the stage: `https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/dev/auth/register`.

For example, after setting your deployed base URL and API key in your shell:

```sh
curl -X POST "${MIRAI_API_BASE_URL}/auth/findbyemail" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: ${API_KEY}" \
  -d '{"email":"user@example.com"}'
```

## Development checks

```sh
npx tsc --noEmit
```

There are currently no test or lint scripts in `package.json`.

## Current limitations

- User authentication, authorization, email verification, and password reset are not implemented.
- API Gateway declares CORS, but the Express application does not add CORS headers to application responses for cross-origin browser clients.
- Concurrent registrations can bypass the email pre-check. PostgreSQL enforces uniqueness, but its constraint error is not mapped to `409`; DynamoDB does not enforce email uniqueness.
- The RDS client currently disables TLS certificate verification with `rejectUnauthorized: false`.
- Database migrations are manual, and Lambda and the Secrets Manager endpoint each use one configured subnet.
