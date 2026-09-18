# MiRai API

A TypeScript and Express 5 API for registration, JWT authentication, and user profiles. It runs locally or on AWS Lambda through `serverless-http`, with PostgreSQL (RDS) and DynamoDB repository implementations.

Passwords are hashed with bcrypt. User responses expose only `id`, `email`, and `createdAt`; password hashes are excluded.

## Project structure

```text
src/
  application/       Use cases, DTOs, business errors, and ports
  domain/            User entity and repository interface
  composition/       Dependency wiring and database selection
  infrastructure/    Database adapters, JWT, password hashing, configuration, logging
  interfaces/http/   Routes, controllers, validators, and middleware
  types/             Express request type extensions
  app.ts             Shared Express application
  server.ts          Local server; loads .env
  lambda.ts          AWS Lambda handler
tests/               Unit and mocked Lambda/Express integration tests
  load/              k6 scripts
migrations/          PostgreSQL schema
serverless.yml       AWS deployment configuration
```

## Local setup

Use Node.js 22 to match Lambda, npm, and AWS credentials with access to your selected backend.

```sh
npm ci
```

Create `.env` locally. Environment files are ignored by Git. The following values are placeholders, not credentials:

```dotenv
PORT=3000
AWS_REGION=ap-northeast-1
AWS_PROFILE=mirai_api
JWT_ACCESS_SECRET=replace-with-a-strong-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-strong-random-secret
```

Both JWT secrets are required and must differ. Generate independent secrets; do not use the example strings.

### PostgreSQL / RDS

Add to `.env`:

```dotenv
DB_TYPE=rds
DB_SECRET_NAME=mirai/dev/rds
```

The Secrets Manager secret must exist and contain:

```json
{
  "host": "your-database-host",
  "port": 5432,
  "database": "mirai",
  "username": "your-database-user",
  "password": "your-database-password"
}
```

The RDS client retrieves this secret during initialization. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `env.ts` are not used by the active RDS client. Local execution needs network access to RDS, such as a VPN or tunnel.

With PostgreSQL connection settings configured, apply the initial schema once:

```sh
psql -v ON_ERROR_STOP=1 -f migrations/001_create_users.sql
```

This creates the users table with a unique email constraint. It is not an automatic migration runner and fails if the table already exists.

### DynamoDB

Instead of the RDS settings, add:

```dotenv
DB_TYPE=dynamodb
USERS_TABLE_NAME=mirai-api-dev-users
```

The table requires a string partition key `id` and a global secondary index `email-index` with string partition key `email`. The client connects to AWS, not a configured DynamoDB Local endpoint.

The application defaults to DynamoDB when `DB_TYPE` is omitted. The deployed Lambda explicitly uses RDS.

### Run

```sh
npm run dev
```

Or build and start compiled JavaScript:

```sh
npm run build
npm start
```

The default local address is `http://localhost:3000`.

## Authentication and endpoints

POST bodies use JSON and `Content-Type: application/json`. Every `/user` route requires `Authorization: Bearer <accessToken>`.

| Method | Path | Request body | Access token | Success |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | `email`, `password` | No | 201, user profile |
| POST | `/auth/login` | `email`, `password` | No | 200, `accessToken` and `refreshToken` |
| POST | `/auth/refreshtoken` | `refreshToken` | No | 200, new `accessToken` |
| GET | `/user/me` | None | Required | 200, authenticated user's profile |
| POST | `/user/findbyid` | `id` (UUID) | Required | 200, matching user's profile |
| POST | `/user/findbyemail` | `email` | Required | 200, matching user's profile |

Registration requires a valid email and an 8–32 character password containing uppercase, lowercase, numeric, and special characters.

Access tokens last 15 minutes; refresh tokens last seven days. Refreshing issues an access token only: the existing refresh token is retained. Refresh-token rotation, stored sessions, revocation, and logout are not implemented.

`/user/me` derives identity from the verified token and ignores caller-supplied IDs. Its response uses `Cache-Control: no-store`. The two arbitrary lookup endpoints currently require authentication but do not enforce ownership or admin permissions.

All configured deployed endpoints, including registration, login, and `/user/me`, additionally require `x-api-key` because their API Gateway events use `private: true`. Local Express does not enforce that API key requirement.

### Local example flow

Register and log in:

```sh
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"ExamplePass1!"}'

curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"ExamplePass1!"}'
```

Login returns:

```json
{
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>"
}
```

Use the returned access token:

```sh
curl http://localhost:3000/user/me \
  -H 'Authorization: Bearer <access-token>'
```

Example profile response:

```json
{
  "id": "9d68edcb-d986-4a6c-9e27-2aeb03fa08cc",
  "email": "user@example.com",
  "createdAt": "2026-09-15T00:00:00.000Z"
}
```

Refresh an access token:

```sh
curl -X POST http://localhost:3000/auth/refreshtoken \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh-token>"}'
```

## Error handling

Express uses one central HTTP error middleware. Recognized application errors expose the message passed by application code; status codes and response formatting remain centralized. Unexpected errors return a generic message.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization Header is Required",
    "requestId": "server-generated-uuid"
  }
}
```

| Status | Meaning |
| --- | --- |
| 400 | Invalid request fields, malformed JSON, or invalid body size |
| 401 | Missing/invalid access credentials, login failure, or invalid refresh token |
| 404 | User or route not found |
| 409 | Business conflict or PostgreSQL email uniqueness violation |
| 413 | Request body too large |
| 415 | Unsupported body encoding or charset |
| 500 | Unexpected application or dependency failure |
| 503 | Recognized temporary dependency availability failure |

Validation errors additionally include `error.details`, an array of `{ "path": "email", "code": "invalid_format" }` entries. Clients should branch on error codes, not message text.

- Controllers use `parseRequest(schema, input)` to mark request validation errors as 400. Internal Zod failures remain 500.
- Express 5 forwards rejected controller promises automatically.
- Business error codes have a complete, typed HTTP mapping.
- Request IDs are generated before JSON parsing and preserved with `AsyncLocalStorage`. `X-Request-Id` matches the error body and log.
- Error responses use `Cache-Control: no-store`.
- Structured logs include method, route template, duration, and allowlisted diagnostic codes and cause types. They exclude request bodies, headers, query values, and arbitrary error messages.
- Already-sent responses are delegated to Express; closed responses are not written again.

Startup failures occur before HTTP middleware can run. Idle PostgreSQL pool errors emit a separate structured log event. API Gateway rejections and other failures outside Express may use a different response format.

## AWS deployment

The configuration targets Node.js 22, `ap-northeast-1`, stage `dev`, and AWS profile `mirai_api`.

```text
Client → CloudFront → API Gateway → Lambda / Express → RDS
                                         ↓
                             Secrets Manager VPC endpoint
```

The stack also creates a DynamoDB users table even when RDS is selected. RDS and its Secrets Manager secret must already exist.

Before deployment:

1. Configure AWS credentials and Serverless Framework access.
2. Provide `API_KEY`, `VPC_ID`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` through the deployment environment or local `.env`.
3. Review the hardcoded subnet and security group IDs in `serverless.yml`; they must belong to the configured VPC.
4. Create the `mirai/<stage>/rds` secret and apply the database schema.
5. Verify Lambda can reach RDS and the Secrets Manager endpoint. Security groups must allow the necessary database and HTTPS connections.

```sh
npm run build
npx serverless deploy --stage dev
```

The handler is `dist/lambda.handler`. Rebuild before deployment. `serverless.yml` explicitly passes the JWT secrets into Lambda.

The stack outputs `CloudFrontDomainName` and `SecretsManagerVpcEndpointId`. CloudFront URLs omit the stage prefix; direct API Gateway URLs include it:

```text
https://<cloudfront-domain>/user/me
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/dev/user/me
```

With the deployed base URL, API key, and access token set in your shell:

```sh
curl "${MIRAI_API_BASE_URL}/user/me" \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## Development checks

```sh
npx tsc --noEmit
npm test
```

Tests cover authentication, error handling, current-user behavior, and mocked Lambda/Express requests. Database calls are mocked; these tests do not establish live AWS or database reliability. No lint script is configured.

Review scripts under `tests/load` before running k6: confirm the target URL, operation, credentials, and thresholds. Scripts that register users write persistent data; use a dedicated test environment.

## Remaining limitations

- Arbitrary user lookups lack ownership/admin authorization.
- Refresh tokens cannot be revoked, rotated, or invalidated through logout.
- Email verification and password reset are not implemented.
- DynamoDB registration does not atomically enforce email uniqueness. PostgreSQL does enforce it and maps its email constraint violation to 409.
- RDS currently uses `rejectUnauthorized: false`; certificate verification needs to be enabled with the trusted CA before production use.
- API Gateway declares CORS, but Express does not add CORS headers to application responses for cross-origin browser clients.
- Migrations are manual; Lambda and the Secrets Manager endpoint each use one configured subnet.
- Real connection failures, client disconnects, load behavior, log retention, and alerting still require staging verification.
