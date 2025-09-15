import React, { useContext } from "react";
import ChangePassword from "../components/form/changePw.jsx";
import { AuthContext } from "../context/auth.js";

const ChangePasswordPage = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <p className="text-center text-red-500">Anda tidak terdaftar!</p>;
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Ubah Password</h1>
      <ChangePassword userId={user.id} />
    </div>
  );
};

export default ChangePasswordPage;
