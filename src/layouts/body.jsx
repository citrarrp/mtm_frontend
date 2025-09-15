import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../components/sideBar.jsx";
import { useContext } from "react";
import { AuthContext } from "../context/auth.js";
import { SidebarContext } from "../context/sidebar-context.js";

export default function MainLayout() {
  const { user, loading } = useContext(AuthContext);
  const { isOpen } = useContext(SidebarContext);

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
        <div className="flex space-x-3 p-4 rounded-xl">
          <div className="h-4 w-4 bg-blue-500/80 rounded-full animate-bounce"></div>
          <div
            className="h-4 w-4 bg-blue-400/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="h-4 w-4 bg-blue-300/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    );

  return user ? (
    <>
      <Sidebar />
      <main className={`${isOpen ? "ml-64" : "ml-20"} p-4 mt-6`}>
        <Outlet />
      </main>
    </>
  ) : (
    <Navigate to="/login" />
  );
}
