import { ApplicationError } from "./ApplicationError.js";

export class NotFoundError extends ApplicationError {
    readonly code = "NOT_FOUND";
}
