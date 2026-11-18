# Choose base os and node version 
FROM node:20-slim 

# setup the working directory 

WORKDIR /app   

# copy package.json and package-lock.json

COPY package*.json ./  

RUN npm install 

# copy thee rest of the files 

COPY . . 

# final command to run 

CMD ["node", "agent.js"]
