import { ApplicationError } from "./ApplicationError.js";

export class ConflictError extends ApplicationError {
    readonly statusCode = 409;
}

