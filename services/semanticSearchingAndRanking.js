import {cosineSimilarity} from "../services/cosineSimilarity.js"

export const semanticSearchAndRank = (semanticSearchArray,semanticRankingArray,data) =>{

    
        if (semanticSearchArray.length > 0) {
            const rankingData = semanticSearchArray.map((item) => {
                let similarityScore = cosineSimilarity(data.embeddings, item.embeddings);
                return { 
                    currentQuery: data.query, 
                    comparedQuery: item.query, 
                    similarityScore: similarityScore, 
                    answer: item.answer 
                };
            });

            semanticRankingArray = rankingData.sort((a, b) => b.similarityScore - a.similarityScore);
            console.log("Top Similarity Score:", semanticRankingArray[0].similarityScore.toFixed(4));
        
            if (semanticRankingArray[0].similarityScore > 0.6) {
                console.log("\nCACHE HIT - Using Cached Answer");
                console.log("Semantic Search Result Found:");
                console.log(`Matched Query: "${semanticRankingArray[0].comparedQuery}"`);
                console.log("Answer:", semanticRankingArray[0].answer);
                console.log("--------------------------------------------------");
                return; // Exit function, bypassing LLM completely
            } else {
                console.log("CACHE MISS - No similar query found in cache. Proceeding to ask the agent.");
            }
        } else {
            console.log("CACHE MISS - Cache is empty. Proceeding to ask the agent.");
        }
}