import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initThemeCustomization } from "./components/settings/ThemeCustomizer";

// Apply saved theme (color + density) before first render
initThemeCustomization();

createRoot(document.getElementById("root")!).render(<App />);
