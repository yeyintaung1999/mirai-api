import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler } from "express";
import { RequestValidationError } from "../validators/parseRequest.js";
import { ApplicationError, type ApplicationErrorCode } from "../../../application/errors/ApplicationError.js";
import { logHttpError, type ErrorLogger } from "../../../infrastructure/observability/errorLogger.js";
import { requestContext } from "./requestContext.js";

interface PublicError {
    status: number;
    code: string;
    message: string;
    details?: { path: string; code: string }[];
}

// HTTP policy lives here; application errors only describe business failures.
const applicationErrors: Record<ApplicationErrorCode, PublicError> = {
    INVALID_ACCESS_TOKEN: { status: 401, code: "INVALID_ACCESS_TOKEN", message: "Invalid access token" },
    UNAUTHORIZED: { status: 401, code: "UNAUTHORIZED", message: "Invalid credentials or token" },
    NOT_FOUND: { status: 404, code: "NOT_FOUND", message: "Resource not found" },
    CONFLICT: { status: 409, code: "CONFLICT", message: "Resource conflicts with existing data" },
};
const transientCodes = new Set([
    "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN",
    "08000", "08001", "08003", "08006", "53300", "57P01", "57P02", "57P03",
]);
const transientNames = new Set([
    "ProvisionedThroughputExceededException", "RequestLimitExceeded", "ThrottlingException",
    "InternalServerError", "ServiceUnavailable", "TimeoutError",
]);

const parserErrors: Record<string, PublicError> = {
    "entity.parse.failed": { status: 400, code: "INVALID_JSON", message: "Invalid JSON body" },
    "entity.too.large": { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
    "encoding.unsupported": { status: 415, code: "UNSUPPORTED_ENCODING", message: "Unsupported body encoding" },
    "charset.unsupported": { status: 415, code: "UNSUPPORTED_CHARSET", message: "Unsupported body charset" },
    "request.aborted": { status: 400, code: "REQUEST_ABORTED", message: "Request was aborted" },
    "request.size.invalid": { status: 400, code: "INVALID_BODY_SIZE", message: "Invalid request body size" },
};

function normalizeError(error: unknown): PublicError {
    if (error instanceof RequestValidationError) {
        return {
            status: 400, code: "VALIDATION_ERROR", message: "Validation failed",
            details: error.details,
        };
    }
    if (error instanceof ApplicationError && Object.hasOwn(applicationErrors, error.code)) {
        // Recognized application errors carry intentional public messages.
        return { ...applicationErrors[error.code]!, message: error.message };
    }
    if (typeof error === "object" && error !== null) {
        if ("code" in error && error.code === "23505" &&
            "constraint" in error && error.constraint === "users_email_key") {
            return applicationErrors.CONFLICT!;
        }
        if (("code" in error && typeof error.code === "string" && transientCodes.has(error.code)) ||
            ("name" in error && typeof error.name === "string" && transientNames.has(error.name))) {
            return { status: 503, code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable" };
        }
    }
    if (error instanceof Error && "type" in error && typeof error.type === "string" &&
        Object.hasOwn(parserErrors, error.type)) {
        return parserErrors[error.type]!;
    }
    // Never trust status/message fields on arbitrary library errors.
    return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
}

export function createErrorMiddleware(logger: ErrorLogger = logHttpError): ErrorRequestHandler {
    return (error: unknown, req, res, next): void => {
        const context = requestContext.getStore();
        const requestId = context?.requestId ?? randomUUID();
        const normalized = normalizeError(error);
        try {
            logger({
                event: "http_error", requestId, status: normalized.status,
                code: normalized.code, headersSent: res.headersSent,
                method: req.method,
                // Router path is a static template; never log originalUrl or query values.
                route: typeof req.route?.path === "string" ? req.route.path : "unmatched",
                ...(context ? { durationMs: Math.round(performance.now() - context.startedAt) } : {}),
            }, error);
        } catch {
            // Observability failures must not prevent the response.
        }
        if (res.headersSent) {
            next(error);
            return;
        }
        if (res.destroyed || res.writableEnded) return;
        res.setHeader("X-Request-Id", requestId);
        res.setHeader("Cache-Control", "no-store");
        const { status, ...body } = normalized;
        res.status(status).json({ error: { ...body, requestId } });
    };
}

export const errorMiddleware = createErrorMiddleware();
