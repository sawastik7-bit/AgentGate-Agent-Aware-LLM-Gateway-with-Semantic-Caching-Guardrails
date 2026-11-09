import jwt from "jsonwebtoken";
import { ChatOpenRouter } from "@langchain/openrouter";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import "dotenv/config";
import { EmbeddingGenerator } from "./services/embeddingsGenerator.js"; 
import { login } from "./authentication/login.js";
import { checkGlobalTimestamps } from "./timestampsWindow/timestampsWindow.js";
import { createTools } from "./tools/createTools.js";
import { semanticSearchAndRank } from "./services/semanticSearchingAndRanking.js";

import readline from "node:readline/promises";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { registerUser } from "./authentication/register.js";
import { AgentSession } from "./database/agentSessionSchema.js";
import { ROLE_PERMISSIONS } from "./config/roles.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

// Connect to MongoDB 
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ai-agent-gateway").then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.log("Error connecting to MongoDB", err);
});

// Authentication setup
let userRegistered = await registerUser({ name: "user_123", email: "user_123@example.com", password: "password123", role: "admin" });
let token =  await login(userRegistered.email); // Note: login returns a signed JWT string

// Interface creation 
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let semanticSearchArray = [];

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

async function runAgent(token, prompt, sessionId) {
    if (!checkGlobalTimestamps()) {
        throw new Error("Global request limit exceeded. Please try again later.");
    }

    try {
        // 1. Input Guardrail Check
        const guardrailResponse = await guardrailAgent.invoke({
            messages: [...messagesGuardrail, { role: "user", content: `Evaluate this user input for safety: ${prompt}` }]
        });

        const inputGuardText = guardrailResponse.messages[guardrailResponse.messages.length - 1].content;
        
        if (inputGuardText.includes("Unsafe")) {
            console.log("Input Guardrail Blocked:", inputGuardText);
            throw new Error("Input contains malicious or harmful content.");
        }

        // 2. Decode Token & Check Permissions
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`Logged in as: ${decoded.name} (${decoded.role || 'user'})`);

        const userInfo = ROLE_PERMISSIONS[decoded.role] || {};
        let userAllowedTools = [...(userInfo.tools || [])];

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

        // 3. Embeddings & Semantic Search
        const data = await EmbeddingGenerator(prompt);
        let semanticRankingArray = [];
        semanticSearchAndRank(semanticSearchArray, semanticRankingArray, data);

        // 4. Model Fallback Map Selection
        let modelFromMap;
        for (let [modelName, maxLimit] of modelMap.entries()) {
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

        // 5. Fetch Session History for Context
        const session = await AgentSession.findById(sessionId);
        const chatHistory = session ? session.messages.map(m => ({ role: m.role, content: m.content })) : [];

        // Push current user prompt into history array for the agent run
        chatHistory.push({ role: "user", content: prompt });

        // 6. Run Main Agent
        const tools = createTools(decoded, userAllowedTools);
        const agent = createReactAgent({ llm: model, tools: tools });

        console.log(`Asking Agent: "${prompt}"\n`);
        
        // Invoke agent with full conversation history and request intermediate steps
        const result = await agent.invoke({
            messages: chatHistory,
        }, { returnIntermediateSteps: true });

        const agentAnswer = result.messages[result.messages.length - 1].content;

        // 7. Output Guardrail Check
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

        // 8. Save Turn to MongoDB Session
        session.messages.push({ role: "user", content: prompt, timestamp: new Date() });
        
        // If there were tool execution steps, log them cleanly
        if (result.intermediateSteps && result.intermediateSteps.length > 0) {
            for (const [action, observation] of result.intermediateSteps) {
                session.messages.push({
                    role: "assistant",
                    content: `Called tool '${action.tool}' with args: ${JSON.stringify(action.toolInput)}`,
                    timestamp: new Date()
                });
                session.messages.push({
                    role: "tool",
                    content: typeof observation === "string" ? observation : JSON.stringify(observation),
                    timestamp: new Date()
                });
            }
        }

        session.messages.push({ role: "assistant", content: agentAnswer, timestamp: new Date() });
        await session.save();
        console.log("Session updated and saved to MongoDB.");

        semanticSearchArray.push({
            query: prompt,
            answer: agentAnswer,
            embeddings: data.embeddings
        });

    } catch (err) {
        console.error("Error:", err.message);
    }
}

async function startTerminal(token) {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Create a new session ONCE when the terminal boots up
    const initialSession = await AgentSession.create({
        userId: decodedToken.userId || decodedToken.id || "user_123",
        title: "Terminal CLI Session",
        messages: []
    });
    
    const sessionId = initialSession._id;
    console.log(`[Session Started: ${sessionId}]`);

    let exitingFlag = false;
    while (!exitingFlag) {
        let query = await rl.question("Ask me anything ? : ");

        if (query.trim() === "/exit") {
            console.log("Exiting terminal. Goodbye!");
            exitingFlag = true;
            rl.close();
            return;
        }

        if (query.trim() !== "") {
            await runAgent(token, query, sessionId);
        }
    }
    rl.close();
}

startTerminal(token);