import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { userDatabase } from "../database/database.js";

export function createTools(decodedUser, userAllowedTools) {
    const userId = decodedUser.userId || decodedUser.id || "user_123"; 
    const userInfo = userDatabase[userId];

    if (!userInfo) {
        console.log(`[RBAC] User not found in database. Giving 0 tools.`);
        return [];
    }

    // Agar agent.js se dynamic allowed tools ki list aayi hai toh woh use karein, warna database wali list
    const allowedToolNames = userAllowedTools || userInfo.tools || [];
    console.log(`[RBAC] Active tools for user:`, allowedToolNames);

    const geoLocationTool = tool(
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
            name: "geoLocation",
            description: "Get latitude and longitude for a city name.",
            schema: z.object({ location: z.string().describe("City name") })
        }
    );

    const weatherTool = tool(
        async ({ location }) => {
            try {
                console.log(`[Tool Executing] Fetching weather for: ${location}`);
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
                    headers: { "User-Agent": "AgentGateway-Gateway/1.0" }
                });
                const geoData = await geoRes.json();
                if (!geoData || geoData.length === 0) return JSON.stringify({ error: "Location not found." });
                
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData[0].lat}&longitude=${geoData[0].lon}&current_weather=true`);
                const weatherData = await weatherRes.json();
                return JSON.stringify({ temperature: `${weatherData.current_weather.temperature} °C`, windspeed: `${weatherData.current_weather.windspeed} km/h` });
            } catch (error) {
                return JSON.stringify({ error: error.message });
            }
        },
        {
            name: "weather",
            description: "Get current weather for a location.",
            schema: z.object({ location: z.string().describe("City name") })
        }
    );

    const currencyConverterTool = tool(
        async ({ amount, from, to }) => {
            try {
                console.log(`[Tool Executing] Converting currency...`);
                const res = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
                const data = await res.json();
                const rate = data.rates[to.toUpperCase()];
                return JSON.stringify({ converted: (amount * rate).toFixed(2), targetCurrency: to.toUpperCase() });
            } catch (error) {
                return JSON.stringify({ error: error.message });
            }
        },
        {
            name: "currencyConverter",
            description: "Convert currency amounts.",
            schema: z.object({
                amount: z.number().describe("Numeric amount"),
                from: z.string().describe("Source currency code like USD"),
                to: z.string().describe("Target currency code like INR")
            })
        }
    );

    const masterToolRegistry = {
        geoLocation: geoLocationTool,
        weather: weatherTool,
        currencyConverter: currencyConverterTool
    };

    const activeTools = [];
    for (const toolName of allowedToolNames) {
        if (masterToolRegistry[toolName]) {
            activeTools.push(masterToolRegistry[toolName]);
        }
    }

    return activeTools;
}