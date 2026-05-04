import { hashPin } from "../utils/pin.js";
import { Customer } from "../models/Customer.js";
import { Expense } from "../models/Expense.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Tenant } from "../models/Tenant.js";
import { User } from "../models/User.js";

export const loadDemoData = async () => {
  const existingTenant = await Tenant.findOne({});
  if (existingTenant) {
    return;
  }

  const tenant = await Tenant.create({
    name: "Tracky Demo Dhaba",
    phone: "9876543210",
    city: "Kanpur",
    plan: "starter",
    ownerPinHash: await hashPin("1234")
  });

  const owner = await User.create({
    tenantId: tenant._id,
    name: "Aman Yadav",
    email: "owner@tracky.demo",
    password: "password123",
    role: "owner"
  });

  const staff = await User.create({
    tenantId: tenant._id,
    name: "Raju",
    email: "staff@tracky.demo",
    password: "password123",
    role: "staff"
  });

  const inventory = await InventoryItem.insertMany([
    { tenantId: tenant._id, name: "Chicken", unit: "kg", currentStock: 12, reorderLevel: 5, estimatedUnitCost: 220 },
    { tenantId: tenant._id, name: "Atta", unit: "kg", currentStock: 18, reorderLevel: 8, estimatedUnitCost: 42 },
    { tenantId: tenant._id, name: "Oil", unit: "ltr", currentStock: 6, reorderLevel: 4, estimatedUnitCost: 135 },
    { tenantId: tenant._id, name: "Butter", unit: "kg", currentStock: 2, reorderLevel: 3, estimatedUnitCost: 420 }
  ]);

  const inventoryMap = Object.fromEntries(inventory.map((item) => [item.name, item]));

  const menuItems = await MenuItem.insertMany([
    {
      tenantId: tenant._id,
      name: "Butter Chicken",
      category: "Main",
      price: 280,
      popular: true,
      preparationCost: 150,
      ingredients: [
        { inventoryItemId: inventoryMap.Chicken._id, name: "Chicken", quantity: 0.35, unit: "kg", cost: 77 },
        { inventoryItemId: inventoryMap.Butter._id, name: "Butter", quantity: 0.03, unit: "kg", cost: 13 }
      ]
    },
    {
      tenantId: tenant._id,
      name: "Tandoori Roti",
      category: "Bread",
      price: 12,
      popular: true,
      preparationCost: 4,
      ingredients: [
        { inventoryItemId: inventoryMap.Atta._id, name: "Atta", quantity: 0.08, unit: "kg", cost: 3.5 }
      ]
    },
    {
      tenantId: tenant._id,
      name: "Paneer Masala",
      category: "Main",
      price: 220,
      popular: true,
      preparationCost: 110
    },
    {
      tenantId: tenant._id,
      name: "Jeera Rice",
      category: "Rice",
      price: 140,
      preparationCost: 45
    }
  ]);

  const customer = await Customer.create({
    tenantId: tenant._id,
    name: "Shahid",
    phone: "9000011111",
    outstandingAmount: 2500,
    lastCreditDate: new Date(Date.now() - 3 * 86400000)
  });

  await Expense.insertMany([
    { tenantId: tenant._id, title: "Morning sabzi purchase", amount: 900, category: "raw-material" },
    { tenantId: tenant._id, title: "Gas refill share", amount: 450, category: "gas" }
  ]);

  await Order.insertMany([
    {
      tenantId: tenant._id,
      orderNumber: "TKY-240001",
      clientOrderId: "demo-order-1",
      createdBy: staff._id,
      deviceId: "demo-counter",
      items: [
        {
          menuItemId: menuItems[0]._id,
          name: "Butter Chicken",
          quantity: 2,
          unitPrice: 280,
          lineTotal: 560,
          estimatedCost: 300
        },
        {
          menuItemId: menuItems[1]._id,
          name: "Tandoori Roti",
          quantity: 6,
          unitPrice: 12,
          lineTotal: 72,
          estimatedCost: 24
        }
      ],
      subtotal: 632,
      total: 632,
      payments: [{ method: "cash", amount: 632 }],
      paymentMethod: "cash",
      source: "manual",
      localCreatedAt: new Date(),
      syncedAt: new Date(),
      createdAt: new Date()
    },
    {
      tenantId: tenant._id,
      orderNumber: "TKY-240002",
      clientOrderId: "demo-order-2",
      createdBy: owner._id,
      deviceId: "demo-counter",
      items: [
        {
          menuItemId: menuItems[2]._id,
          name: "Paneer Masala",
          quantity: 1,
          unitPrice: 220,
          lineTotal: 220,
          estimatedCost: 110
        }
      ],
      subtotal: 220,
      total: 220,
      payments: [{ method: "udhar", amount: 220 }],
      paymentMethod: "udhar",
      customerId: customer._id,
      source: "voice",
      localCreatedAt: new Date(),
      syncedAt: new Date(),
      approvals: {
        udharApprovedBy: owner._id
      },
      createdAt: new Date()
    }
  ]);
};
