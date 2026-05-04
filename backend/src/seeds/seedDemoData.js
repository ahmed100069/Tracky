import dotenv from "dotenv";
import mongoose from "mongoose";
import { closeDb, connectDb } from "../config/db.js";
import { loadDemoData } from "./loadDemoData.js";

dotenv.config();

const seed = async () => {
  await connectDb();

  await Promise.all([
    Customer.deleteMany({}),
    Expense.deleteMany({}),
    InventoryItem.deleteMany({}),
    MenuItem.deleteMany({}),
    Order.deleteMany({}),
    User.deleteMany({}),
    Tenant.deleteMany({})
  ]);

  await loadDemoData();

  console.log("Demo tenant created");
  console.log("Owner login: owner@tracky.demo / password123");
  console.log("Staff login: staff@tracky.demo / password123");

  await closeDb();
};

seed().catch(async (error) => {
  console.error(error);
  if (mongoose.connection.readyState) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
