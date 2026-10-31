import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../remotion/fonts";
import "../styles/tokens.css";
import "../styles/global.css";
import "../styles/experience.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
