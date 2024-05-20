import express from "express"
import pg from "pg";
import dotenv from "dotenv";

//1.Get the environment variables from .env file
dotenv.config();

//2.Set up express app
const app = express();
const PORT =  process.env.PORT || 3000;


//3. Start the server
app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`)
})