import { useContext, useRef } from "react";
import { AuthContext } from "../context/auth.js";
import { useEffect, useState } from "react";
import api from "../utils/api";
import moment from "moment-timezone";
import { useReactToPrint } from "react-to-print";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistoryPage() {
  const { user } = useContext(AuthContext);

  const [absensiData, setAbsensiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const contentRef = useRef(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    const fetchAbsensiData = async () => {
      try {
        setLoading(true);
        const dateStr = moment(selectedDate).format("YYYY-MM-DD");
        const response = await api.get(`/absensi/all?tanggal=${dateStr}`);

        if (response.data.data && response.data.data.length > 0) {
          setAbsensiData(response.data.data);
        } else {
          setAbsensiData([]);
          setError("No data found for the selected date");
        }
      } catch (err) {
        setError(err.message);
        setError(err.response?.data?.message || "Failed to fetch data");
        setAbsensiData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAbsensiData();
  }, [selectedDate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  };

  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    pageStyle: `
      @page { size: auto; margin: 2mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f9fafb !important; }
        tr { page-break-inside: avoid; }
      }
    `,
    contentRef: contentRef,
    onPrintError: (error) => {
      console.error("Print error:", error);
      alert("Terjadi kesalahan saat mencetak dokumen.");
    },
    documentTitle: "Laporan Print",
    removeAfterPrint: true,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "On Time":
        return "bg-green-100 text-green-800";
      case "Delay":
        return "bg-red-100 text-red-800";
      case "Advanced":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  function datetoUTCtoLocal(waktu) {
    return moment.tz(waktu, "Asia/Jakarta").format("HH:mm");
  }

  if (!user) {
    return (
      <div className="flex space-x-3 p-4 bg-white/30 backdrop-blur-sm rounded-xl">
        <div className="h-4 w-4 bg-blue-500/80 rounded-full animate-bounce backdrop-blur-sm"></div>
        <div
          className="h-4 w-4 bg-blue-400/80 rounded-full animate-bounce backdrop-blur-sm"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="h-4 w-4 bg-blue-300/80 rounded-full animate-bounce backdrop-blur-sm"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
    );
  }

  const groupedData = absensiData.reduce((acc, item) => {
    if (!acc[item.destination]) {
      acc[item.destination] = [];
    }
    acc[item.destination].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Riwayat Absensi Truk</h1>

      <div className="mb-4">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="yyyy-MM-dd"
          className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          maxDate={new Date()}
          placeholderText="Pilih tanggal"
          showYearDropdown
          dropdownMode="select"
        />
      </div>

      <div className="bg-white shadow overflow-hidden">
        <div ref={contentRef}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Truck
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tanggal
                </th>
                <th
                  colSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Kedatangan Truk
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  colSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Keberangkatan Truk
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cycle
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tujuan
                </th>
                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Jenis
                </th>

                <th
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Hasil
                </th>
              </tr>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Aktual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu Aktual
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center">
                    Memuat Data...
                  </td>
                </tr>
              ) : absensiData.length > 0 ? (
                Object.entries(groupedData).map(([customer]) => {
                  const inScan = groupedData[customer].find(
                    (item) => item.scanType === "In"
                  );
                  const outScan = groupedData[customer].find(
                    (item) => item.scanType === "Out"
                  );

                  return (
                    <tr key={customer} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {inScan?.truckName || outScan?.truckName || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inScan ? formatDate(inScan?.createdAt) : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inScan ? datetoUTCtoLocal(inScan?.waktuStandar) : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inScan ? formatTime(inScan?.timestamp) : ""}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {inScan && (
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              inScan?.status
                            )}`}
                          >
                            {inScan?.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {outScan ? datetoUTCtoLocal(outScan?.waktuStandar) : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {outScan ? formatTime(outScan?.timestamp) : ""}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {outScan && (
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              outScan?.status
                            )}`}
                          >
                            {outScan?.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        C{inScan?.cycleNumber || outScan?.cycleNumber || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inScan?.typeTruck || outScan?.typeTruck || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(outScan && outScan?.status === "On Time") ||
                        outScan?.status === "Advanced" ? (
                          <span
                            className={
                              "inline-flex text-[13px] leading-5 font-semibold bg-green-500 rounded-xl w-[80px] p-1 justify-center text-white"
                            }
                          >
                            GOOD
                          </span>
                        ) : (
                          <span
                            className={
                              "inline-flex text-[13px] w-[80px] leading-5 font-semibold bg-red-500 rounded-xl text-white px-2 py-1 justify-center"
                            }
                          >
                            NOT GOOD
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center">
                    {error ? error : "Tidak ada data absensi"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Total {Math.round(absensiData.length / 2)} absensi
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Cetak Laporan
        </button>
      </div>
    </div>
  );
}
