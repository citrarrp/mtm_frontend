import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import * as XLSX from "xlsx";
import api from "../../utils/api";
import { FaUser, FaEye, FaEyeSlash, FaKey } from "react-icons/fa";
import { TbNumber123 } from "react-icons/tb";

const userSchema = z.object({
  fullname: z.string().min(5, { message: "fullname minimal 5 karakter" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
  npk: z
    .string()
    .min(4, { message: "NPK harus 4 karakter" })
    .max(4, { message: "NPK harus 4 karakter" }),
  position: z.string().default("Staff"),
  dept: z.string().default("PPIC"),
});

const Register = ({ onRegister }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullname: "",
      npk: "",
      password: "",
      position: "Staff",
      dept: "PPIC",
    },
  });

  const onSubmit = async (data) => {
    const result = await onRegister(data);
    alert(result.message);
    onRegister();

    if (result.success) reset();
  };

  const handleKirim = async (e) => {
    e.preventDefault();
    if (excelData.length === 0) return;
    else {
      setIsUploading(true);
      setUploadProgress(0);

      const totalRows = excelData.length;
      let successfulUploads = 0;

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        try {
          const res = await api.post(
            "/user/auth/register",
            JSON.stringify(row)
          );

          if (res?.data.success) {
            successfulUploads++;
          } else {
            throw new Error("Gagal upload baris");
          }
        } catch (err) {
          console.error("Upload error:", err);
        } finally {
          setUploadProgress(Math.round(((i + 1) / totalRows) * 100));
        }
      }
      setIsUploading(false);
      alert(
        `Upload selesai! ${successfulUploads} dari ${totalRows} data berhasil diunggah.`
      );
    }
  };

  const fieldMapping = {
    NPK: "npk",
    "Full Name": "fullname",
    Position: "position",
    Departement: "dept",
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      const wb = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws);

      const mappedData = rawData.map((row) => {
        const mappedRow = {};
        for (const [excelKey, mongoKey] of Object.entries(fieldMapping)) {
          mappedRow[mongoKey] = row[excelKey]
            ? String(row[excelKey])
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : "";
          mappedRow["password"] = "MTM";
        }
        return mappedRow;
      });

      setExcelData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleReset = () => {
    setExcelData([]);
    setFileName("");
    // Reset file input
    document.getElementById("dropzone-file").value = "";
  };

  return (
    <>
      <div className="flex justify-center items-center h-auto">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 rounded shadow-lg w-3xl"
        >
          <h2 className="text-2xl font-bold mb-4">Tambah User</h2>

          <div className="relative mb-4">
            <span
              className={`absolute left-2 transform ${
                errors.fullname ? "top-1/3" : "top-1/2"
              } -translate-y-1/2 text-gray-400`}
            >
              <FaUser />
            </span>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-400 rounded-lg outline-none"
              {...register("fullname")}
            />
            {errors.fullname && (
              <p className="text-red-500 text-sm mt-1">
                {errors.fullname.message}
              </p>
            )}
          </div>
          <div className="relative mb-4">
            <span
              className={`absolute left-2 transform ${
                errors.npk ? "top-1/3" : "top-1/2"
              } -translate-y-1/2 text-gray-400`}
            >
              <TbNumber123 size={25} />
            </span>
            <input
              type="text"
              placeholder="NPK"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-400 rounded-lg outline-none"
              {...register("npk")}
            />
            {errors.npk && (
              <p className="text-red-500 text-sm mt-1">{errors.npk.message}</p>
            )}
          </div>
          <div className="relative mb-4">
            <span
              className={`absolute left-2 transform ${
                errors.password ? "top-1/3" : "top-1/2"
              } -translate-y-1/2 text-gray-400`}
            >
              <FaKey />
            </span>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-400 rounded-lg outline-none"
              {...register("password")}
            />
            <div>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="relative mb-4">
            <select
              className="p-2 w-full border border-gray-300 rounded"
              {...register("position")}
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
              <option value="Leader">Leader</option>
            </select>
          </div>
          <div className="relative mb-4">
            <select
              className="p-2 w-full border border-gray-300 rounded"
              {...register("dept")}
            >
              <option value="PPIC">PPIC</option>
              <option value="Production I">Production I</option>
              <option value="Production II">Production II</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full hover:bg-[#105bdf] bg-[#2c64c7] rounded text-white p-2 cursor-pointer"
          >
            Tambah
          </button>
        </form>
      </div>
      <div className="p-3 flex justify-center text-lg text-gray-800/55 ">
        <h1>or upload file</h1>
      </div>
      <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-md cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-4 text-[#2c64c7]"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 16"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                />
              </svg>
              <h1 className="mb-2 text-xl text-gray-700 font-semibold">
                <span className="text-blue-600">Click to upload</span> or drag
                and drop
              </h1>
              <p className="text-lg text-gray-500">
                .xlsx atau .xls (Max. 10MB)
              </p>
              {fileName && (
                <p className="mt-2 text-sm text-blue-600 font-medium">
                  File selected: {fileName}
                </p>
              )}
            </div>
            <input
              id="dropzone-file"
              type="file"
              className="hidden"
              onChange={handleFile}
              accept=".xlsx, .xls"
            />
          </label>

          {fileName && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleReset}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  ></path>
                </svg>
                Hapus File
              </button>
            </div>
          )}
        </div>

        {excelData.length > 0 && (
          <div className="mb-6">
            <div className="overflow-x-auto border rounded-lg max-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(excelData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {Object.values(row).map((val, j) => (
                        <td
                          key={j}
                          className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate"
                          title={String(val)}
                        >
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-500">
                <span className="text-s">Menampilkan 5 baris pertama </span>
                dari ({excelData.length} rows)
              </p>
            </div>
          </div>
        )}
        {isUploading && (
          <div className="mb-6">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">
                Mengunggah...
              </span>
              <span className="text-sm font-medium text-blue-700">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        {excelData.length > 0 && (
          <div className="flex justify-end gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
            <button
              onClick={handleKirim}
              disabled={isUploading}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isUploading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isUploading ? "Mengunggah..." : "Submit"}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Register;
