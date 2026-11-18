import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();


export const redisConnection=async()=>{


const client = createClient({
    url:process.env.REDIS_URL
});  

client.on('error', err => console.log('Redis Client Error', err));

 // this will connect on localhost:6379by default

if (!client.isOpen) {
        await client.connect();
        console.log("Redis connected successfully");
    }
console.log("redis connected successfully");

return client;
}

