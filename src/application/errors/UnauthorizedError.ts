import { ApplicationError } from "./ApplicationError.js";

export class UnauthorizedError extends ApplicationError {
    readonly code = "UNAUTHORIZED";
}
