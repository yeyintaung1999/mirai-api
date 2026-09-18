import type { ZodType } from "zod";

export class RequestValidationError extends Error {
    constructor(readonly details: { path: string; code: string }[]) {
        super("Validation failed");
        this.name = "RequestValidationError";
    }
}

export function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (!result.success) {
        throw new RequestValidationError(result.error.issues.slice(0, 20).map(issue => ({
            path: issue.path.map(String).join(".").slice(0, 200),
            code: issue.code,
        })));
    }
    return result.data;
}
