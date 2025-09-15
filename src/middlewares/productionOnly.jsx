import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth";

const ProductionHome = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  return String(user.dept).toLowerCase().includes("production") ? (
    <Navigate to="/printLabel" />
  ) : (
    children
  );
};

export default ProductionHome;
