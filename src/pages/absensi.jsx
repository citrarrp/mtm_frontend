import React, { useCallback, useEffect, useState } from "react";
import CryptoJS from "crypto-js";
import api from "../utils/api";
import DatePicker from "react-datepicker";
import { FaTimes, FaCheck } from "react-icons/fa";

const AbsensiInPage = () => {
  const [milkrunOrDirect, setMilkrunOrDirect] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [scanType, setScanType] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    const fetchTruck = async () => {
      try {
        const res = await api.get("/trucks");

        setTrucks(res.data.data);
      } catch (err) {
        console.error("Gagal mengambil data", err);
      }
    };
    fetchTruck();
  }, []);

  useEffect(() => {
    if (!milkrunOrDirect) {
      setFilteredTrucks([]);
      return;
    }

    const filtered = trucks.filter(
      (tr) => tr.typeTruck.toLowerCase() === milkrunOrDirect.toLowerCase()
    );
    setFilteredTrucks(filtered);
    setSelectedTruck("");
    setSelectedCustomer("");
  }, [milkrunOrDirect, trucks]);

  const truckPartners = [
    ...new Set(filteredTrucks.map((truck) => truck.partnerName)),
  ];

  useEffect(() => {
    if (!selectedTruck) {
      setCustomers([]);
      return;
    }

    const customersForTruck = filteredTrucks
      .filter((truck) => truck.partnerName === selectedTruck)
      .map((truck) => truck.destination);

    setCustomers([...new Set(customersForTruck)]);
    setSelectedCustomer("");
  }, [selectedTruck, filteredTrucks]);

  useEffect(() => {
    const fetchCycles = async () => {
      if (!selectedCustomer && !milkrunOrDirect && !selectedTruck) {
        setCycles([]);
        return;
      }

      try {
        let setCycleNumber;
        const res = await api.get("/track/unik", {
          params: {
            customerName: selectedCustomer,
            tanggal: selectedDate,
          },
        });
        setCycleNumber = res.data.data || [];
        if (res.data.data.length === 0 || !res.data.data) {
          const filteredData = trucks.filter(
            (item) =>
              item.typeTruck === milkrunOrDirect &&
              item.partnerName === selectedTruck &&
              item.customerId?.nama === selectedCustomer
          );

          setCycleNumber = [
            ...new Set(filteredData.map((item) => parseInt(item.cycleNumber))),
          ];
        }
        setCycles(setCycleNumber);
        setSelectedCycle("");
      } catch (err) {
        console.error("Failed to fetch cycles", err);
      }
    };

    fetchCycles();
  }, [selectedCustomer, selectedDate, milkrunOrDirect, selectedTruck, trucks]);

  const handlePostAbsensi = useCallback(async () => {
    if (!milkrunOrDirect || !selectedCycle || !scanType || !selectedTruck)
      return;
    try {
      const truck = filteredTrucks.find(
        (t) =>
          t.partnerName === selectedTruck && t.destination === selectedCustomer
      );

      if (!truck) {
        setStatus("error");
        return;
      }

      const time = new Date().toISOString();
      const payload = {
        id: truck._id,
        partnerName: truck.partnerName,
        route: truck.route,
        customer: truck.destination,
        milkrunOrDirect,
        scanType: scanType,
        cycle: selectedCycle,
        timestamp: time,
        selectedDate,
      };

      // const payloadString = JSON.stringify(
      //   payload,
      //   Object.keys(payload).sort()
      // );
      // const secret = import.meta.env.VITE_QR_SECRET;
      // const hmac = CryptoJS.HmacSHA512(payloadString, secret);

      const res = await api.post("/absensi/qr", payload);
      if (res.data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(res.data.message);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      if (err.response && err.response.data) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Terjadi kesalahan pada server");
      }
    }
  }, [
    filteredTrucks,
    milkrunOrDirect,
    selectedCustomer,
    scanType,
    selectedCycle,
    selectedDate,
    selectedTruck,
  ]);

  useEffect(() => {
    if (
      milkrunOrDirect &&
      selectedCycle &&
      scanType &&
      selectedTruck &&
      selectedCustomer
    ) {
      handlePostAbsensi();
    }
  }, [
    milkrunOrDirect,
    selectedCycle,
    scanType,
    selectedTruck,
    selectedCustomer,
    handlePostAbsensi,
  ]);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setStatus(null);
        setScanType(null);
      }, 1000); // 1000ms = 1 detik

      return () => clearTimeout(timer);
    }
  }, [status, setStatus]);

  const handleStatus = () => {
    setStatus(null);
    setScanType(null);
  };
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-green-600 text-4xl mb-4">
            <FaCheck size={25} className="mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            Absensi Berhasil
          </h1>
          <p className="text-gray-600">Data telah tersimpan dengan baik</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-red-600 text-4xl mb-4">
            <FaTimes size={30} className=" mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Absensi Gagal
          </h1>
          <p className="text-red-600 font-medium text-lg">{message}</p>
          <p className="text-gray-600">Silakan coba lagi atau hubungi admin</p>
          <button
            onClick={() => handleStatus()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:px-6 lg:px-8 px-4 max-w-screen mx-auto space-y-6">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Form Absensi Truk
        </h1>

        <div className="mb-6">
          <label
            htmlFor="tanggal"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Pilih Tanggal Absensi
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd-MM-yyyy"
            className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 ease-in-out"
            placeholderText="Pilih tanggal"
            showYearDropdown
            dropdownMode="select"
          />
        </div>

        {/* Step 1: Pilih Jenis Pengiriman */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Pilih Jenis Pengiriman
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {["Milkrun", "Direct"].map((type) => (
              <button
                key={type}
                onClick={() => setMilkrunOrDirect(type)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  milkrunOrDirect === type
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Pilih Truck */}
        {milkrunOrDirect && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Pilih Nama Truk
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {truckPartners.map((partnerName) => (
                <button
                  key={partnerName}
                  onClick={() => setSelectedTruck(partnerName)}
                  className={`px-4 py-3 rounded-lg transition-colors text-left ${
                    selectedTruck === partnerName
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {partnerName}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTruck && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              {" "}
              Pilih Customer
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {customers.map((customer) => (
                <button
                  key={customer}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`px-4 py-3 rounded-lg transition-colors text-left ${
                    selectedCustomer === customer
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {customer}
                </button>
              ))}
              {/* <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">-- pilih customer --</option>
            {customers.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select> */}
            </div>
          </div>
        )}
        {/* Step 4: Pilih Cycle */}
        {selectedCustomer && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Pilih Cycle
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {cycles
                .sort((a, b) => a - b) // Mengurutkan angka dari yang terkecil
                .map((cycle, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedCycle === cycle
                        ? "bg-purple-600 text-white"
                        : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Step 5: Pilih Pickup Status */}
        {selectedCycle && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Pickup Status
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {["In", "Out"].map((type) => (
                <button
                  key={type}
                  onClick={() => setScanType(type)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    scanType === type
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsensiInPage;
