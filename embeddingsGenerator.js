import { pipeline } from "@huggingface/transformers";

const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

export const EmbeddingGenerator = async (ans) => {
    // pooling: 'mean' aur normalize: true add karne se tensor proper 384-d vector ban jata hai
    const response = await extractor(ans, { pooling: 'mean', normalize: true });
    
    // Tensor data ko standard JS array me convert karo
    const embeddingArray = Array.from(response.data);

    return {
        query: ans,
        embeddings: embeddingArray // Poora clean standard array return hoga
    };
};