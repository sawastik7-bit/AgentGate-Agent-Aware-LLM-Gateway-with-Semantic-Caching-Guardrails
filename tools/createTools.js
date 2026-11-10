import { tool } from "@langchain/core/tools";
import { z } from "zod";
import User from "../database/userSchema.js";

// Make the function async so we can `await` MongoDB
export async function createTools(decodedUser, userAllowedTools=[]) {
    const userId = decodedUser.userId || decodedUser.id || "user_123";
    
    // 1. Fetch user from MongoDB securely
    const userInfo = await User.findById(userId);

    if (!userInfo) {
        console.log(`[RBAC] User not found in database. Giving 0 tools.`);
        return [];
    }

    // 2. Resolve allowed tool names
    const allowedToolNames = userAllowedTools || [];
    console.log(`[RBAC] Active tools for user:`, allowedToolNames);

    // 3. Define all available tools in your system
 const allTools = {
    get_weather: tool(
        async ({ location }) => {
            try {
                console.log(`[Tool Executing] Fetching weather for: ${location}`);
                // Add your weather fetching logic here
                return JSON.stringify({ weather: "Sunny", temperature: "28°C" });
            } catch (error) {
                return JSON.stringify({ error: error.message });
            }
        },
        {
            name: "get_weather",
            description: "Fetch current weather for a given location.",
            schema: z.object({
                location: z.string().describe("The city or place name.")
            })
        }
    ),
    get_geolocation: tool(
        async ({ location }) => {
            try {
                console.log(`[Tool Executing] Fetching coordinates for: ${location}`);
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
                    headers: { "User-Agent": "AgentGate-Gateway/1.0" }
                });
                const data = await response.json();
                if (!data || data.length === 0) return JSON.stringify({ error: "Location not found." });
                return JSON.stringify({ latitude: data[0].lat, longitude: data[0].lon, display_name: data[0].display_name });
            } catch (error) {
                return JSON.stringify({ error: error.message });
            }
        },
        {
            name: "get_geolocation",
            description: "Fetch latitude and longitude for a given location or city name.",
            schema: z.object({
                location: z.string().describe("The city or place name to look up.")
            })
        }
    ),
    convert_currency: tool(
        async ({ amount, from, to }) => {
            try {
                console.log(`[Tool Executing] Converting ${amount} ${from} to ${to}`);
                // Add your currency conversion logic here
                return JSON.stringify({ convertedAmount: amount, currency: to });
            } catch (error) {
                return JSON.stringify({ error: error.message });
            }
        },
        {
            name: "convert_currency",
            description: "Convert an amount from one currency to another.",
            schema: z.object({
                amount: z.number().describe("The amount to convert."),
                from: z.string().describe("Source currency code (e.g. USD)."),
                to: z.string().describe("Target currency code (e.g. INR).")
            })
        }
    )
};

    // 4. Filter and return ONLY the tools this user has permission to use
    const activeToolInstances = [];
    for (const toolName of allowedToolNames) {
        if (allTools[toolName]) {
            activeToolInstances.push(allTools[toolName]);
        }
    }

    return activeToolInstances;
}