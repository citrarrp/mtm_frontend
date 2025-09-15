import { useState } from "react";
import Html5QrcodePlugin from "../components/QRScanner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment-timezone";
import api from "../utils/api";

export default function FinishPreparePage() {
  const [scanResult, setScanResult] = useState("");
  const [showScanner, setShowScanner] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const submitScan = async (odScan) => {
    if (!odScan) return alert("OD harus diisi!");
    try {
      const payload = {
        odScan,
        selectedDate: moment(selectedDate)
          .tz("Asia/Jakarta")
          .format("YYYY-MM-DD"),
      };

      const response = await api.put("/track/readyShipping", payload);
      setShowScanner(false);
      setScanResult(response.data.data);
      alert(response?.data?.message);
    } catch (error) {
      console.error("Gagal kirim ke server:", error);
      alert(error?.response?.data?.message || "Gagal submit scan");
      setScanResult("");
      setManualInput("");
    }
  };

  const onNewScanResult = (decodedText) => {
    setScanResult(decodedText);
    submitScan(decodedText); // langsung kirim hasil scan
  };

  const handleReset = () => {
    setScanResult("");
    setSelectedDate(new Date());
    setManualInput("");
    setShowScanner(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Scan OD Ready To Shipping
        </h1>

        <div className="flex items-center justify-between mb-6 space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Pilih Tanggal:
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="yyyy-MM-dd"
              className="border rounded p-2"
              maxDate={tomorrow}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              className={`px-4 py-2 rounded ${
                showScanner ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setShowScanner(true)}
            >
              Scan QR
            </button>
            <button
              className={`px-4 py-2 rounded ${
                !showScanner ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
              onClick={() => setShowScanner(false)}
            >
              Input Manual
            </button>
          </div>
        </div>

        {showScanner && (
          <div className="mb-6">
            <Html5QrcodePlugin
              fps={10}
              qrbox={250}
              disableFlip={false}
              qrCodeSuccessCallback={onNewScanResult}
            />
          </div>
        )}

        {!showScanner && (
          <div className="mb-6 flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Masukkan OD secara manual"
              className="border rounded p-2 flex-1"
            />
            <button
              onClick={() => submitScan(manualInput)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Submit
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Hasil Scan:</h2>
          <p className="text-gray-600">
            {scanResult || "Belum ada hasil scan."}
          </p>
        </div>

        {scanResult && (
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            >
              Scan Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
