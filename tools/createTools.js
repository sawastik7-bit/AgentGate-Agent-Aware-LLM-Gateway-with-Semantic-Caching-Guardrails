 
 import {userDatabase} from "../database/database.js";
 import { tool } from "langchain/tools";
 import { z } from "zod";
 
 export const createTools = (userContext) => {
    const userId = userContext.userId;

    return [
        tool(
            async () => {
                const user = userDatabase[userId];
                return `User ${user.name} has a balance of $${user.balance}`;
            },
            {
                name: "balance",
                description: "Returns the user's balance",
                schema: z.object({})
            }
        ),
        tool(
            async () => {
                const user = userDatabase[userId];
                return `User ${user.name} has the role of ${user.role}`;
            },
            {
                name: "role",
                description: "Returns the user's role",
                schema: z.object({})
            }
        )
    ];
};