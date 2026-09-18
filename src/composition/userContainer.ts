import { GetCurrentUser } from "../application/user/usecases/GetCurrentUser.js";
import { FindByEmail } from "../application/user/usecases/FindByEmail.js";
import { FindById } from "../application/user/usecases/FindById.js";
import { RegisterUser } from "../application/user/usecases/RegisterUser.js";
import { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher.js";
import { createUserRepository } from "./userRepository.js";

const userRepository = await createUserRepository();
const passwordHasher = new BcryptPasswordHasher();

export const registerUser = new RegisterUser(userRepository, passwordHasher);
export const findById = new FindById(userRepository);
export const findByEmail = new FindByEmail(userRepository);
export const getCurrentUser = new GetCurrentUser(userRepository);
