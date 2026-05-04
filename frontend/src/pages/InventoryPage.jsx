import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore.js";

export function InventoryPage() {
  const { inventory, loadBootstrap, addInventory, addExpense } = useAppStore();
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    unit: "kg",
    currentStock: "",
    reorderLevel: "",
    estimatedUnitCost: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "raw-material"
  });

  useEffect(() => {
    loadBootstrap().catch(() => {});
  }, [loadBootstrap]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-4">
          <p className="section-title">Stock Item</p>
          <div className="mt-4 grid gap-3">
            {["name", "unit", "currentStock", "reorderLevel", "estimatedUnitCost"].map((field) => (
              <input
                key={field}
                className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
                placeholder={field}
                value={inventoryForm[field]}
                onChange={(event) => setInventoryForm({ ...inventoryForm, [field]: event.target.value })}
              />
            ))}
            <button
              className="pill-button"
              onClick={() =>
                addInventory({
                  ...inventoryForm,
                  currentStock: Number(inventoryForm.currentStock),
                  reorderLevel: Number(inventoryForm.reorderLevel),
                  estimatedUnitCost: Number(inventoryForm.estimatedUnitCost)
                }).then(() =>
                  setInventoryForm({
                    name: "",
                    unit: "kg",
                    currentStock: "",
                    reorderLevel: "",
                    estimatedUnitCost: ""
                  })
                )
              }
            >
              Save Stock Item
            </button>
          </div>
        </div>

        <div className="glass-card p-4">
          <p className="section-title">Daily Expense</p>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              placeholder="Expense title"
              value={expenseForm.title}
              onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
            />
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              placeholder="Amount"
              value={expenseForm.amount}
              onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
            />
            <select
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              value={expenseForm.category}
              onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
            >
              <option value="raw-material">Raw material</option>
              <option value="salary">Salary</option>
              <option value="rent">Rent</option>
              <option value="gas">Gas</option>
              <option value="misc">Misc</option>
            </select>
            <button
              className="pill-button"
              onClick={() =>
                addExpense({
                  ...expenseForm,
                  amount: Number(expenseForm.amount)
                }).then(() =>
                  setExpenseForm({
                    title: "",
                    amount: "",
                    category: "raw-material"
                  })
                )
              }
            >
              Save Expense
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">Inventory Snapshot</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {inventory.map((item) => (
            <div
              key={item._id}
              className={`rounded-2xl border p-4 ${
                item.isLow ? "border-orange-500/60 bg-orange-500/10" : "border-brand-700 bg-brand-800/60"
              }`}
            >
              <h3 className="font-medium text-brand-100">{item.name}</h3>
              <p className="mt-2 text-sm text-brand-200/75">
                {item.currentStock} {item.unit} left
              </p>
              <p className="text-sm text-brand-200/75">Reorder below {item.reorderLevel}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
