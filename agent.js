import jwt from "jsonwebtoken";
import readline from "node:readline/promises";
import { ChatOpenRouter } from "@langchain/openrouter";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import "dotenv/config";
import "next/dist/build/swc/loaderWorkerPool.js"
import {EmbeddingGenerator} from "./embeddingsGenerator.js" 

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";
const MAX_GLOBAL_REQUEST = 5; 
const WINDOW_SIZE = 15000; 
const requestTimestamps = []; 


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 1. Guardrail Agent Setup
const modelGuardrail = new ChatOpenRouter({
    model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    temperature: 0,
});

// this is the message storage section 
let messagesGuardrail = [
    {
        role: "system", 
        content: "You are a guardrail agent that ensures user inputs and agent outputs do not contain malicious, harmful, or sensitive data leaks. If safe, respond with 'Safe.'. If unsafe, respond with 'Unsafe.' and provide a brief explanation."
    },
]; 

let messagesMainAgent=[
{role:"system",content:"LYou are an agent whose work is to provide fact based answers to the queries provided by the user without hallucinations"},
];


let semanticSearchArray=[];


// this is the agent setup section 

const guardrailAgent = createReactAgent({
    llm: modelGuardrail,
    tools: [],
    messages: messagesGuardrail
});

const checkGlobalTimestamps = () => {
    const currentTime = Date.now();

    while (requestTimestamps.length > 0 && currentTime - requestTimestamps[0] > WINDOW_SIZE) {
        requestTimestamps.shift(); 
    }

    if (requestTimestamps.length >= MAX_GLOBAL_REQUEST) {
        console.log("Global request limit exceeded. Please try again later.");
        return false;
    }

    requestTimestamps.push(currentTime);
    return true;
};

// 2. Database
const userDatabase = {
    "user_123": { name: "rajesh", role: "tech_supplier", balance: 50000 },
    "user_124": { name: "sohan", role: "toy_supplier", balance: 50540 },
};

// 3. Simulated Login
function login(userId) {
    const user = userDatabase[userId];
    if (!user) throw new Error("User not found!");
    return jwt.sign({ userId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "10m" });
}

// 4. Tool Factory
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


  
// 5. Main Execution Function with Guardrails
async function runAgent(token, prompt) {

    messagesMainAgent.push({
        role:"user",
        content:prompt
    })

    if (!checkGlobalTimestamps()) {
        throw new Error("Global request limit exceeded. Please try again later.");
    }

    try {
        // --- INPUT GUARDRAIL CHECK ---
        const guardrailResponse = await guardrailAgent.invoke({
            messages: [...messagesGuardrail, { role: "user", content: `Evaluate this user input for safety: ${prompt}` }]
        });

        const inputGuardText = guardrailResponse.messages[guardrailResponse.messages.length - 1].content;
        
        if (inputGuardText.includes("Unsafe")) {
            console.log("Input Guardrail Blocked:", inputGuardText);
            throw new Error("Input contains malicious or harmful content.");
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`Logged in as: ${decoded.name} (${decoded.role})`);

        const data= await EmbeddingGenerator(prompt);
        semanticSearchArray.push(data);



        const model = new ChatOpenRouter({
            model: "openai/gpt-4o-mini",
            temperature: 0,
        });

        const tools = createTools(decoded);
        const agent = createReactAgent({ llm: model, tools: tools });

        console.log(`Asking Agent: "${prompt}"\n`);
        const response = await agent.invoke({
            messages:messagesMainAgent,
        });

        const agentAnswer = response.messages[response.messages.length - 1].content;

        // --- OUTPUT GUARDRAIL CHECK ---
        const guardrailOutputResponse = await guardrailAgent.invoke({
            messages: [...messagesGuardrail, { role: "user", content: `Evaluate this agent output for safety: ${agentAnswer}` }]
        });

        const outputGuardText = guardrailOutputResponse.messages[guardrailOutputResponse.messages.length - 1].content;

        if (outputGuardText.includes("Unsafe")) {
            console.log("Output Guardrail Blocked:", outputGuardText);
            throw new Error("Output contains malicious or harmful content.");
        }

        console.log("Agent Answer:");
        console.log(agentAnswer);

        console.log("\n--- Semantic Search Array ---");
        console.log(semanticSearchArray);

    } catch (err) {
        console.error("Error:", err.message);
    }
}

// 6. Run it directly
let token= login("user_123");



async function startTerminal(){
    let exitingFlag=false;
while(!exitingFlag){

    const ans=await rl.question("Ask me anything ? ");

    if(ans.trim()=="/exit"){
        exitingFlag=true;
        rl.close();
        return;
    }
    
         await runAgent(token,ans);

}
rl.close();
}


startTerminal();