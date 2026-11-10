import { createClient } from 'redis';


export const redisConnection=async()=>{


const client = createClient();  

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();  // this will connect on localhost:6379by default
console.log("redis connected successfully");

return client;
}

