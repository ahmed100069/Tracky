import React from "react";
import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { useAppStore } from "./store/appStore.js";
import "./styles.css";

function AppBootstrap() {
  const hydrateFromStorage = useAppStore((state) => state.hydrateFromStorage);
  const syncOfflineOrders = useAppStore((state) => state.syncOfflineOrders);
  const syncMutationQueue = useAppStore((state) => state.syncMutationQueue);

  useEffect(() => {
    hydrateFromStorage().catch(() => {});
  }, [hydrateFromStorage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        syncOfflineOrders().catch(() => {});
        syncMutationQueue().catch(() => {});
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [syncMutationQueue, syncOfflineOrders]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  </React.StrictMode>
);
