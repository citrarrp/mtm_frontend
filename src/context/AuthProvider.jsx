import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { AuthContext } from "./auth.js";
import axios from "axios";
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    sessionStorage.getItem("accessToken") || ""
  );
  const [loading, setLoading] = useState(true);
  const storeAccessToken = (accessToken) => {
    sessionStorage.setItem("accessToken", accessToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    setToken(accessToken);
  };

  const tryRefreshToken = useCallback(async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/auth/refresh-token`,
        {},
        { withCredentials: true }
      );
      const { accessToken } = res.data;
      storeAccessToken(accessToken);
      return true;
    } catch (err) {
      console.error("Gagal refresh token:", err);
      return false;
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get("/user/auth/me");
      setUser(data.user);
      return true;
    } catch (err) {
      console.warn("Err", err);
      return false;
    }
  };

  useEffect(() => {
    const authenticate = async () => {
      if (token) {
        const isUserValid = await fetchUser();
        if (!isUserValid) {
          sessionStorage.removeItem("accessToken");
          setToken("");
        }
        setLoading(false);
      } else {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          await fetchUser();
        } else {
          logout();
        }
        setLoading(false);
      }
    };

    authenticate();
  }, [token, tryRefreshToken]);

  const login = async (npk, password) => {
    try {
      const res = await api.post("/user/auth/login", { npk, password });
      const { accessToken } = res.data.data;
      storeAccessToken(accessToken);
      await fetchUser();
    } catch (error) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await api.post("/user/auth/logout", {});
    } catch (err) {
      console.error("Error: ", err);
    }
    sessionStorage.removeItem("accessToken");
    setLoading(false);
    setToken("");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
