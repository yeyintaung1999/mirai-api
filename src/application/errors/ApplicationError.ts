export type ApplicationErrorCode = "UNAUTHORIZED" | "INVALID_ACCESS_TOKEN" | "NOT_FOUND" | "CONFLICT";

export abstract class ApplicationError extends Error{
    abstract readonly code: ApplicationErrorCode;

    constructor(message: string, options?: ErrorOptions){
        super(message, options);
        this.name = new.target.name;
    }
}