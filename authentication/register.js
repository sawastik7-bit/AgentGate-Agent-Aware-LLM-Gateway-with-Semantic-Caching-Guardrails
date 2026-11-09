import User from "../database/userSchema.js";
import bcrypt from "bcrypt";


export async function registerUser(data){

const {name,email,password,role}=data;

console.log(`registering user named ${name}`);

const hashedPass= await bcrypt.hash(password,10);
const user=await User.create({
    email:email,
    password:hashedPass,
    role:role,
    createdAt:Date.now() 

})

if(!user){
    throw new Error("User registration failed");
}

console.log(`User ${name} registered successfully with email ${email}`);

return user;
}


export default registerUser;
