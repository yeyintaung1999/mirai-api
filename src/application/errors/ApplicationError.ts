export abstract class ApplicationError extends Error{
    abstract readonly statusCode: number;

    constructor(message: string){
        super(message);
        this.name = new.target.name;
    }
}