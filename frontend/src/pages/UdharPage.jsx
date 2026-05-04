import { useEffect, useState } from "react";
import { useAppStore } from "../store/appStore.js";
import { formatCurrency } from "../utils/currency.js";

export function UdharPage() {
  const { customers, loadBootstrap, addCustomer, recordPayment } = useAppStore();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [paymentAmount, setPaymentAmount] = useState({});

  useEffect(() => {
    loadBootstrap().catch(() => {});
  }, [loadBootstrap]);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="glass-card p-4">
        <p className="section-title">Udhar Entry</p>
        <h1 className="mt-2 font-display text-3xl text-brand-100">Naam aur number bas</h1>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="Customer name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <button
            className="pill-button"
            onClick={() => addCustomer(form).then(() => setForm({ name: "", phone: "" }))}
          >
            Add Customer
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">Pending Payments</p>
        <div className="mt-4 space-y-3">
          {customers.map((customer) => (
            <div key={customer._id} className="rounded-2xl bg-brand-800/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-medium text-brand-100">{customer.name}</h3>
                  <p className="text-sm text-brand-200/75">
                    {formatCurrency(customer.outstandingAmount)} pending • {customer.overdueDays} day(s) overdue
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    className="w-28 rounded-2xl border border-brand-700 bg-brand-900 px-3 py-2 outline-none"
                    placeholder="Amount"
                    value={paymentAmount[customer._id] || ""}
                    onChange={(event) =>
                      setPaymentAmount({ ...paymentAmount, [customer._id]: event.target.value })
                    }
                  />
                  <button
                    className="pill-button"
                    onClick={() =>
                      recordPayment(customer._id, Number(paymentAmount[customer._id] || 0)).then(() =>
                        setPaymentAmount({ ...paymentAmount, [customer._id]: "" })
                      )
                    }
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!customers.length ? <p className="text-sm text-brand-200/75">No udhar customers yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
