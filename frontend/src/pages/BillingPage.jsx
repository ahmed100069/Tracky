import { useEffect, useMemo, useRef, useState } from "react";
import { OrderCart } from "../components/OrderCart.jsx";
import { useAppStore } from "../store/appStore.js";
import { useAuthStore } from "../store/authStore.js";
import { playConfirmationTone, quickPrintReceipt } from "../utils/orderRuntime.js";
import { downloadBillPdf } from "../utils/pdf.js";

export function BillingPage() {
  const {
    menu,
    cart,
    customers,
    billingDraft,
    offlineQueue,
    isOfflineMode,
    dashboard,
    selectedCategory,
    billingQuery,
    loadBootstrap,
    addToCart,
    changeQuantity,
    clearCart,
    undoLastAction,
    repeatLastOrder,
    editLastOrder,
    submitOrder,
    setBillingDraft,
    addPaymentLine,
    updatePaymentLine,
    removePaymentLine,
    syncOfflineOrders,
    setOfflineMode,
    setSelectedCategory,
    setBillingQuery,
    getTopItems,
    getRecentItems,
    addMenuItem
  } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const searchInputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [activeMobilePanel, setActiveMobilePanel] = useState("items");
  const [showAddDish, setShowAddDish] = useState(false);
  const [creatingDish, setCreatingDish] = useState(false);
  const [addDishMessage, setAddDishMessage] = useState({ type: "", text: "" });
  const [newDish, setNewDish] = useState({
    name: "",
    category: "Main",
    fullPrice: "",
    halfPrice: "",
    ownerPin: ""
  });

  useEffect(() => {
    loadBootstrap().catch(() => {});
  }, [loadBootstrap]);

  useEffect(() => {
    const handleOnline = () => {
      setOfflineMode(false);
      syncOfflineOrders()
        .then((count) => {
          if (count) setStatus(`${count} pending bill(s) synced`);
        })
        .catch(() => {});
    };

    const handleOffline = () => setOfflineMode(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOfflineMode, syncOfflineOrders]);

  const daypart = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "morning";
    if (hour < 18) return "lunch";
    return "night";
  }, []);

  const daypartMenu = useMemo(
    () =>
      menu.filter((item) => {
        if (!Array.isArray(item.dayparts) || !item.dayparts.length) return true;
        return item.dayparts.includes(daypart);
      }),
    [daypart, menu]
  );

  const categories = useMemo(() => {
    const set = new Set(daypartMenu.map((item) => item.category));
    return ["all", ...Array.from(set)];
  }, [daypartMenu]);

  const rushMode = Boolean(dashboard?.rushMode?.active);
  const quickItems = useMemo(() => getTopItems(new Date(), rushMode ? 12 : 16), [getTopItems, rushMode, menu, cart.length]);
  const recentItems = useMemo(() => getRecentItems(rushMode ? 6 : 10), [getRecentItems, cart.length, menu.length, rushMode]);
  const comboSuggestions = useMemo(() => dashboard?.comboSuggestions || [], [dashboard]);

  const filteredItems = useMemo(() => {
    const query = billingQuery.trim().toLowerCase();
    return daypartMenu.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (rushMode && !query && !item.rushVisible && !item.popular) return false;
      if (!query) return true;
      const aliases = Array.isArray(item.aliases) ? item.aliases.join(" ").toLowerCase() : "";
      return `${item.name} ${aliases}`.toLowerCase().includes(query);
    });
  }, [billingQuery, daypartMenu, rushMode, selectedCategory]);

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalTotal = Math.max(total - Number(billingDraft.discount || 0), 0);
    if (billingDraft.paymentMethod !== "split") {
      setBillingDraft((current) => ({
        ...current,
        payments: [{ method: current.paymentMethod, amount: finalTotal }]
      }));
    }
  }, [billingDraft.discount, billingDraft.paymentMethod, cart, setBillingDraft]);

  const handleAddItem = (item, selectedPortion = null) => {
    const result = addToCart(item, user?.id, selectedPortion);
    if (!result?.ok) {
      setStatus(result.reason);
    }
  };

  const handleAddCombo = (combo) => {
    const left = menu.find((item) => String(item._id) === String(combo.leftItemId));
    const right = menu.find((item) => String(item._id) === String(combo.rightItemId));
    if (!left || !right) {
      setStatus("Combo item missing from current menu.");
      return;
    }

    const leftPortion = left.portions?.find((portion) => portion.isDefault) || left.portions?.[0] || null;
    const rightPortion = right.portions?.find((portion) => portion.isDefault) || right.portions?.[0] || null;
    handleAddItem(left, leftPortion);
    handleAddItem(right, rightPortion);
    setStatus(`Combo added: ${combo.leftName} + ${combo.rightName}`);
  };

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categories, selectedCategory, setSelectedCategory]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const digit = Number(event.key);
      if (!Number.isNaN(digit) && digit > 0 && digit <= 9) {
        const item = quickItems[digit - 1];
        if (item) {
          event.preventDefault();
          const defaultPortion = item.portions?.find((portion) => portion.isDefault) || item.portions?.[0] || null;
          handleAddItem(item, defaultPortion);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [quickItems, user]);

  const completeOrder = async () => {
    try {
      const result = await submitOrder({ user });
      const printableOrder = {
        ...result.order,
        items: result.order.items.map((item) => ({
          ...item,
          price: item.unitPrice
        }))
      };
      const customerName = customers.find((item) => item._id === billingDraft.customerId)?.name;

      downloadBillPdf({
        order: printableOrder,
        dhabaName: user?.dhabaName,
        customerName
      });
      quickPrintReceipt({
        order: printableOrder,
        dhabaName: user?.dhabaName,
        customerName
      });
      playConfirmationTone();
      setStatus(result.offline ? "Bill saved locally. Sync pending." : "Bill completed and synced.");
    } catch (error) {
      setStatus(error.message || "Bill could not be completed.");
    }
  };

  const createDishFromBilling = async () => {
    const name = newDish.name.trim();
    const category = newDish.category.trim() || "Main";
    const fullPrice = Number(newDish.fullPrice);
    const halfPrice = Number(newDish.halfPrice || 0);
    setAddDishMessage({ type: "", text: "" });

    if (!name || !fullPrice || fullPrice <= 0) {
      const text = "Enter valid dish name and full price.";
      setStatus(text);
      setAddDishMessage({ type: "error", text });
      return;
    }
    if (isOfflineMode) {
      const text = "Cannot create menu dish in offline mode. Reconnect and try again.";
      setStatus(text);
      setAddDishMessage({ type: "error", text });
      return;
    }
    if (user?.role !== "owner" && !newDish.ownerPin.trim()) {
      const text = "Owner PIN is required for staff/receptionist to add new dish.";
      setStatus(text);
      setAddDishMessage({ type: "error", text });
      return;
    }

    setCreatingDish(true);
    setAddDishMessage({ type: "info", text: "Saving dish..." });
    try {
      const created = await addMenuItem({
        name,
        category,
        price: fullPrice,
        portions: [
          { label: "Full", price: fullPrice, isDefault: true },
          ...(halfPrice > 0 ? [{ label: "Half", price: halfPrice }] : [])
        ],
        ownerPin: newDish.ownerPin || undefined
      });
      const defaultPortion =
        created.portions?.find((portion) => portion.isDefault) || created.portions?.[0] || null;
      handleAddItem(created, defaultPortion);
      setShowAddDish(false);
      setNewDish({ name: "", category: category || "Main", fullPrice: "", halfPrice: "", ownerPin: "" });
      const text = `Dish "${created.name}" added and inserted into bill.`;
      setStatus(text);
      setAddDishMessage({ type: "success", text });
    } catch (error) {
      const text = error?.response?.data?.message || error?.message || "Could not create dish.";
      setStatus(text);
      setAddDishMessage({ type: "error", text });
    } finally {
      setCreatingDish(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <p className="section-title">Fast Billing</p>
            <h1 className="mt-1 font-display text-2xl text-brand-100">Top Items + Category + Search</h1>
            <p className="mt-1 text-xs text-brand-200/75">
              Daypart: {daypart} | offline-safe | touch-first | low training {rushMode ? "| Rush Mode active" : ""}
            </p>
          </div>
          <input
            ref={searchInputRef}
            className="w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none md:w-[320px]"
            placeholder="Search dish (e.g. paneer, roti, chai)"
            value={billingQuery}
            onChange={(event) => setBillingQuery(event.target.value)}
          />
          <button className="pill-button" onClick={() => setBillingQuery("")}>
            Clear Search
          </button>
          <button className="pill-button" onClick={() => setShowAddDish((prev) => !prev)}>
            {showAddDish ? "Close Add Dish" : "Add Dish"}
          </button>
        </div>
      </div>

      {showAddDish ? (
        <div className="glass-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="section-title">Add Dish Without Developer</p>
            <p className="text-xs text-brand-200/70">
              {user?.role === "owner" ? "Owner mode" : "Staff mode (PIN approval required)"}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none"
              placeholder="Dish name"
              value={newDish.name}
              onChange={(event) => setNewDish((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none"
              placeholder="Category (Roti/Sabzi)"
              value={newDish.category}
              onChange={(event) => setNewDish((current) => ({ ...current, category: event.target.value }))}
            />
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none"
              placeholder="Full Price"
              value={newDish.fullPrice}
              onChange={(event) => setNewDish((current) => ({ ...current, fullPrice: event.target.value }))}
              type="number"
              min="1"
            />
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none"
              placeholder="Half Price (optional)"
              value={newDish.halfPrice}
              onChange={(event) => setNewDish((current) => ({ ...current, halfPrice: event.target.value }))}
              type="number"
              min="1"
            />
            {user?.role === "owner" ? (
              <button className="pill-button" onClick={createDishFromBilling} disabled={creatingDish}>
                {creatingDish ? "Adding..." : "Save Dish"}
              </button>
            ) : (
              <input
                className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none"
                placeholder="Owner PIN"
                value={newDish.ownerPin}
                onChange={(event) => setNewDish((current) => ({ ...current, ownerPin: event.target.value }))}
                type="password"
              />
            )}
          </div>
          {user?.role !== "owner" ? (
            <div className="mt-3 flex justify-end">
              <button className="pill-button" onClick={createDishFromBilling} disabled={creatingDish}>
                {creatingDish ? "Adding..." : "Save Dish (PIN Approved)"}
              </button>
            </div>
          ) : null}
          {addDishMessage.text ? (
            <div
              className={`mt-3 rounded-2xl px-3 py-2 text-sm ${
                addDishMessage.type === "error"
                  ? "bg-red-500/20 text-red-100"
                  : addDishMessage.type === "success"
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-brand-700/60 text-brand-100"
              }`}
            >
              {addDishMessage.text}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="section-title">Auto Top Items</p>
          <p className="text-xs text-brand-200/70">Tap once to add • keyboard 1-9 • / to search</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {quickItems.map((item) => (
            <div key={item._id} className="rounded-2xl bg-brand-700 px-3 py-3 text-sm text-brand-100">
              <div className="mb-2 font-semibold">{item.name}</div>
              {item.portions?.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.portions.map((portion) => (
                    <button
                      key={`${item._id}-${portion.label}`}
                      className="rounded-xl bg-brand-600 px-2 py-1 text-xs font-semibold"
                      onClick={() => handleAddItem(item, portion)}
                    >
                      {portion.label} Rs {portion.price}
                    </button>
                  ))}
                </div>
              ) : (
                <button className="w-full rounded-xl bg-brand-600 px-2 py-1 text-xs font-semibold" onClick={() => handleAddItem(item)}>
                  Add Rs {item.price}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="section-title">Recent Items</p>
          <p className="text-xs text-brand-200/70">{rushMode ? "Rush-safe memory rail" : "Fast repeat lane"}</p>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          {recentItems.length ? (
            recentItems.map((item) => {
              const defaultPortion = item.portions?.find((portion) => portion.isDefault) || item.portions?.[0] || null;
              return (
                <button
                  key={`recent-${item._id}`}
                  className="rounded-2xl border border-brand-700 bg-brand-800/70 p-3 text-left text-sm text-brand-100 transition hover:border-brand-400"
                  onClick={() => handleAddItem(item, defaultPortion)}
                >
                  <div className="font-semibold">{item.name}</div>
                  <div className="mt-2 text-xs text-brand-200/75">{item.category} • Rs {defaultPortion?.price || item.price}</div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-brand-700 p-4 text-sm text-brand-200/75">
              Recent dish memory starts building as staff bills orders.
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="section-title">Suggested Combos</p>
          <p className="text-xs text-brand-200/70">Learned from repeat ordering patterns</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {comboSuggestions.length ? (
            comboSuggestions.map((combo) => (
              <button
                key={`${combo.leftItemId}-${combo.rightItemId}`}
                className="rounded-2xl border border-brand-700 bg-brand-800/70 p-3 text-left text-sm text-brand-100 transition hover:border-brand-400"
                onClick={() => handleAddCombo(combo)}
              >
                <div className="font-semibold">{combo.leftName}</div>
                <div className="text-xs text-brand-200/80">+</div>
                <div className="font-semibold">{combo.rightName}</div>
                <div className="mt-2 text-xs text-brand-200/70">Seen together {combo.count} times</div>
              </button>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-brand-700 p-4 text-sm text-brand-200/75">
              Combo suggestions will improve as more orders are placed.
            </div>
          )}
        </div>
      </div>

      <div className="lg:hidden glass-card p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`pill-button ${activeMobilePanel === "items" ? "!bg-brand-500 !text-brand-950" : ""}`}
            onClick={() => setActiveMobilePanel("items")}
          >
            Items
          </button>
          <button
            className={`pill-button ${activeMobilePanel === "cart" ? "!bg-brand-500 !text-brand-950" : ""}`}
            onClick={() => setActiveMobilePanel("cart")}
          >
            Cart
          </button>
        </div>
      </div>

      <div className={`grid gap-4 xl:grid-cols-[180px_1fr_420px] ${activeMobilePanel === "cart" ? "lg:grid-cols-[180px_1fr_420px]" : ""}`}>
        <div className={`${activeMobilePanel === "cart" ? "hidden lg:block" : ""}`}>
          <div className="glass-card p-3">
            <p className="section-title mb-3">Categories</p>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    selectedCategory === category
                      ? "border-brand-400 bg-brand-600 text-brand-50"
                      : "border-brand-700 bg-brand-800/70 text-brand-200 hover:border-brand-500"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all" ? "All Items" : category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`${activeMobilePanel === "cart" ? "hidden lg:block" : ""} space-y-4`}>
          <div className="glass-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="section-title">Item Grid</p>
              <p className="text-xs text-brand-200/70">
                {filteredItems.length} result(s) {billingQuery ? `for "${billingQuery}"` : ""}
              </p>
            </div>
            {filteredItems.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <div key={item._id} className="rounded-3xl border border-brand-700 bg-brand-800/70 p-4 text-left transition hover:border-brand-400">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-brand-100">{item.name}</h3>
                      {item.popular ? (
                        <span className="rounded-full bg-brand-500/20 px-2 py-1 text-xs text-brand-200">Top</span>
                      ) : null}
                    </div>
                    {item.portions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.portions.map((portion) => (
                          <button
                            key={`${item._id}-${portion.label}`}
                            className="rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-brand-100"
                            onClick={() => handleAddItem(item, portion)}
                          >
                            {portion.label} - Rs {portion.price}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="mt-3 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-brand-100"
                        onClick={() => handleAddItem(item)}
                      >
                        Add - Rs {item.price}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-700 p-5 text-sm text-brand-200/75">
                Item not found. Try switching category or clear search. If still missing, use Add Dish to create it instantly.
              </div>
            )}
          </div>
        </div>

        <div className={`${activeMobilePanel === "items" ? "hidden lg:block" : ""} space-y-4`}>
          <OrderCart
            cart={cart}
            customers={customers}
            onChangeQuantity={changeQuantity}
            onSubmit={completeOrder}
            onClear={clearCart}
            onUndo={undoLastAction}
            onRepeat={repeatLastOrder}
            onEditLast={editLastOrder}
            draft={billingDraft}
            setDraft={setBillingDraft}
            onAddPaymentLine={addPaymentLine}
            onUpdatePaymentLine={updatePaymentLine}
            onRemovePaymentLine={removePaymentLine}
            syncPending={offlineQueue.length}
            isOfflineMode={isOfflineMode}
          />
          {status ? <div className="glass-card p-4 text-sm text-brand-100">{status}</div> : null}
          {rushMode ? (
            <div className="glass-card p-4 text-sm text-brand-100">
              Rush Mode active at roughly {dashboard?.rushMode?.ordersPerHour || 0} orders/hour. Low-demand dishes are hidden unless searched.
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-200/70">Running Total</p>
            <p className="text-lg font-semibold text-brand-100">
              Rs {cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
            </p>
          </div>
          <button className="pill-button" onClick={() => setActiveMobilePanel("cart")}>
            Go To Payment
          </button>
        </div>
      </div>
    </div>
  );
}
