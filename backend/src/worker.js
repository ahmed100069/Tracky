import dotenv from "dotenv";
import { connectDb } from "./config/db.js";
import { startJobWorker } from "./services/jobWorker.js";

dotenv.config();

connectDb()
  .then(() => {
    startJobWorker();
    console.log("Tracky job worker started");
  })
  .catch((error) => {
    console.error("Failed to start Tracky job worker", error);
    process.exit(1);
  });
