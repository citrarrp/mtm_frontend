import Register from "../components/form/register";
import TableUser from "../components/tableUser";
import api from "../utils/api";
import { useState, useEffect } from "react";

export default function RegisterPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setError("");
    try {
      setLoading(true);
      const res = await api.get("/user");
      setUsers(res.data.data);
    } catch (err) {
      setError("Gagal memuat data user", err);
    } finally {
      setLoading(false);
    }
  };

  

  const handleRegister = async (userData) => {
    try {
      const data = await api.post("/user/auth/register", userData);
      if (data.data.success) {
        await fetchUsers();
        return { success: true, message: "Registrasi berhasil!" };
      } else {
        return {
          success: false,
          message: data.message || "Gagal mengambil data!",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registrasi gagal",
      };
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const data = await api.delete(`/user/${userId}`);
      if (data.data.success) {
        await fetchUsers();
        return { success: true, message: "User berhasil dihapus!" };
      } else {
        return {
          success: false,
          message: data.message || "Gagal mengambil data!",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Gagal menghapus user",
      };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <Register onRegister={handleRegister} />
      <TableUser
        users={users}
        onDeleteUser={handleDeleteUser}
        loading={loading}
        error={error}
      />
    </div>
  );
}
