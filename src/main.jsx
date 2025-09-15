import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import LabelProvider from "./libs/labelProvider.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import { SidebarProvider } from "./context/sidebar.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <LabelProvider>
        {/* <SearchProvider> */}
        <SidebarProvider>
          <App />
        </SidebarProvider>
      </LabelProvider>
    </AuthProvider>
    {/* </SearchProvider> */}
  </StrictMode>
);
