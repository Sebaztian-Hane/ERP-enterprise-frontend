import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { SystemNotificationsProvider } from "./components/SystemNotifications";
import { ActionConfirmationProvider } from "./components/ActionConfirmationProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><SystemNotificationsProvider><ActionConfirmationProvider><App /></ActionConfirmationProvider></SystemNotificationsProvider></AuthProvider>
  </StrictMode>,
);
