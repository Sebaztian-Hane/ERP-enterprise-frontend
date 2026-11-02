import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { SystemNotificationsProvider } from "./components/SystemNotifications";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><SystemNotificationsProvider><App /></SystemNotificationsProvider></AuthProvider>
  </StrictMode>,
);
