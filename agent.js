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
            return true;
        }

}catch(err){
    throw new Error(err.message);
}

}



app.post("/login",(req,res)=>{   // this is the route for attaching the token to the request header and sending it for the future request  ,
                                // instead of register we would use the databasse to provide the direct user info for token generation

const userId=req.body.userId; // take out the id from teh body 
      

})







async function main(){


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