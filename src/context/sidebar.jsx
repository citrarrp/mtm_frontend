import { useEffect, useState } from "react";
import { SidebarContext } from "./sidebar-context.js";

export function SidebarProvider({ children }) {
  // Baca dari localStorage saat inisialisasi
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-open");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return true;
  });

  // Simpan ke localStorage setiap kali isOpen berubah
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-open", JSON.stringify(isOpen));
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-open", JSON.stringify(isOpen));
    }
  }, [isOpen]);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
