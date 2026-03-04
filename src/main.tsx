import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import App from "./App";
import { ModalProvider } from "./contexts/ModalContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ModalProvider>
      <App />
    </ModalProvider>
  </React.StrictMode>,
);
