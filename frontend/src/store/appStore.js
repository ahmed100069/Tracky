import { create } from "zustand";
import { api } from "../lib/api.js";
import { createUuid, parseVoiceFallback } from "../utils/orderRuntime.js";
import { loadJson, loadManyFromPersistence, saveJson } from "../utils/storage.js";

const STORAGE_KEYS = {
  menu: "tracky_menu_cache",
  categories: "tracky_categories_cache",
  customers: "tracky_customers_cache",
  inventory: "tracky_inventory_cache",
  dashboard: "tracky_dashboard_cache",
  orders: "tracky_orders_cache",
  queue: "tracky_offline_orders",
  cart: "tracky_active_cart",
  draft: "tracky_billing_draft",
  lastOrder: "tracky_last_order",
  itemStats: "tracky_item_stats",
  recentItems: "tracky_recent_items",
  mutations: "tracky_mutation_queue"
};

const defaultDraft = {
  paymentMethod: "cash",
  customerId: "",
  payments: [{ method: "cash", amount: 0 }],
  discount: 0,
  ownerPin: "",
  notes: ""
};

const saveBilling = (state) => {
  saveJson(STORAGE_KEYS.cart, state.cart);
  saveJson(STORAGE_KEYS.draft, state.billingDraft);
  saveJson(STORAGE_KEYS.queue, state.offlineQueue);
  saveJson(STORAGE_KEYS.orders, state.recentOrders);
  saveJson(STORAGE_KEYS.lastOrder, state.lastCompletedOrder);
};

const saveMutationQueue = (queue) => {
  saveJson(STORAGE_KEYS.mutations, queue);
};

const normalizeDraft = (draft = defaultDraft) => ({
  ...defaultDraft,
  ...draft,
  payments: Array.isArray(draft.payments) && draft.payments.length ? draft.payments : [{ method: "cash", amount: 0 }]
});

const replaceOrderInList = (orders, clientOrderId, nextOrder) =>
  orders.map((order) => (order.clientOrderId === clientOrderId ? nextOrder : order));

const buildCartLineId = (menuItemId, portionLabel) => `${menuItemId}::${portionLabel || "default"}`;

export const useAppStore = create((set, get) => ({
  menu: loadJson(STORAGE_KEYS.menu, []),
  categories: loadJson(STORAGE_KEYS.categories, []),
  dashboard: loadJson(STORAGE_KEYS.dashboard, null),
  customers: loadJson(STORAGE_KEYS.customers, []),
  inventory: loadJson(STORAGE_KEYS.inventory, []),
  expenses: [],
  aiInsights: [],
  udharAlerts: [],
  cart: loadJson(STORAGE_KEYS.cart, []),
  billingDraft: normalizeDraft(loadJson(STORAGE_KEYS.draft, defaultDraft)),
  recentOrders: loadJson(STORAGE_KEYS.orders, []),
  lastCompletedOrder: loadJson(STORAGE_KEYS.lastOrder, null),
  voiceTranscript: "",
  voiceSuggestion: [],
  offlineQueue: loadJson(STORAGE_KEYS.queue, []),
  actionHistory: [],
  isOfflineMode: typeof navigator !== "undefined" ? !navigator.onLine : false,
  cartOwnerUserId: "",
  syncInFlight: false,
  selectedCategory: "all",
  billingQuery: "",
  itemStats: loadJson(STORAGE_KEYS.itemStats, {}),
  recentItemIds: loadJson(STORAGE_KEYS.recentItems, []),
  mutationQueue: loadJson(STORAGE_KEYS.mutations, []),
  hydrated: false,
  async hydrateFromStorage() {
    const persisted = await loadManyFromPersistence(Object.values(STORAGE_KEYS));
    const nextState = {};

    if (Array.isArray(persisted[STORAGE_KEYS.menu])) nextState.menu = persisted[STORAGE_KEYS.menu];
    if (Array.isArray(persisted[STORAGE_KEYS.categories])) nextState.categories = persisted[STORAGE_KEYS.categories];
    if (Array.isArray(persisted[STORAGE_KEYS.customers])) nextState.customers = persisted[STORAGE_KEYS.customers];
    if (Array.isArray(persisted[STORAGE_KEYS.inventory])) nextState.inventory = persisted[STORAGE_KEYS.inventory];
    if (persisted[STORAGE_KEYS.dashboard]) nextState.dashboard = persisted[STORAGE_KEYS.dashboard];
    if (Array.isArray(persisted[STORAGE_KEYS.orders])) nextState.recentOrders = persisted[STORAGE_KEYS.orders];
    if (persisted[STORAGE_KEYS.lastOrder]) nextState.lastCompletedOrder = persisted[STORAGE_KEYS.lastOrder];
    if (Array.isArray(persisted[STORAGE_KEYS.queue])) nextState.offlineQueue = persisted[STORAGE_KEYS.queue];
    if (Array.isArray(persisted[STORAGE_KEYS.cart])) nextState.cart = persisted[STORAGE_KEYS.cart];
    if (persisted[STORAGE_KEYS.draft]) nextState.billingDraft = normalizeDraft(persisted[STORAGE_KEYS.draft]);
    if (persisted[STORAGE_KEYS.itemStats]) nextState.itemStats = persisted[STORAGE_KEYS.itemStats];
    if (Array.isArray(persisted[STORAGE_KEYS.recentItems])) nextState.recentItemIds = persisted[STORAGE_KEYS.recentItems];
    if (Array.isArray(persisted[STORAGE_KEYS.mutations])) nextState.mutationQueue = persisted[STORAGE_KEYS.mutations];

    nextState.hydrated = true;
    set(nextState);
    return nextState;
  },
  async loadBootstrap() {
    const results = await Promise.allSettled([
      api.get("/menu"),
      api.get("/menu/categories"),
      api.get("/dashboard/summary"),
      api.get("/customers"),
      api.get("/inventory"),
      api.get("/ai/insights"),
      api.get("/orders")
    ]);

    const [menuRes, categoriesRes, dashboardRes, customersRes, inventoryRes, insightsRes, ordersRes] = results;
    const nextState = {
      isOfflineMode: results.some((result) => result.status === "rejected")
    };

    if (menuRes.status === "fulfilled") {
      nextState.menu = menuRes.value.data;
      saveJson(STORAGE_KEYS.menu, menuRes.value.data);
    }
    if (categoriesRes.status === "fulfilled") {
      nextState.categories = categoriesRes.value.data;
      saveJson(STORAGE_KEYS.categories, categoriesRes.value.data);
    }
    if (dashboardRes.status === "fulfilled") {
      nextState.dashboard = dashboardRes.value.data;
      saveJson(STORAGE_KEYS.dashboard, dashboardRes.value.data);
    }
    if (customersRes.status === "fulfilled") {
      nextState.customers = customersRes.value.data;
      saveJson(STORAGE_KEYS.customers, customersRes.value.data);
    }
    if (inventoryRes.status === "fulfilled") {
      nextState.inventory = inventoryRes.value.data;
      saveJson(STORAGE_KEYS.inventory, inventoryRes.value.data);
    }
    if (insightsRes.status === "fulfilled") {
      nextState.aiInsights = insightsRes.value.data.insights;
      nextState.udharAlerts = insightsRes.value.data.udharAlerts;
    }
    if (ordersRes.status === "fulfilled") {
      nextState.recentOrders = [
        ...ordersRes.value.data.map((order) => ({ ...order, syncStatus: "synced" })),
        ...get().recentOrders.filter((order) => order.syncStatus === "pending")
      ].slice(0, 50);
      saveJson(STORAGE_KEYS.orders, nextState.recentOrders);
    }

    set(nextState);
  },
  setOfflineMode(value) {
    set({ isOfflineMode: value });
  },
  setSelectedCategory(category) {
    set({ selectedCategory: category || "all" });
  },
  setBillingQuery(query) {
    set({ billingQuery: query || "" });
  },
  getTopItems(now = new Date(), limit = 16) {
    const hour = now.getHours();
    const daypart = hour < 11 ? "morning" : hour < 18 ? "lunch" : "night";
    const stats = get().itemStats || {};

    const scored = get().menu
      .map((item) => {
        const record = stats[item._id] || { total: 0, dayparts: {} };
        const daypartCount = record.dayparts?.[daypart] || 0;
        const score = record.total * 0.7 + daypartCount * 0.3 + (item.popular ? 3 : 0);
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.item);

    return scored;
  },
  getRecentItems(limit = 10) {
    const menuMap = new Map(get().menu.map((item) => [String(item._id), item]));
    return get()
      .recentItemIds.map((itemId) => menuMap.get(String(itemId)))
      .filter(Boolean)
      .slice(0, limit);
  },
  touchItem(itemId, now = new Date()) {
    const hour = now.getHours();
    const daypart = hour < 11 ? "morning" : hour < 18 ? "lunch" : "night";
    const current = get().itemStats || {};
    const existing = current[itemId] || { total: 0, dayparts: {} };
    const next = {
      ...current,
      [itemId]: {
        total: existing.total + 1,
        dayparts: {
          ...existing.dayparts,
          [daypart]: (existing.dayparts?.[daypart] || 0) + 1
        }
      }
    };
    const recentItemIds = [itemId, ...get().recentItemIds.filter((existingId) => String(existingId) !== String(itemId))].slice(0, 20);
    set({ itemStats: next, recentItemIds });
    saveJson(STORAGE_KEYS.itemStats, next);
    saveJson(STORAGE_KEYS.recentItems, recentItemIds);
  },
  setBillingDraft(updater) {
    const nextDraft =
      typeof updater === "function" ? normalizeDraft(updater(get().billingDraft)) : normalizeDraft(updater);
    set({ billingDraft: nextDraft });
    saveBilling({ ...get(), billingDraft: nextDraft });
  },
  addPaymentLine() {
    const nextDraft = {
      ...get().billingDraft,
      paymentMethod: "split",
      payments: [...get().billingDraft.payments, { method: "upi", amount: 0 }]
    };
    set({ billingDraft: nextDraft });
    saveBilling({ ...get(), billingDraft: nextDraft });
  },
  updatePaymentLine(index, field, value) {
    const nextDraft = {
      ...get().billingDraft,
      payments: get().billingDraft.payments.map((payment, paymentIndex) =>
        paymentIndex === index
          ? { ...payment, [field]: field === "amount" ? Number(value || 0) : value }
          : payment
      )
    };
    set({ billingDraft: nextDraft });
    saveBilling({ ...get(), billingDraft: nextDraft });
  },
  removePaymentLine(index) {
    const payments = get().billingDraft.payments.filter((_, paymentIndex) => paymentIndex !== index);
    const nextDraft = {
      ...get().billingDraft,
      payments: payments.length ? payments : [{ method: "cash", amount: 0 }],
      paymentMethod: payments.length > 1 ? "split" : payments[0]?.method || "cash"
    };
    set({ billingDraft: nextDraft });
    saveBilling({ ...get(), billingDraft: nextDraft });
  },
  pushHistory() {
    set({
      actionHistory: [...get().actionHistory, get().cart.map((item) => ({ ...item }))].slice(-20)
    });
  },
  undoLastAction() {
    const history = [...get().actionHistory];
    const previous = history.pop();
    if (!previous) return;
    set({ cart: previous, actionHistory: history });
    saveBilling({ ...get(), cart: previous, actionHistory: history });
  },
  claimCart(userId) {
    const owner = get().cartOwnerUserId;
    if (owner && owner !== userId && get().cart.length) return false;
    set({ cartOwnerUserId: userId });
    return true;
  },
  addToCart(item, userId, selectedPortion = null) {
    if (!get().claimCart(userId)) {
      return { ok: false, reason: "Another staff member already has an active bill on this device." };
    }

    get().pushHistory();
    const portionLabel = selectedPortion?.label || "";
    const unitPrice = Number(selectedPortion?.price || item.price);
    const lineName = portionLabel ? `${item.name} (${portionLabel})` : item.name;
    const cartLineId = buildCartLineId(item._id, portionLabel);
    const existing = get().cart.find((cartItem) => cartItem.cartLineId === cartLineId);
    const nextCart = existing
      ? get().cart.map((cartItem) =>
          cartItem.cartLineId === cartLineId
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      : [
          ...get().cart,
          {
            cartLineId,
            menuItemId: item._id,
            name: lineName,
            baseName: item.name,
            portionLabel,
            price: unitPrice,
            quantity: 1
          }
        ];

    get().touchItem(item._id);
    set({ cart: nextCart });
    saveBilling({ ...get(), cart: nextCart });
    return { ok: true };
  },
  changeQuantity(cartLineId, delta) {
    get().pushHistory();
    const nextCart = get()
      .cart.map((item) =>
        (item.cartLineId || buildCartLineId(item.menuItemId, item.portionLabel)) === cartLineId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter((item) => item.quantity > 0);
    const normalizedCart = nextCart.map((item) => ({
      ...item,
      cartLineId: item.cartLineId || buildCartLineId(item.menuItemId, item.portionLabel)
    }));

    set({ cart: normalizedCart });
    saveBilling({ ...get(), cart: normalizedCart });
  },
  clearCart() {
    const nextState = {
      cart: [],
      billingDraft: { ...defaultDraft },
      voiceTranscript: "",
      voiceSuggestion: [],
      cartOwnerUserId: "",
      actionHistory: []
    };
    set(nextState);
    saveBilling({ ...get(), ...nextState });
  },
  restoreLastOrder() {
    const lastOrder = get().lastCompletedOrder;
    if (!lastOrder) return false;

    const nextCart = lastOrder.items.map((item) => ({
      cartLineId: buildCartLineId(item.menuItemId, item.portionLabel),
      menuItemId: item.menuItemId,
      name: item.name,
      baseName: item.menuItemName || item.name,
      portionLabel: item.portionLabel || "",
      price: item.unitPrice || item.price,
      quantity: item.quantity
    }));
    const nextDraft = {
      ...defaultDraft,
      paymentMethod: lastOrder.paymentMethod,
      customerId: lastOrder.customerId || "",
      payments: lastOrder.payments?.length
        ? lastOrder.payments
        : [{ method: lastOrder.paymentMethod, amount: lastOrder.total }],
      notes: lastOrder.notes || ""
    };

    set({ cart: nextCart, billingDraft: nextDraft });
    saveBilling({ ...get(), cart: nextCart, billingDraft: nextDraft });
    return true;
  },
  repeatLastOrder() {
    return get().restoreLastOrder();
  },
  editLastOrder() {
    return get().restoreLastOrder();
  },
  setVoiceTranscript(value) {
    set({ voiceTranscript: value });
  },
  async parseVoiceOrder(transcript) {
    try {
      const { data } = await api.post("/ai/parse-order", { transcript });
      set({ voiceSuggestion: data.items, voiceTranscript: transcript });
      return data.items;
    } catch {
      const fallback = parseVoiceFallback(transcript, get().menu);
      set({ voiceSuggestion: fallback, voiceTranscript: transcript });
      return fallback;
    }
  },
  applyVoiceSuggestion() {
    const nextCart = get().voiceSuggestion.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    set({ cart: nextCart, voiceSuggestion: [] });
    saveBilling({ ...get(), cart: nextCart, voiceSuggestion: [] });
  },
  buildLocalOrder({ user }) {
    const draft = get().billingDraft;
    const items = get().cart.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      portionLabel: item.portionLabel || "",
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: item.price * item.quantity,
      estimatedCost: 0
    }));
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Math.max(Number(draft.discount || 0), 0);
    const total = Math.max(subtotal - discount, 0);

    return {
      clientOrderId: createUuid(),
      syncMeta: {
        entityType: "order",
        operation: "create",
        conflictPolicy: "client-order-idempotent",
        attemptCount: 0,
        lastAttemptAt: null,
        lastError: ""
      },
      orderNumber: `LOCAL-${Date.now().toString().slice(-6)}`,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
      localCreatedAt: new Date().toISOString(),
      deviceId: "browser-counter",
      items,
      subtotal,
      discount,
      total,
      paymentMethod: draft.paymentMethod,
      payments: draft.payments
        .map((payment) => ({ method: payment.method, amount: Number(payment.amount || 0) }))
        .filter((payment) => payment.amount > 0),
      customerId: draft.customerId || undefined,
      notes: draft.notes || "",
      source: get().voiceTranscript ? "voice" : "manual",
      syncStatus: "pending"
    };
  },
  async submitOrder({ user }) {
    const localOrder = get().buildLocalOrder({ user });
    const draft = get().billingDraft;

    if (!localOrder.items.length) throw new Error("Cart is empty");
    if (!localOrder.payments.length) throw new Error("Select a payment before completing the bill");
    if (Math.round(localOrder.payments.reduce((sum, payment) => sum + payment.amount, 0)) !== Math.round(localOrder.total)) {
      throw new Error("Payment total must match the bill total");
    }
    if (localOrder.payments.some((payment) => payment.method === "udhar") && !localOrder.customerId) {
      throw new Error("Udhar needs a customer");
    }

    const nextState = {
      offlineQueue: [localOrder, ...get().offlineQueue],
      recentOrders: [localOrder, ...get().recentOrders].slice(0, 50),
      lastCompletedOrder: localOrder,
      cart: [],
      billingDraft: { ...defaultDraft },
      voiceTranscript: "",
      voiceSuggestion: [],
      cartOwnerUserId: "",
      actionHistory: []
    };
    set(nextState);
    saveBilling({ ...get(), ...nextState });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOfflineMode: true });
      return { order: localOrder, offline: true };
    }

    try {
      const { data } = await api.post("/orders", {
        clientOrderId: localOrder.clientOrderId,
        deviceId: localOrder.deviceId,
        localCreatedAt: localOrder.localCreatedAt,
        items: localOrder.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          portionLabel: item.portionLabel || "",
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paymentMethod: localOrder.paymentMethod,
        payments: localOrder.payments,
        discount: localOrder.discount,
        customerId: localOrder.customerId,
        ownerPin: draft.ownerPin || undefined,
        notes: localOrder.notes,
        source: localOrder.source
      });

      const syncedOrder = { ...data, syncStatus: "synced" };
      const remainingQueue = get().offlineQueue.filter((order) => order.clientOrderId !== localOrder.clientOrderId);
      const nextOrders = replaceOrderInList(get().recentOrders, localOrder.clientOrderId, syncedOrder);
      set({
        offlineQueue: remainingQueue,
        recentOrders: nextOrders,
        lastCompletedOrder: syncedOrder,
        isOfflineMode: false
      });
      saveBilling({
        ...get(),
        offlineQueue: remainingQueue,
        recentOrders: nextOrders,
        lastCompletedOrder: syncedOrder
      });
      return { order: syncedOrder, offline: false };
    } catch {
      set({ isOfflineMode: true });
      return { order: localOrder, offline: true };
    }
  },
  async syncOfflineOrders() {
    if (get().syncInFlight) return 0;

    set({ syncInFlight: true });
    let synced = 0;
    const remaining = [];

    for (const order of get().offlineQueue) {
      try {
        order.syncMeta = {
          ...(order.syncMeta || {}),
          attemptCount: Number(order.syncMeta?.attemptCount || 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: ""
        };
        const { data } = await api.post("/orders", {
          clientOrderId: order.clientOrderId,
          deviceId: order.deviceId,
          localCreatedAt: order.localCreatedAt,
          items: order.items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            portionLabel: item.portionLabel || "",
            quantity: item.quantity,
            unitPrice: item.unitPrice
          })),
          paymentMethod: order.paymentMethod,
          payments: order.payments,
          discount: order.discount,
          customerId: order.customerId,
          notes: order.notes,
          source: order.source
        });
        const syncedOrder = { ...data, syncStatus: "synced" };
        synced += 1;
        set({
          recentOrders: replaceOrderInList(get().recentOrders, order.clientOrderId, syncedOrder)
        });
      } catch {
        remaining.push({
          ...order,
          syncMeta: {
            ...(order.syncMeta || {}),
            attemptCount: Number(order.syncMeta?.attemptCount || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
            lastError: "sync-failed"
          }
        });
      }
    }

    const nextState = {
      offlineQueue: remaining,
      syncInFlight: false,
      isOfflineMode: remaining.length > 0
    };
    set(nextState);
    saveBilling({ ...get(), ...nextState });
    await get().loadBootstrap().catch(() => {});
    return synced;
  },
  queueMutation(mutation) {
    const nextQueue = [...get().mutationQueue, mutation];
    set({ mutationQueue: nextQueue });
    saveMutationQueue(nextQueue);
  },
  replaceMutationRefs(tempId, realId) {
    const nextQueue = get().mutationQueue.map((mutation) => {
      const nextMutation = { ...mutation };
      if (nextMutation.entityId === tempId) {
        nextMutation.entityId = realId;
      }
      if (nextMutation.endpoint?.includes(tempId)) {
        nextMutation.endpoint = nextMutation.endpoint.replace(tempId, realId);
      }
      if (nextMutation.payload?.parentId === tempId) {
        nextMutation.payload = { ...nextMutation.payload, parentId: realId };
      }
      return nextMutation;
    });
    set({ mutationQueue: nextQueue });
    saveMutationQueue(nextQueue);
  },
  async syncMutationQueue() {
    if (!get().mutationQueue.length || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return 0;
    }

    let resolved = 0;
    const pending = [];

    for (const mutation of get().mutationQueue) {
      try {
        let response;
        if (mutation.method === "post") {
          response = await api.post(mutation.endpoint, mutation.payload);
        } else if (mutation.method === "patch") {
          response = await api.patch(mutation.endpoint, mutation.payload);
        } else if (mutation.method === "delete") {
          response = await api.delete(mutation.endpoint, { data: mutation.payload });
        } else {
          throw new Error(`Unsupported mutation method: ${mutation.method}`);
        }

        if (mutation.operation === "create" && mutation.tempId && response?.data?._id) {
          const realId = response.data._id;
          if (mutation.entityType === "menu") {
            const nextMenu = get().menu.map((item) => (item._id === mutation.tempId ? response.data : item));
            set({ menu: nextMenu });
            saveJson(STORAGE_KEYS.menu, nextMenu);
          }
          if (mutation.entityType === "category") {
            const nextCategories = get().categories.map((item) => (item._id === mutation.tempId ? response.data : item));
            set({ categories: nextCategories });
            saveJson(STORAGE_KEYS.categories, nextCategories);
          }
          get().replaceMutationRefs(mutation.tempId, realId);
        }

        resolved += 1;
      } catch (error) {
        const status = error?.response?.status;
        if (status === 409 && mutation.conflictPolicy === "name-last-write-wins") {
          pending.push({
            ...mutation,
            syncMeta: {
              ...(mutation.syncMeta || {}),
              attemptCount: Number(mutation.syncMeta?.attemptCount || 0) + 1,
              lastAttemptAt: new Date().toISOString(),
              lastError: "conflict-detected"
            }
          });
          await get().loadBootstrap().catch(() => {});
          continue;
        }

        pending.push({
          ...mutation,
          syncMeta: {
            ...(mutation.syncMeta || {}),
            attemptCount: Number(mutation.syncMeta?.attemptCount || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
            lastError: error?.response?.data?.message || error.message || "mutation-failed"
          }
        });
      }
    }

    set({ mutationQueue: pending });
    saveMutationQueue(pending);
    return resolved;
  },
  async addCustomer(payload) {
    await api.post("/customers", payload);
    const { data } = await api.get("/customers");
    set({ customers: data });
    saveJson(STORAGE_KEYS.customers, data);
  },
  async recordPayment(customerId, amount) {
    await api.post(`/customers/${customerId}/payment`, { amount });
    const { data } = await api.get("/customers");
    set({ customers: data });
    saveJson(STORAGE_KEYS.customers, data);
  },
  async addInventory(payload) {
    await api.post("/inventory", payload);
    const { data } = await api.get("/inventory");
    set({ inventory: data });
    saveJson(STORAGE_KEYS.inventory, data);
  },
  async addMenuItem(payload) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const tempId = `temp-menu-${createUuid()}`;
      const optimistic = {
        _id: tempId,
        ...payload,
        aliases: payload.aliases || [],
        portions: payload.portions || [],
        dayparts: payload.dayparts || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const nextMenu = [optimistic, ...get().menu].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      set({ menu: nextMenu, isOfflineMode: true });
      saveJson(STORAGE_KEYS.menu, nextMenu);
      get().queueMutation({
        id: createUuid(),
        entityType: "menu",
        operation: "create",
        method: "post",
        endpoint: "/menu",
        payload,
        tempId,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return optimistic;
    }

    const { data } = await api.post("/menu", payload);
    const nextMenu = [data, ...get().menu].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    set({ menu: nextMenu });
    saveJson(STORAGE_KEYS.menu, nextMenu);
    await get().loadCategories();
    return data;
  },
  async loadCategories() {
    const { data } = await api.get("/menu/categories");
    set({ categories: data });
    saveJson(STORAGE_KEYS.categories, data);
    return data;
  },
  async createCategory(payload) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const tempId = `temp-category-${createUuid()}`;
      const optimistic = {
        _id: tempId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const nextCategories = [...get().categories, optimistic].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      set({ categories: nextCategories, isOfflineMode: true });
      saveJson(STORAGE_KEYS.categories, nextCategories);
      get().queueMutation({
        id: createUuid(),
        entityType: "category",
        operation: "create",
        method: "post",
        endpoint: "/menu/categories",
        payload,
        tempId,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return optimistic;
    }

    const { data } = await api.post("/menu/categories", payload);
    const nextCategories = [...get().categories, data].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    set({ categories: nextCategories });
    saveJson(STORAGE_KEYS.categories, nextCategories);
    return data;
  },
  async updateCategory(categoryId, payload) {
    const existingCategory = get().categories.find((category) => category._id === categoryId);
    const nextPayload = {
      ...payload,
      baseUpdatedAt: payload.baseUpdatedAt || existingCategory?.updatedAt
    };
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const previous = existingCategory;
      const optimistic = previous ? { ...previous, ...payload } : null;
      const nextCategories = get()
        .categories.map((category) => (category._id === categoryId ? optimistic : category))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      const nextMenu =
        previous && payload.name && previous.name !== payload.name
          ? get().menu.map((item) => (item.category === previous.name ? { ...item, category: payload.name } : item))
          : get().menu;
      set({ categories: nextCategories, menu: nextMenu, isOfflineMode: true });
      saveJson(STORAGE_KEYS.categories, nextCategories);
      saveJson(STORAGE_KEYS.menu, nextMenu);
      get().queueMutation({
        id: createUuid(),
        entityType: "category",
        entityId: categoryId,
        operation: "update",
        method: "patch",
        endpoint: `/menu/categories/${categoryId}`,
        payload: nextPayload,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return optimistic;
    }

    const { data } = await api.patch(`/menu/categories/${categoryId}`, nextPayload);
    const previous = existingCategory;
    const nextCategories = get()
      .categories.map((category) => (category._id === categoryId ? data : category))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const nextMenu =
      previous && previous.name !== data.name
        ? get().menu.map((item) => (item.category === previous.name ? { ...item, category: data.name } : item))
        : get().menu;
    set({ categories: nextCategories, menu: nextMenu });
    saveJson(STORAGE_KEYS.categories, nextCategories);
    saveJson(STORAGE_KEYS.menu, nextMenu);
    return data;
  },
  async deleteCategory(categoryId, payload = {}) {
    const existingCategory = get().categories.find((category) => category._id === categoryId);
    const nextPayload = {
      ...payload,
      baseUpdatedAt: payload.baseUpdatedAt || existingCategory?.updatedAt
    };
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const nextCategories = get().categories.filter((category) => category._id !== categoryId);
      set({ categories: nextCategories, isOfflineMode: true });
      saveJson(STORAGE_KEYS.categories, nextCategories);
      get().queueMutation({
        id: createUuid(),
        entityType: "category",
        entityId: categoryId,
        operation: "delete",
        method: "delete",
        endpoint: `/menu/categories/${categoryId}`,
        payload: nextPayload,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return;
    }

    await api.delete(`/menu/categories/${categoryId}`, { data: nextPayload });
    const nextCategories = get().categories.filter((category) => category._id !== categoryId);
    set({ categories: nextCategories });
    saveJson(STORAGE_KEYS.categories, nextCategories);
  },
  async updateMenuItem(itemId, payload) {
    const existingItem = get().menu.find((item) => item._id === itemId);
    const nextPayload = {
      ...payload,
      baseUpdatedAt: payload.baseUpdatedAt || existingItem?.updatedAt
    };
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const optimistic = existingItem;
      const nextItem = optimistic ? { ...optimistic, ...payload } : optimistic;
      const nextMenu = get()
        .menu.map((item) => (item._id === itemId ? nextItem : item))
        .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      set({ menu: nextMenu, isOfflineMode: true });
      saveJson(STORAGE_KEYS.menu, nextMenu);
      get().queueMutation({
        id: createUuid(),
        entityType: "menu",
        entityId: itemId,
        operation: "update",
        method: "patch",
        endpoint: `/menu/${itemId}`,
        payload: nextPayload,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return nextItem;
    }

    const { data } = await api.patch(`/menu/${itemId}`, nextPayload);
    const nextMenu = get()
      .menu.map((item) => (item._id === itemId ? data : item))
      .sort((a, b) => a.category.localeCompare(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    set({ menu: nextMenu });
    saveJson(STORAGE_KEYS.menu, nextMenu);
    await get().loadCategories();
    return data;
  },
  async deleteMenuItem(itemId, payload = {}) {
    const existingItem = get().menu.find((item) => item._id === itemId);
    const nextPayload = {
      ...payload,
      baseUpdatedAt: payload.baseUpdatedAt || existingItem?.updatedAt
    };
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const nextMenu = get().menu.filter((item) => item._id !== itemId);
      set({ menu: nextMenu, isOfflineMode: true });
      saveJson(STORAGE_KEYS.menu, nextMenu);
      get().queueMutation({
        id: createUuid(),
        entityType: "menu",
        entityId: itemId,
        operation: "delete",
        method: "delete",
        endpoint: `/menu/${itemId}`,
        payload: nextPayload,
        conflictPolicy: "name-last-write-wins",
        syncMeta: { attemptCount: 0, lastAttemptAt: null, lastError: "" }
      });
      return;
    }

    await api.delete(`/menu/${itemId}`, { data: nextPayload });
    const nextMenu = get().menu.filter((item) => item._id !== itemId);
    set({ menu: nextMenu });
    saveJson(STORAGE_KEYS.menu, nextMenu);
  },
  async importMenu(csv, ownerPin) {
    const { data } = await api.post("/menu/import", {
      csv,
      ownerPin: ownerPin || undefined
    });
    await get().loadBootstrap();
    return data;
  },
  async exportMenu() {
    const response = await api.get("/menu/export", {
      responseType: "blob"
    });
    return response.data;
  },
  async addExpense(payload) {
    await api.post("/expenses", payload);
    const [expensesRes, dashboardRes] = await Promise.all([api.get("/expenses"), api.get("/dashboard/summary")]);
    set({ expenses: expensesRes.data, dashboard: dashboardRes.data });
    saveJson(STORAGE_KEYS.dashboard, dashboardRes.data);
  }
}));
