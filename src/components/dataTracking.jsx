import { useEffect, useState } from "react";
import api from "../utils/api";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";

export default function DataTrackingTable() {
  const [dataCust, setDataCust] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { customerId, cycleNumber } = useParams();
  const [processes, setProcesses] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (updatedItem) => {
    try {
      await api.put(`/track/keterangan/${updatedItem._id}`, {
        nama: updatedItem.nama,
        ket: updatedItem.ket,
      });

      setDataCust((prev) =>
        prev.map((item) =>
          item._id === updatedItem._id
            ? { ...item, ket: updatedItem.ket }
            : item
        )
      );

      closeModal();
    } catch (error) {
      console.error("Gagal update keterangan:", error);
    }
  };

  const handleCheckboxChange = (prosesName, dnNumber, item) => async (e) => {
    const isChecked = e.target.checked;
    const key = `${prosesName}-${dnNumber}`;

    if (item?.waktuAktual) return;

    if (isChecked) {
      const formattedTime = moment().format("YYYY-MM-DD HH:mm:ss");
      const waktuStandar = moment(item.waktuStandar);
      const waktuAktual = moment(formattedTime);
      const diffMinutes = waktuAktual.diff(waktuStandar, "minutes");

      let delayText = "";
      let status = "";

      if (diffMinutes > 0) {
        delayText = `-${diffMinutes} menit`;
        status = "Delay";
      } else if (diffMinutes < 0) {
        delayText = `+${Math.abs(diffMinutes)} menit`;
        status = "Advanced";
      } else {
        delayText = "0 menit";
        status = "On Time";
      }

      setProcesses((prev) => ({
        ...prev,
        [key]: {
          checked: true,
          ...prev[key],
          time: moment().format("HH:mm"),
          delay: delayText,
          status: status,
        },
      }));

      try {
        await api.post("/track/check", {
          id: item._id,
          dn: dnNumber,
          proses: prosesName,
          waktuAktual: formattedTime,

        });
      } catch (err) {
        console.error("Gagal kirim ke /track:", err);
      }
    }

    setProcesses((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        checked: isChecked,
      },
    }));
  };

  const proses = [
    "Received Order",
    "Waiting Post",
    "Start Preparation (Pulling)",
    "Inspection",
    "Finish Preparation",
    "Ready to Shipping Area",
    "Create Surat Jalan",
    "Arrived Truck",
    "Departure Truck",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const formattedDate = moment
          .tz(selectedDate, "Asia/Jakarta")
          .format("YYYY-MM-DD");
        const response = await api.get(
          `/track/${customerId}/${cycleNumber}?tanggal=${formattedDate}`
        );

        if (response.data.data && response.data.data.length > 0) {
          setDataCust(response.data.data);
        } else {
          setDataCust([]);
          setError("No data found for the selected date");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch data");
        setDataCust([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, cycleNumber, selectedDate]);

  const groupByDN = (data) => {
    const grouped = {};
    data.forEach((item) => {
      if (!grouped[item.dnNumber]) {
        grouped[item.dnNumber] = [];
      }
      grouped[item.dnNumber].push(item);
    });
    return grouped;
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const groupedData = groupByDN(dataCust);

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    if (/^\d{2}:\d{2}$/.test(dateString)) return dateString;
    return moment.tz(dateString, "Asia/Jakarta").format("HH:mm");
  };

  const filteredProses = proses.filter((prosesName) =>
    prosesName.trim().toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Tracking</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari proses..."
              className="border rounded p-2 pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Pilih Tanggal :
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) =>
                setSelectedDate(moment.tz(date, "Asia/Jakarta"))
              }
              dateFormat="yyyy-MM-dd"
              className="border rounded p-2"
              maxDate={tomorrow}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && Object.keys(groupedData).length === 0 && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Data Tidak Ditemukan
        </div>
      )}

      {!loading && Object.keys(groupedData).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedData).map(([dnNumber, items]) => (
            <div
              key={dnNumber}
              className="border rounded-lg shadow-sm overflow-hidden"
            >
              <div className=" px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">DN Number: {dnNumber}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Proses
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu Standar
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu Aktual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delay
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProses.map((prosesName, idx) => {
                      const item = items.find((i) =>
                        prosesName.trim().includes(i.nama.trim())
                      );
                      return (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-4 py-3  text-sm text-gray-500">
                            <input
                              type="checkbox"
                              className={"h-4 w-4 text-blue-600 rounded"}
                              checked={
                                processes[`${prosesName}-${dnNumber}`]
                                  ?.checked || item?.waktuAktual
                              }
                              onChange={handleCheckboxChange(
                                prosesName,
                                dnNumber,
                                item
                              )}
                            />
                          </td>
                          <td className="px-4 py-3  text-sm font-medium text-gray-900">
                            {prosesName}
                          </td>
                          <td className="px-4 py-3  text-sm text-gray-500">
                            {formatTime(item?.waktuStandar)}
                          </td>
                          <td className="px-4 py-3  text-sm text-gray-500">
                            {item?.waktuAktual
                              ? formatTime(item?.waktuAktual)
                              : processes[`${prosesName}-${dnNumber}`]
                              ? processes[`${prosesName}-${dnNumber}`].time
                              : ""}
                          </td>
                          <td className="px-4 py-3  text-sm text-gray-500">
                            {item?.delay ||
                              (processes[`${prosesName}-${dnNumber}`]
                                ? processes[`${prosesName}-${dnNumber}`].delay
                                : "-") ||
                              " "}
                          </td>
                          <td className="px-4 py-3 ">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                processes[`${prosesName}-${dnNumber}`]
                                  ?.status === "On Time" ||
                                item?.status === "On Time"
                                  ? "bg-green-100 text-green-800"
                                  : processes[`${prosesName}-${dnNumber}`]
                                      ?.status === "Delay" ||
                                    item?.status === "Delay"
                                  ? "bg-red-100 text-red-800"
                                  : processes[`${prosesName}-${dnNumber}`]
                                      ?.status === "Advanced" ||
                                    item?.status === "Advanced"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {item?.status === "-"
                                ? processes[`${prosesName}-${dnNumber}`]
                                  ? processes[`${prosesName}-${dnNumber}`]
                                      .status
                                  : ""
                                : item?.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center group">
                              <span
                                className={`text-sm ${
                                  item?.ket === "-"
                                    ? "text-gray-400 italic"
                                    : "text-gray-600"
                                }`}
                              >
                                {item?.ket === "-"
                                  ? "Tidak ada keterangan"
                                  : item.ket}
                              </span>
                              <button
                                onClick={() => openEditModal(item)}
                                className="ml-2 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Edit Keterangan
              </h2>
              <p className="text-sm text-gray-500">
                Update the description below
              </p>
            </div>

            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={4}
              placeholder="Masukkan keterangan..."
              value={editingItem?.ket || ""}
              onChange={(e) =>
                setEditingItem({ ...editingItem, ket: e.target.value })
              }
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleSave(editingItem)}
                className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
