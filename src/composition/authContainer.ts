import { FindByEmail } from "../application/auth/usecases/FindByEmail.js";
import { FindById } from "../application/auth/usecases/FindById.js";
import { RegisterUser } from "../application/auth/usecases/RegisterUser.js";
import { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher.js";
import { createUserRepository } from "./userRepository.js";

const userRepository = await createUserRepository();
const passwordHasher = new BcryptPasswordHasher();

export const registerUser = new RegisterUser(userRepository, passwordHasher);
export const findById = new FindById(userRepository);
export const findByEmail = new FindByEmail(userRepository);
