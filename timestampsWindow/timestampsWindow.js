const MAX_GLOBAL_REQUEST = process.env.MAX_GLOBAL_REQUEST ? parseInt(process.env.MAX_GLOBAL_REQUEST) : 5; 
const WINDOW_SIZE = process.env.WINDOW_SIZE ? parseInt(process.env.WINDOW_SIZE) : 15000; 

export const requestTimestamps=[];

export const checkGlobalTimestamps = () => {
    const currentTime = Date.now();

    while (requestTimestamps.length > 0 && (currentTime - requestTimestamps[0] > WINDOW_SIZE)) {
        requestTimestamps.shift(); 
    }

    if (requestTimestamps.length >= MAX_GLOBAL_REQUEST) {
        console.log("Global request limit exceeded. Please try again later.");
        return false;
    }

    requestTimestamps.push(currentTime);
    return true;
};