import jwt from "jsonwebtoken";
import User from "../database/userSchema.js";
import dotenv from "dotenv";

dotenv.config();

export async function login(email) {
    const user = await User.findOne({ email });



    if (!user) throw new Error("User not found!");
    return jwt.sign({ userId: user._id ,role: user.role }, process.env.JWT_SECRET, { expiresIn: "10m" });
}