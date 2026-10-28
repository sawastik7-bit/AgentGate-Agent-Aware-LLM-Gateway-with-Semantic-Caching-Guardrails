import jwt from "jsonwebtoken";
import { ChatOpenRouter } from "@langchain/openrouter";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";
const MAX_GLOBAL_REQUEST=5; // this is the max request limit for the whole agent 
const WINDOW_SIZE=15000; // this is the window size in milliseconds 
const requestTimestamps = [];  // this is to sstore the total timestamp of the user 


const checkGlobalTimestamps=()=>{

    const currentTime=Date.now();

     if(requestTimestamps.length>=MAX_GLOBAL_REQUEST){
        console.log("Global request limit exceeded. Please try again later.");
        return false;

     }

     while(requestTimestamps.length > 0 && currentTime - requestTimestamps[0] > WINDOW_SIZE){
        requestTimestamps.shift(); // remove the oldest timestamp
     }

     requestTimestamps.push(currentTime); // add the current timestamp

     return true;
}

// 1. Database
const userDatabase = {
    "user_123": { name: "rajesh", role: "tech_supplier", balance: 50000 },
    "user_124": { name: "sohan", role: "toy_supplier", balance: 50540 },
};

// 2. Simulated Login (Token Generator)
function login(userId) {
    const user = userDatabase[userId];
    if (!user) throw new Error("User not found!");
    
    return jwt.sign({ userId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "10m" });
}

// 3. Tool Factory (Closure magic to bind user context securely)
const createTools = (userContext) => {
    const userId = userContext.userId;

    return [
        tool(
            async () => {
                const user = userDatabase[userId];
                return `User ${user.name} has a balance of $${user.balance}`;
            },
            {
                name: "balance",
                description: "Returns the user's balance",
                schema: z.object({})
            }
        ),
        tool(
            async () => {
                const user = userDatabase[userId];
                return `User ${user.name} has the role of ${user.role}`;
            },
            {
                name: "role",
                description: "Returns the user's role",
                schema: z.object({})
            }
        )
    ];
};

// 4. Main Execution Function
async function runAgent(token, prompt) {


    if(!checkGlobalTimestamps()){
        throw new Error("Global request limit exceeded. Please try again later.");
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`Logged in as: ${decoded.name} (${decoded.role})`);

        const model = new ChatOpenRouter({
            model: "openai/gpt-4o-mini",
            temperature: 0,
        });

        const tools = createTools(decoded);
        const agent = createReactAgent({ llm: model, tools });

        console.log(`Asking Agent: "${prompt}"\n`);
        const response = await agent.invoke({
            messages: [{ role: "user", content: prompt }],
        });

        console.log("Agent Answer:");
        console.log(response.messages[response.messages.length - 1].content);

        

    } catch (err) {
        console.error("Error:", err.message);
    }
}

// 5. Run it directly
async function main() {
    const myToken = login("user_123");
    await runAgent(myToken, "what is my balance and role?");
}

main();