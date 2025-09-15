import {  useState } from "react";
import api from "../utils/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function ScanFinishPage() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [dnNumber, setDnNumber] = useState("");
  const [result, setResult] = useState("");

  const handleClickDate = async (date) => {
    setSelectedDate(date);
    if (!date) return;

    try {
      const res = await api.get("/track/ready", {
        params: { tanggal: date.toISOString().split("T")[0] },
      });

      const customers = [
        ...new Set(res.data.data?.map((t) => t.customerId?.nama)),
      ].filter(Boolean);
      setCustomers(customers);
    } catch (err) {
      console.error("Gagal ambil customer:", err);
      setCustomers([]);
    }
  };

  const submitVerification = async () => {
    try {
      const res = await api.post("/track/readytoshipping", {
        dnNumber,
      })
      setResult(res.data.message);
      alert(res.data.message);
    } catch (err) {
      console.error("Gagal:", err);
      alert(err.response?.data?.message || "Terjadi kesalahan");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-700">
          Verifikasi Ready to Shipping
        </h1>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-800 mb-1">
            Tanggal
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={handleClickDate}
            dateFormat="yyyy-MM-dd"
            className="w-full p-2 border rounded"
            placeholderText="Pilih tanggal"
          />
        </div>

        {selectedDate && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-800 mb-1">
              Customer
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Pilih Customer</option>
              {customers.map((cst) => (
                <option key={cst} value={cst}>
                  {cst}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCustomer && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-800 mb-1">
              DN Number
            </label>
            <input
              type="text"
              placeholder="Masukkan DN Number..."
              className="border rounded p-2 w-full"
              value={dnNumber}
              onChange={(e) => setDnNumber(e.target.value)}
            />
          </div>
        )}

        <button
          className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          onClick={submitVerification}
          disabled={!dnNumber || !selectedCustomer}
        >
          Submit
        </button>

        <div className="text-center my-6">
          {result ? (
            <div className="bg-gray-100 p-4 rounded">{result}</div>
          ) : (
            <p className="text-gray-600">Belum ada hasil verifikasi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
