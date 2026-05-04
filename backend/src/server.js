import dotenv from "dotenv";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { loadDemoData } from "./seeds/loadDemoData.js";
import { startReportScheduler } from "./services/reportScheduler.js";
import { startJobWorker } from "./services/jobWorker.js";
dotenv.config();
const port = process.env.PORT || 5000;
connectDb()
  .then(async () => {
    if (process.env.USE_IN_MEMORY_DB === "true") {
      await loadDemoData();
      console.log("Demo data loaded into memory database");
    }
    startReportScheduler();
    startJobWorker();
    app.listen(port, () => {
      console.log(`Tracky API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
