import {tool} from "@langchain/core/tools";
import express from "express";
import {ChatOpenRouter}   from "@langchain/openrouter";
import {createAgent} from "langchain";
import {z} from "zod";
import "dotenv/config";
import jwt from "jsonwebtoken";



const app=express();  // creating an express http wrapper app
app.use(express.json()); // for handiling request body and json responses

// this is the database containing all of the information about the users and their roles with balances.
const userDatabase={
    "user_123":{name:"rajesh", role:"tech_supplier", balance:50000},
    "user_124":{name:"sohan", role:"toy_supplier", balance:50540},
    "user_125":{name:"manjulika", role:"drink_supplier", balance:50340},
}


const verifyJwt=(token)=>{   // this is the function to check token verification
const secret=process.envJWT_SECRET;

try{

        const decoded= jwt.verify(token,secret);
        if(!decoded){
        throw new Error("Invalid token");
    
        }
        
        if(decoded){
            req.user=decoded;
            return {valid:true,token:decoded};
        }

}catch(err){
    throw new Error(err.message); 
}

}

 let TOKEN;

app.post("/login",(req,res)=>{   // this is the route for attaching the token to the request header and sending it for the future request  ,
                                // instead of register we would use the databasse to provide the direct user info for token generation

const userId=req.body.userId; // take out the id from teh body 

// now find the user in the database and generate the token 


const foundUser= userDatabase[userId];

if(!foundUser){
   return res.status(400).json({error:"User not found"});  
}
    

const token=jwt.sign({userId,role:foundUser.role},process.env.JWT_SECRET,{expiresIn:"1h"});

return res.status(200).header("Authorization", `Bearer ${token}`).json({message:"Login successful",token});

})




const createTools=(verifiedToken)=>{

    const userId=verifiedToken.token.userId;  // fetch teh user id from token 

   // now while creating the tool , verify the user present in the database using tool()


   return [tool(async(userId)=>{
      
    const user=userDatabases[userId];

    if(!user){
        throw new Error("User not found");
    }
    console.log(`User ${user.name} has balance of ${user.balance}`);
   },{name:"balance",description:"It returns the balance of the user",schema:z.object({})}),
   tool(async(userId)=>{
      
    const user=userDatabases[userId];

    if(!user){
        throw new Error("User not found");
    }
    console.log(`User ${user.name} has role of ${user.role}`);
   },{name:"role",description:"It returns the role of the user",schema:z.object({})}),]


} 




async function main(){


    if(!TOKEN){
  console.log("No token found, please login first and get the token");
  return;
    }


   const verifiedToken=verifyJwt(TOKEN);

   if(!verifiedToken.valid){
   throw new Error("Invalid token, please login again");
   }



   const tools= CreateTools(verifiedToken);
    



    // initialize the chat model 

    const model= new ChatOpenRouter({
        model:"nvidia/nemotron-3-ultra-550b-a55b:free",
        temperature:0,
        apiKey:process.env.OPENROUTER_API_KEY,
        tools:[multiplyTool]
    })

    // createing the agent 

    const agent=createAgent({
        model,
        tools:[multiplyTool],
})

    // invoking the llm for the agent 

    const response=await  agent.invoke({
 messages:[{role:"user",content:"what is the product of 1 and 4"}],

    })

    console.log(response.messages[response.messages.length-1].content);
}


try{
    main();
}catch(err){

    console.log(err);
}



app.listen(3000,()=>{
    console.log("Server is running on port 3000");
})