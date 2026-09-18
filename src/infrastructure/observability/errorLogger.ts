export interface ErrorLog {
    event: "http_error";
    requestId: string;
    status: number;
    code: string;
    durationMs?: number;
    headersSent: boolean;
    method?: string | undefined;
    route?: string;
}

export type ErrorLogger = (entry: ErrorLog, error: unknown) => void;

export const logHttpError: ErrorLogger = (entry, error) => {
    const frames = error instanceof Error
        ? error.stack?.split("\n").filter(line => /^\s+at /.test(line)).slice(0, 10)
        : undefined;
    const record = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: entry.status >= 500 ? "error" : "warn",
        ...entry,
        diagnostics: safeDiagnostics(error),
        ...(entry.status >= 500 && frames ? { frames } : {}),
    });
    if (entry.status >= 500) console.error(record);
    else console.warn(record);
};

// Values are allowlisted, not copied from arbitrary error text or request data.
function safeDiagnostics(error: unknown): { kind: string; code?: string }[] {
    const codes = new Set([
        "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN",
        "08000", "08001", "08003", "08006", "53300", "57P01", "57P02", "57P03", "23505",
    ]);
    const names = new Set([
        "Error", "TypeError", "SyntaxError", "RangeError", "ZodError", "RequestValidationError",
        "UnauthorizedError", "InvalidAccessTokenError", "NotFoundError", "ConflictError", "TimeoutError",
        "ProvisionedThroughputExceededException", "RequestLimitExceeded", "ThrottlingException",
        "InternalServerError", "ServiceUnavailable",
    ]);
    const result: { kind: string; code?: string }[] = [];
    const seen = new Set<unknown>();
    let current = error;
    while (typeof current === "object" && current !== null && !seen.has(current) && result.length < 3) {
        seen.add(current);
        const kind = "name" in current && typeof current.name === "string" && names.has(current.name)
            ? current.name : "UnknownError";
        const code = "code" in current && typeof current.code === "string" && codes.has(current.code)
            ? current.code : undefined;
        result.push({ kind, ...(code ? { code } : {}) });
        current = "cause" in current ? current.cause : undefined;
    }
    return result;
}
