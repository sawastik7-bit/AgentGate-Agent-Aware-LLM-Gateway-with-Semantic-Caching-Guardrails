import {pipeline} from "@huggingface/transformers";


const extractor= await pipeline("feature-extraction","Xenova/all-MiniLM-L6-v2");


 export const EmbeddingGenerator=async (ans)=>{

const response=await extractor(ans);
let data=response.ort_tensor.cpuData.slice(0,10);

return {
    query:ans,
    embeddings:data
};
}