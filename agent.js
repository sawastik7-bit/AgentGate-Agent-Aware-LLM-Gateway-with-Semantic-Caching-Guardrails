import {tool} from "@langchain/core/tools";

import {ChatOpenRouter}   from "@langchain/openrouter";
import {createAgent} from "langchain";
import {z} from "zod";
import "dotenv/config";




const multiplyTool=tool(async({a,b})=>{
    return (a*b).toString();
},{
    name:"multiply",
    description:"Multiplies two numbers together. Use this when you need to calculate product",
    schema:z.object({
        a:z.number().describe("The first number"),
        b:z.number().describe("The second number")
    })
});




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
 messages:[{role:"user",content:"what is the product of 5 and 4"}],

    })

    console.log(response.messages[response.messages.length-1].content);
}


try{
    main();
}catch(err){

    console.log(err);
}
