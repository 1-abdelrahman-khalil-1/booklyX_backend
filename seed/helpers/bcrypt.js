import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "../config/constants.js";

export async function hashPassword(value) {
  return bcrypt.hash(value, SALT_ROUNDS);
}
