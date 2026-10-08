import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/glass.css";
import "./styles/screens.css";
import "./styles/app.css";
import "./styles/animations.css";

const container = document.getElementById("root");

if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
