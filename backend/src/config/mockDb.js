// Mock database implementation to replace MongoDB when memory server fails
let mockData = {
  menuItems: [],
  customers: [],
  orders: [],
  inventory: [],
  expenses: [],
  users: [],
  tenants: [],
  auditLogs: []
};

// Load demo data into mock database
import { loadDemoData } from "../seeds/loadDemoData.js";

export const connectMockDb = async () => {
  console.log("Using mock database mode");
  
  // Load demo data
  await loadMockDemoData();
  console.log("Mock database initialized with demo data");
  return true;
};

const loadMockDemoData = async () => {
  // Simulate the demo data structure
  const tenantId = "tenant-123";
  
  mockData.tenants = [{
    _id: tenantId,
    name: "Tracky Demo Dhaba",
    phone: "9876543210",
    city: "Kanpur",
    plan: "starter",
    ownerPinHash: "hashed-pin-1234"
  }];

  mockData.users = [
    {
      _id: "user-owner-123",
      tenantId: tenantId,
      name: "Aman Yadav",
      email: "owner@tracky.demo",
      password: "password123",
      role: "owner"
    },
    {
      _id: "user-staff-123",
      tenantId: tenantId,
      name: "Raju",
      email: "staff@tracky.demo",
      password: "password123",
      role: "staff"
    }
  ];

  mockData.menuItems = [
    {
      _id: "menu-1",
      tenantId: tenantId,
      name: "Butter Chicken",
      category: "Main",
      price: 280,
      isAvailable: true,
      popular: true,
      preparationCost: 150,
      ingredients: []
    },
    {
      _id: "menu-2",
      tenantId: tenantId,
      name: "Tandoori Roti",
      category: "Bread",
      price: 12,
      isAvailable: true,
      popular: true,
      preparationCost: 4,
      ingredients: []
    },
    {
      _id: "menu-3",
      tenantId: tenantId,
      name: "Paneer Masala",
      category: "Main",
      price: 220,
      isAvailable: true,
      popular: true,
      preparationCost: 110,
      ingredients: []
    },
    {
      _id: "menu-4",
      tenantId: tenantId,
      name: "Jeera Rice",
      category: "Rice",
      price: 140,
      isAvailable: true,
      popular: false,
      preparationCost: 45,
      ingredients: []
    }
  ];

  mockData.customers = [
    {
      _id: "customer-1",
      tenantId: tenantId,
      name: "Shahid",
      phone: "9000011111",
      outstandingAmount: 2500,
      lastCreditDate: new Date()
    }
  ];

  mockData.inventory = [
    {
      _id: "inv-1",
      tenantId: tenantId,
      name: "Chicken",
      unit: "kg",
      currentStock: 12,
      reorderLevel: 5,
      estimatedUnitCost: 220
    },
    {
      _id: "inv-2",
      tenantId: tenantId,
      name: "Atta",
      unit: "kg",
      currentStock: 18,
      reorderLevel: 8,
      estimatedUnitCost: 42
    }
  ];

  mockData.expenses = [
    {
      _id: "expense-1",
      tenantId: tenantId,
      title: "Morning sabzi purchase",
      amount: 900,
      category: "raw-material"
    }
  ];

  mockData.orders = [
    {
      _id: "order-1",
      tenantId: tenantId,
      orderNumber: "TKY-240001",
      clientOrderId: "demo-order-1",
      items: [
        {
          menuItemId: "menu-1",
          name: "Butter Chicken",
          quantity: 2,
          unitPrice: 280,
          lineTotal: 560
        }
      ],
      subtotal: 632,
      total: 632,
      paymentMethod: "cash"
    }
  ];
};

// Mock model classes
export class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async find(filter = {}) {
    let items = mockData[this.collectionName] || [];
    if (filter.tenantId) {
      items = items.filter(item => item.tenantId === filter.tenantId);
    }
    if (filter.isAvailable !== undefined) {
      items = items.filter(item => item.isAvailable === filter.isAvailable);
    }
    return items;
  }

  async findOne(filter = {}) {
    const items = await this.find(filter);
    return items[0] || null;
  }

  async create(data) {
    const newItem = {
      _id: Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (!mockData[this.collectionName]) {
      mockData[this.collectionName] = [];
    }
    
    mockData[this.collectionName].push(newItem);
    return newItem;
  }

  async insertMany(items) {
    const createdItems = [];
    for (const item of items) {
      const created = await this.create(item);
      createdItems.push(created);
    }
    return createdItems;
  }

  async findByIdAndUpdate(id, update) {
    const items = mockData[this.collectionName] || [];
    const index = items.findIndex(item => item._id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...update, updatedAt: new Date() };
      return items[index];
    }
    return null;
  }

  async findByIdAndDelete(id) {
    const items = mockData[this.collectionName] || [];
    const index = items.findIndex(item => item._id === id);
    if (index !== -1) {
      const deleted = items.splice(index, 1)[0];
      return deleted;
    }
    return null;
  }
}

// Export mock models
export const MenuItem = new MockModel('menuItems');
export const Customer = new MockModel('customers');
export const Order = new MockModel('orders');
export const InventoryItem = new MockModel('inventory');
export const Expense = new MockModel('expenses');
export const User = new MockModel('users');
export const Tenant = new MockModel('tenants');
export const AuditLog = new MockModel('auditLogs');
