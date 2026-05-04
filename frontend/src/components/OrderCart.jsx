import { formatCurrency } from "../utils/currency.js";

export function OrderCart({
  cart,
  customers,
  onChangeQuantity,
  onSubmit,
  onClear,
  onUndo,
  onRepeat,
  onEditLast,
  draft,
  setDraft,
  onAddPaymentLine,
  onUpdatePaymentLine,
  onRemovePaymentLine,
  syncPending,
  isOfflineMode
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Number(draft.discount || 0);
  const totalAfterDiscount = Math.max(subtotal - discount, 0);
  const paidAmount = draft.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const udharUsed =
    draft.paymentMethod === "udhar" || draft.payments.some((payment) => payment.method === "udhar");

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-title">Current Bill</p>
          <h2 className="mt-2 text-xl font-semibold text-brand-100">{formatCurrency(totalAfterDiscount)}</h2>
          {discount > 0 ? <p className="mt-1 text-xs text-brand-200/75">Subtotal {formatCurrency(subtotal)} • Discount {formatCurrency(discount)}</p> : null}
        </div>
        <div className="space-y-1 text-right text-xs">
          <div className={`rounded-full px-3 py-1 ${isOfflineMode ? "bg-orange-500/20 text-orange-100" : "bg-emerald-500/20 text-emerald-100"}`}>
            {isOfflineMode ? "Offline Mode" : "Online"}
          </div>
          <div className="text-brand-200/75">Sync Pending: {syncPending}</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {cart.length ? (
          cart.map((item) => (
            <div
              key={item.cartLineId || `${item.menuItemId}-${item.portionLabel || "default"}`}
              className="flex items-center justify-between rounded-2xl bg-brand-800/70 p-3"
            >
              <div>
                <p className="font-medium text-brand-100">{item.name}</p>
                <p className="text-sm text-brand-200/75">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="pill-button !px-3 !py-2" onClick={() => onChangeQuantity(item.cartLineId, -1)}>
                  -
                </button>
                <span className="min-w-6 text-center">{item.quantity}</span>
                <button className="pill-button !px-3 !py-2" onClick={() => onChangeQuantity(item.cartLineId, 1)}>
                  +
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-700 p-6 text-center text-sm text-brand-200/75">
            Tap menu items to build the bill. Bill stays on this device even if internet drops.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="pill-button" onClick={onUndo}>
          Undo Last Action
        </button>
        <button className="pill-button" onClick={onRepeat}>
          Repeat Last Order
        </button>
        <button className="pill-button" onClick={onEditLast}>
          Edit Last Order
        </button>
        <button className="pill-button" onClick={onClear}>
          Clear Bill
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <select
          className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
          value={draft.paymentMethod}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              paymentMethod: event.target.value,
              payments:
                event.target.value === "split"
                  ? current.payments
                  : [{ method: event.target.value, amount: totalAfterDiscount }]
            }))
          }
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="udhar">Udhar</option>
          <option value="split">Split Payment</option>
        </select>

        {draft.paymentMethod === "split" ? (
          <div className="rounded-2xl border border-brand-700 bg-brand-900/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-brand-100">Split Payment</p>
              <button className="pill-button !px-3 !py-2" onClick={onAddPaymentLine}>
                Add Split
              </button>
            </div>
            <div className="space-y-3">
              {draft.payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <select
                    className="rounded-2xl border border-brand-700 bg-brand-800 px-3 py-2 outline-none"
                    value={payment.method}
                    onChange={(event) => onUpdatePaymentLine(index, "method", event.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="udhar">Udhar</option>
                  </select>
                  <input
                    className="rounded-2xl border border-brand-700 bg-brand-800 px-3 py-2 outline-none"
                    value={payment.amount}
                    onChange={(event) => onUpdatePaymentLine(index, "amount", event.target.value)}
                    placeholder="Amount"
                  />
                  <button className="pill-button !px-3 !py-2" onClick={() => onRemovePaymentLine(index)}>
                    X
                  </button>
                </div>
              ))}
            </div>
            <p className={`mt-3 text-sm ${Math.round(paidAmount) === Math.round(subtotal) ? "text-emerald-200" : "text-orange-200"}`}>
              Paid {formatCurrency(paidAmount)} / {formatCurrency(totalAfterDiscount)}
            </p>
          </div>
        ) : null}

        <input
          className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
          value={draft.discount}
          onChange={(event) =>
            setDraft((current) => {
              const nextDiscount = Number(event.target.value || 0);
              const nextTotal = Math.max(subtotal - nextDiscount, 0);
              return {
                ...current,
                discount: nextDiscount,
                payments:
                  current.paymentMethod === "split"
                    ? current.payments
                    : [{ method: current.paymentMethod, amount: nextTotal }]
              };
            })
          }
          placeholder="Discount amount"
          type="number"
          min="0"
        />

        {udharUsed ? (
          <>
            <select
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              value={draft.customerId}
              onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
              value={draft.ownerPin}
              onChange={(event) => setDraft((current) => ({ ...current, ownerPin: event.target.value }))}
              placeholder="Owner PIN approval"
              type="password"
            />
          </>
        ) : null}

        <textarea
          rows="2"
          className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
          placeholder="Optional note"
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
        />

        <button
          className="rounded-2xl bg-brand-400 px-4 py-4 text-base font-bold text-brand-950 transition hover:bg-brand-300 disabled:opacity-50"
          disabled={!cart.length}
          onClick={onSubmit}
        >
          Complete Order {discount > 0 ? `• ${formatCurrency(totalAfterDiscount)}` : ""}
        </button>
      </div>
    </div>
  );
}
