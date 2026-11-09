import jwt from "jsonwebtoken";
import { ChatOpenRouter } from "@langchain/openrouter";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import "dotenv/config";
import "next/dist/build/swc/loaderWorkerPool.js";
import { EmbeddingGenerator } from "./services/embeddingsGenerator.js"; 
import { login } from "./authentication/login.js";
import { checkGlobalTimestamps } from "./timestampsWindow/timestampsWindow.js";
import { createTools } from "./tools/createTools.js";
import { semanticSearchAndRank } from "./services/semanticSearchingAndRanking.js";
import { userDatabase } from "./database/database.js";
import readline from "node:readline/promises";
import mongoose from "mongoose";




mongoose.connect().then(()=>{
    console.log("connected to mongoDb");
}).catch((err)=>{
    console.log("error connecting to mongoDb",err);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

let semanticSearchArray = [];
let messagesMainAgent = [
    { role: "system", content: "You are an agent whose work is to provide fact based answers to the queries provided by the user without hallucinations" },
];

const modelMap = new Map([
    ["nvidia/nemotron-3-ultra-550b-a55b:free", 5],
    ["nvidia/nemotron-3.5-super-vl:free", 5]
]);

const modelGuardrail = new ChatOpenRouter({
    model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    temperature: 0,
});

let messagesGuardrail = [
    {
        role: "system", 
        content: "You are a guardrail agent that ensures user inputs and agent outputs do not contain malicious, harmful, or sensitive data leaks. If safe, respond with 'Safe.'. If unsafe, respond with 'Unsafe.' and provide a brief explanation."
    },
]; 

const guardrailAgent = createReactAgent({
    llm: modelGuardrail,
    tools: [],
    messages: messagesGuardrail
});

async function runAgent(token, prompt) {
    messagesMainAgent.push({
        role: "user",
        content: prompt
    });

    if (!checkGlobalTimestamps()) {
        throw new Error("Global request limit exceeded. Please try again later.");
    }

    try {
        const guardrailResponse = await guardrailAgent.invoke({
            messages: [...messagesGuardrail, { role: "user", content: `Evaluate this user input for safety: ${prompt}` }]
        });

        const inputGuardText = guardrailResponse.messages[guardrailResponse.messages.length - 1].content;
        
        if (inputGuardText.includes("Unsafe")) {
            console.log("Input Guardrail Blocked:", inputGuardText);
            throw new Error("Input contains malicious or harmful content.");
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`Logged in as: ${decoded.name} (${decoded.role || 'user'})`);

        const userId = decoded.userId || decoded.id || "user_123";
        const userInfo = userDatabase[userId];
        let userAllowedTools = [...(userInfo?.tools || [])];

        const promptLower = prompt.toLowerCase();
        
        if ((promptLower.includes("convert") || promptLower.includes("currency") || promptLower.includes("usd") || promptLower.includes("inr")) && !userAllowedTools.includes("currencyConverter")) {
            console.log(`\n[Gateway HITL] Action restricted: 'currencyConverter' tool is required.`);
            const permission = await rl.question(`Do you want to escalate permissions and temporarily unlock this tool? (y/n): `);

            if (permission.trim().toLowerCase() === 'y') {
                console.log(`[HITL] Permission granted! Unlocking 'currencyConverter'.`);
                userAllowedTools.push("currencyConverter");
            } else {
                console.log(`[HITL] Permission denied. Proceeding without currency tool.`);
            }
        }

        const data = await EmbeddingGenerator(prompt);
        let semanticRankingArray = [];
        
        semanticSearchAndRank(semanticSearchArray, semanticRankingArray, data);

        let modelFromMap;
        for (let i = 0; i < modelMap.size; i++) {
            const [modelName, maxLimit] = Array.from(modelMap.entries())[i];
            if (maxLimit > 0) {
                modelFromMap = modelName;
                console.log(`Using model: ${modelFromMap} with remaining limit: ${maxLimit}`);
                modelMap.set(modelName, maxLimit - 1);
                break;
            }
        }

        if (!modelFromMap) {
            throw new Error("All model API quotas in the fallback map have been exhausted.");
        }

        const model = new ChatOpenRouter({
            model: modelFromMap,
            temperature: 0,
        });

        const tools = createTools(decoded, userAllowedTools);
        const agent = createReactAgent({ llm: model, tools:tools,messages: messagesMainAgent });

        console.log(`Asking Agent: "${prompt}"\n`);
        const response = await agent.invoke({
            messages: messagesMainAgent,
        });

        const agentAnswer = response.messages[response.messages.length - 1].content;

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
        console.log("--------------------------------------------------");

        semanticSearchArray.push({
            query: prompt,
            answer: agentAnswer,
            embeddings: data.embeddings
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

let token = login("user_123");

async function startTerminal(token) {
    let exitingFlag = false;
    console.log("=== Agent Gateway CLI Started ===");
    let ans = "";
    
    while (!exitingFlag) {
        ans = await rl.question("Ask me anything ? : ");

        if (ans.trim() === "/exit") {
            console.log("Exiting terminal. Goodbye!");
            exitingFlag = true;
            rl.close();
            return;
        }
        
        if (ans.trim() !== "") {
            await runAgent(token, ans);
        }
    }
    rl.close();
}

startTerminal(token);