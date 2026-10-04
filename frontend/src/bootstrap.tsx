import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "./index.css";
import RootApp from "./RootApp";

export function mountApplication(root: HTMLElement) {
  root.replaceChildren();
  createRoot(root).render(
    <StrictMode>
      <RootApp />
    </StrictMode>,
  );
}
