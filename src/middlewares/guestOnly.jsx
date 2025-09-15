import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth";

const GuestOnly = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

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

  return user ? <Navigate to="/" /> : children;
};

export default GuestOnly;
