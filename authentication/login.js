import jwt from "jsonwebtoken";
import { userDatabase } from "../database/database.js";
import dotenv from "dotenv";

dotenv.config();

export function login(userId) {
    const user = userDatabase[userId];
    if (!user) throw new Error("User not found!");
    return jwt.sign({ userId, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "10m" });
}