import { useForm } from "react-hook-form";
import api from "../../utils/api";

const ChangePassword = ({ userId }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await api.put(`/user/update-password/${userId}`, data);
      alert(res.data.message);
      reset();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal update password");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      <div>
        <label
          htmlFor="oldPassword"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password Lama
        </label>
        <input
          id="oldPassword"
          type="password"
          {...register("oldPassword", {
            required: "Password lama wajib diisi",
          })}
          placeholder="Masukkan password lama"
          className={`border rounded-md p-2 w-full focus:ring-2 focus:ring-blue-700 focus:border-blue-700 ${
            errors.oldPassword ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.oldPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.oldPassword.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password Baru
        </label>
        <input
          id="newPassword"
          type="password"
          {...register("newPassword", {
            required: "Password baru wajib diisi",
            minLength: {
              value: 6,
              message: "Password minimal 6 karakter",
            },
          })}
          placeholder="Masukkan password baru"
          className={`border rounded-md p-2 w-full focus:ring-2 focus:ring-blue-700 focus:border-blue-700 ${
            errors.newPassword ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.newPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Konfirmasi Password Baru
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword", {
            required: "Konfirmasi password wajib diisi",
            validate: (value) =>
              value === watch("newPassword") || "Password tidak cocok",
          })}
          placeholder="Konfirmasi password baru"
          className={`border rounded-md p-2 w-full focus:ring-2 focus:ring-blue-5700 focus:border-blue-700 ${
            errors.confirmPassword ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.confirmPassword?.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isSubmitting
            ? "bg-blue-500 cursor-not-allowed"
            : "bg-[#2c64c7] hover:bg-blue-800"
        } transition-colors`}
      >
        {isSubmitting ? "Memproses..." : "Ubah Password"}
      </button>
    </form>
  );
};

export default ChangePassword;
