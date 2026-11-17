


export const saveToSemanticCache = async (role,prompt, agentFinalAnswer, embeddings, client) => {


    // Example of saving on cache miss
const cacheKey = `semanticCache:${Date.now()}`;
const cachePayload = JSON.stringify({
    role:role,
    query: prompt,
    answer: agentFinalAnswer,
    embeddings: embeddings // Make sure this matches the property name you use in ranking
});

// Save to Redis with an expiration (e.g., 24 hours = 86400 seconds)
await client.set(cacheKey, cachePayload, "EX", 86400);
}


