import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const getEventName = (tenantId) => `tenant:${tenantId}`;

export const publishTenantEvent = (tenantId, event) => {
  if (!tenantId) return;
  emitter.emit(getEventName(String(tenantId)), {
    type: event?.type || "update",
    at: new Date().toISOString(),
    payload: event?.payload || {}
  });
};

export const subscribeTenantEvents = (tenantId, listener) => {
  const eventName = getEventName(String(tenantId));
  emitter.on(eventName, listener);
  return () => emitter.off(eventName, listener);
};
