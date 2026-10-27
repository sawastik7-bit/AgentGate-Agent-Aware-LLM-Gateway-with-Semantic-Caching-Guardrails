import {tool} from "@langchain/core/tools";

import {ChatOpenRouter}   from "@langchain/openrouter";
import {createAgent} from "langchain";
import {z} from "zod";
import "dotenv/config";
import jwt from "jsonwebtoken";



// this is the database containing all of the information about the users and their roles with balances.
const userDatabase={
    "user_123":{name:"rajesh", role:"tech_supplier", balance:50000},
    "user_124":{name:"sohan", role:"toy_supplier", balance:50540},
    "user_125":{name:"manjulika", role:"drink_supplier", balance:50340},
}


const verifyJwt=(token)=>{
const secret=process.envJWT_SECRET;

try{

        const decoded= jwt.verify(token,secret);
        if(!decoded){
        throw new Error("Invalid token");
    
        }
        
        if(decoded){
            req.user=decoded;
        }

}catch(err){
    throw new Error(err.message);
}

}









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
