import axios from "axios";
import useSWR from "swr";
import TimelineChart from "../components/TimelineChart";
import { useContext, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import moment from "moment-timezone";
import RealtimeTimer from "../components/realtimeTimer";
import { SidebarContext } from "../context/sidebar-context";
import { IoMdInformationCircleOutline } from "react-icons/io";

const fetcher = (url) =>
  axios
    .get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => res.data.data);

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { isOpen } = useContext(SidebarContext);

  const {
    data: dataTracking,
    error,
    isLoading,
  } = useSWR(`${import.meta.env.VITE_BACKEND_URL}/api/track`, fetcher, {
    refreshInterval: 60000, // 5 menit = 300.000 ms
    revalidateOnFocus: false,
  });

  const filteredTrackingData = useMemo(() => {
    if (!dataTracking) return [];

    const prosesYangDipilih = [
      "Start Preparation (Pulling)",
      "Finish Preparation",
      "Departure Truck",
    ];

    // Filter hanya proses prepare dan departure truck
    const filtered = dataTracking.filter((item) => {
      const isProsesdipilih =
        item.nama?.includes(prosesYangDipilih[0]) ||
        item.nama?.includes(prosesYangDipilih[1]) ||
        item.nama?.includes(prosesYangDipilih[2]);

      if (!selectedDate) return isProsesdipilih;
      const itemDay = moment
        .tz(item.waktuStandar, "Asia/Jakarta")
        .format("YYYY-MM-DD");
      const selectedDay = moment
        .tz(selectedDate, "Asia/Jakarta")
        .format("YYYY-MM-DD");

      return isProsesdipilih && itemDay === selectedDay;
    });

    const uniqueMap = new Map();

    filtered.forEach((item) => {
      const tanggal = moment(item.tanggal).format("YYYY-MM-DD");
      const key = `${item.customerId?.nama}-${item.cycleNumber}-${item?.nama}-${tanggal}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          customer: item.customerId?.nama,
          cycle: item.cycleNumber,
          status: item.status,
          proses: item.nama,
          waktu: item.waktuStandar,
          totalPercentage: 0,
          count: 0,
          statuses: [],
          dnNumber: new Set(),
        });
      }
      const group = uniqueMap.get(key);
      if (item.nama.includes("Finish Preparation")) {
        group.totalPercentage += item?.persentase || 0;
        group.count += 1;
      }
      if (item.dnNumber) group.dnNumber.add(item.dnNumber);
      group.statuses.push(item?.status || null);
    });

    return Array.from(uniqueMap.values());
  }, [dataTracking, selectedDate]);

  const finalData = filteredTrackingData.map((group) => {
    const hasNull = group.statuses.some(
      (status) => status === null || status === undefined
    );

    let status = "-";

    if (group.statuses.includes("Delay")) {
      status = "Delay";
    } else {
      if (!hasNull) {
        const statusCount = group.statuses.reduce((acc, curr) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {});

        // Ambil status dengan jumlah terbanyak
        status = Object.entries(statusCount).reduce((max, curr) => {
          return curr[1] > max[1] ? curr : max;
        })[0]; // ambil nama status
      }
    }

    const percentage =
      group.proses.includes("Finish Preparation") && group.count > 0
        ? Math.round(group.totalPercentage / group.count)
        : 0;

    return {
      customer: group.customer,
      cycle: group.cycle,
      proses: group.proses,
      waktu: group.waktu,
      percentage: percentage,
      status,
    };
  });

  const handleSelectDate = (date) => {
    setSelectedDate(date);
  };

  if (error) {
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <div className="bg-red-100/50 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 transition-all duration-300 hover:shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-15 h-15 bg-red-100 rounded-full flex items-center justify-center">
              <IoMdInformationCircleOutline
                size={50}
                className="text-red-500"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Data Tidak Ditemukan!
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Maaf, terjadi kesalahan saat memuat data tracking. Silakan coba lagi
            dalam beberapa saat.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[90vh] flex items-center justify-center p-6">
        <div className="bg-blue-100/50 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 transition-all duration-300 hover:shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Memuat Data Tracking
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Sedang mengambil data tracking, harap tunggu sebentar...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`min-h-screen max-h-full ${
        isOpen ? "w-4xl" : "w-full"
      } transition-all duration-200`}
    >
      {isOpen && (
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="yyyy-MM-dd"
          className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          maxDate={new Date()}
          placeholderText="Pilih tanggal"
          showYearDropdown
          dropdownMode="select"
        />
      )}

      <div className="flex justify-between mx-4">
        <h1 className={`font-bold ${isOpen ? "text-lg" : "text-4xl"} my-10`}>
          Timeline Keberangkatan Truk
        </h1>

        <RealtimeTimer />
      </div>

      <TimelineChart
        open={isOpen}
        trackingData={finalData}
        selectDate={selectedDate}
        handleSelectedDate={handleSelectDate}
      />
    </div>
  );
}
