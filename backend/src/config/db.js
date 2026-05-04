import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectMockDb, MenuItem, Customer, Order, InventoryItem, Expense, User, Tenant, AuditLog } from "./mockDb.js";

let memoryServer;

export const connectDb = async () => {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: "tracky"
        }
      });
      const uri = memoryServer.getUri();
      await mongoose.connect(uri);
      console.log("MongoDB memory server connected");
      return;
    } catch (error) {
      console.log("MongoDB memory server failed, falling back to mock database");
      await connectMockDb();
      // Export mock models globally
      global.mockMode = true;
      global.MenuItem = MenuItem;
      global.Customer = Customer;
      global.Order = Order;
      global.InventoryItem = InventoryItem;
      global.Expense = Expense;
      global.User = User;
      global.Tenant = Tenant;
      global.AuditLog = AuditLog;
      return;
    }
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    // In persistent mode, fail fast so operators know DB is misconfigured.
    console.error("MongoDB connection failed in persistent mode", error);
    throw error;
  }
};

export const closeDb = async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
