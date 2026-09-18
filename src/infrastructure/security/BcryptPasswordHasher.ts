import bycrypt from "bcrypt";
import type { PasswordHasher } from "../../application/user/ports/PasswordHasher.js";

export class BcryptPasswordHasher implements PasswordHasher {
    private readonly saltRounds = 12;

    async hash(password: string): Promise<string> {
        return bycrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hashedPassword: string): Promise<boolean> {
        return bycrypt.compare(password, hashedPassword);
    }
    
}