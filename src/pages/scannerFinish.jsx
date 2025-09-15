import { useState } from "react";
// import Html5QrcodePlugin from "../components/QRScanner";
import api from "../utils/api";

export default function ScanFinishPage() {
  const [scanResult, setScanResult] = useState("");
  const [result, setResult] = useState([]);
  // const [showScanner, setShowScanner] = useState(true);
  const submitScan = async (data) => {
    try {
      const response = await api.put("/track/ready", { code: data });
      setResult(response.data.data);
      // setShowScanner(false);
      alert(response.data.message);
    } catch (error) {
      console.error("Gagal kirim ke server:", error);
      console.log(error);
      alert(error.response.data.message);
      setScanResult("");
    }
  };

  //   const onNewScanResult = (decodedText, decodedResult) => {
  //     console.log("App [result]", decodedResult);
  //     setScanResult(decodedText);
  //     console.log(decodedResult);

  // const onNewScanResult = (decodedText, decodedResult) => {
  //   try {
  //     console.log("App [result]", decodedResult);
  //     setScanResult(decodedText);
  //     console.log(decodedResult);
  //   } catch (error) {
  //     console.log("Bukan JSON valid, hasil mentah:", error);
  //     setScanResult("");
  //   }
  // };

  //   try {
  //     const parsed = JSON.parse(decodedText);
  //     console.log(parsed, decodedText, "hasil decoded");
  //     setParsedResult(parsed);
  //   } catch (error) {
  //     console.error("Gagal parsing hasil scan", error);
  //     setParsedResult(null);
  //   }
  // };

  // useEffect(() => {
  //   if (scanResult) {
  //     console.log(scanResult);
  //     submitScan(scanResult);
  //   }
  // }, [scanResult]);

  const handleReset = () => {
    setScanResult("");
    // setShowScanner(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
        {/* <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Scan QR untuk Finish Preparation
        </h1> */}
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Verifikasi Finish Preparation
        </h1>

        <div className="flex items-center justify-between w-[450px] p-2 gap-1 mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Masukkan kode verifikasi..."
              className="border rounded p-2 pl-2 w-64"
              value={scanResult}
              onChange={(e) => setScanResult(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <button
              className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              onClick={() => submitScan(scanResult)}
            >
              Cek Kode Verifikasi
            </button>
          </div>
        </div>

        {/* {showScanner && ( */}
        {/* <div className="mb-6">
            <Html5QrcodePlugin
              fps={10}
              qrbox={250}
              disableFlip={false}
              qrCodeSuccessCallback={onNewScanResult}
            />
          </div> */}
        {/* )} */}

        <div className="text-center my-6">
          {scanResult && result.length > 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">Hasil Scan:</h2>
              <div className="text-left bg-gray-100 p-4 rounded-md shadow-inner">
                <h3>{result}</h3>
              </div>
            </>
          ) : (
            <p className="text-gray-600">{"Belum ada hasil verifikasi."}</p>
          )}
        </div>
        {scanResult && result.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            >
              Verifikasi Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
