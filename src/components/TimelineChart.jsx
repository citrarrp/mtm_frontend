import { Scatter } from "react-chartjs-2";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment-timezone";
import annotationPlugin from "chartjs-plugin-annotation";

import {
  FaArrowLeft,
  FaArrowRight,
  FaLock,
  FaTruck,
  FaUndo,
  FaUnlock,
} from "react-icons/fa";

const alwaysShowTooltipPlugin = {
  id: "alwaysShowTooltip",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      chart.getDatasetMeta(datasetIndex).data.forEach((point, index) => {
        const data = dataset.data[index];
        const x = point.x + 10;
        const y = point.y;
        const etd = moment(data.delay ? data.delay : data.x)
          .format("HH:mm");

        const tooltipText = `${etd} (C${data.cycle})`;

        ctx.save();
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.fillText(tooltipText, x + 21, y + 4);
        ctx.restore();
      });
    });
  },
};

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
  zoomPlugin,
  CategoryScale,
  alwaysShowTooltipPlugin,
  annotationPlugin
);

// Ubah Icon React jadi Image SVG untuk pointStyle Chart
const iconToImage = (
  IconComponent,
  percentage = 100,
  size = 20,
  statusColor
) => {
  const gradientId = `grad-${Math.random().toString(36).substr(2, 5)}`;
  let iconMarkup = renderToStaticMarkup(<IconComponent size={size} />);
  iconMarkup = iconMarkup.replace(/fill=".*?"/g, "");

  const gradient =
    percentage === 100 || percentage === 0
      ? `
    <stop offset="0%" stop-color="${statusColor}" />
    <stop offset="100%" stop-color="${statusColor}" />
  `
      : `
    <stop offset="${100 - percentage}%" stop-color="${statusColor}" />
    <stop offset="${percentage}%" stop-color="#fc5e03" />
  `;

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="${gradientId}" x1="100%" y1="0%" x2="0%" y2="0%">
          ${gradient}
        </linearGradient>
      </defs>
      <g fill="url(#${gradientId})">
        ${iconMarkup}
      </g>
    </svg>
  `;

  const img = new Image();
  img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
  return img;
};

const TimelineChart = ({
  open,
  trackingData,
  selectDate,
  handleSelectedDate,
}) => {
  const chartRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeWindow, setTimeWindow] = useState(12);
  const [isLock, setLocked] = useState(false);

  const statusLabels = {
    advanced: "Advanced",
    delay: "Delay",
    On_Time: "On Time",
  };

  const statusColors = {
    advanced: "#527cf7",
    delay: "#e60a29",
    On_Time: "#008000",
  };

  const getDateToday = useCallback(
    (dateStr) => {
      const utcDate = new Date(dateStr);
      const wibHours = utcDate.getUTCHours() + 7; // Tambah 7 jam karena dari awal salah format hehe
      const wibMinutes = utcDate.getUTCMinutes();

      const date = new Date(selectDate);
      date.setHours(wibHours, wibMinutes, 0, 0);

      return date;
    },
    [selectDate]
  );

  const getTimeRange = useCallback(() => {
    const fullDate = new Date(selectDate);
    fullDate.setHours(new Date(currentTime).getHours());
    const baseDate = fullDate ? new Date(fullDate) : new Date(currentTime);
    const start = new Date(baseDate);
    const end = new Date(baseDate);
    end.setHours(end.getHours() + timeWindow);

    const maxEnd = new Date(selectDate);
    maxEnd.setHours(23, 59, 59, 999);

    const finalEnd = end > maxEnd ? maxEnd : end;
    return { start, end: finalEnd };
  }, [currentTime, selectDate, timeWindow]);

  const isMatch = (trackCustomer, itemCustomer) => {
    const tc = trackCustomer.toLowerCase().trim();
    //.replace(/\s+/g, "");
    const ic = itemCustomer.toLowerCase().trim();

    if (!tc.includes(ic)) return false;

    const trackNums = tc.match(/\d+/g) || [];
    const itemNums = ic.match(/\d+/g) || [];

    if (trackNums.length === 0) {
      return true;
    }
    return trackNums.every((num) => itemNums.includes(num));
  };

  const allDepartures = useMemo(() => {
    return trackingData
      .filter((item) => item.proses?.includes("Departure Truck"))
      .map((item) => ({
        ...item,
        waktuParsed: getDateToday(item.waktu),
        delay: null,
      }));
  }, [trackingData, getDateToday]);

  const { filteredDeparture, countByStatus } = useMemo(() => {
    let count = {
      advanced: 0,
      On_Time: 0,
      delay: 0,
    };

    const result = allDepartures
      .filter((item) => {
        const match = trackingData.find((track) => {
          return (
            isMatch(track.customer, item.customer) && track.cycle === item.cycle
          );
        });
        return match;
      })
      .map((item) => {
        const finishPrepTrack = trackingData.find(
          (t) =>
            isMatch(t.customer, item.customer) &&
            t.cycle === item.cycle &&
            t.proses?.includes("Finish Preparation")
        );

        const departureTrack = trackingData.find(
          (t) =>
            isMatch(t.customer, item.customer) &&
            t.cycle === item.cycle &&
            t.proses?.includes("Departure Truck")
        );

        let percentage = 0;
        let statusColor = "#fce6cf";

        if (finishPrepTrack?.status === "-") {
          percentage = finishPrepTrack.percentage || 0;
          statusColor = "#fce6cf"; // warna bg default, bisa kamu sesuaikan
        } else if (finishPrepTrack?.status === "Delay") {
          percentage = 100;
          statusColor = "#e60a29"; // merah
        } else if (finishPrepTrack?.status === "Advanced") {
          percentage = 100;
          statusColor = "#fce6cf"; // biru
        }

        if (finishPrepTrack?.status !== "-") {
          if (departureTrack?.status === "-") {
            percentage = 100;
            statusColor = "#fc5e03";
          } else if (departureTrack?.status.toLowerCase() === "On Time") {
            count.On_Time += 1;
            percentage = 100;
            statusColor = "#008000"; // hijau
          } else if (departureTrack?.status === "Delay") {
            count.delay += 1;
            percentage = 100;
            statusColor = "#e60a29"; // merah
          } else if (departureTrack?.status === "Advanced") {
            count.advanced += 1;
            percentage = 100;
            statusColor = "#527cf7"; // biru
          }
        }

        return {
          ...item,
          percentage,
          statusColor,
        };
      });
    return { filteredDeparture: result, countByStatus: count };
  }, [allDepartures, trackingData]);

  const { start, end } = getTimeRange();

  //maunya ketika delay masih ada di halaman tampil progress delivery itu, tanpa geser.
  const filteredDepartures = useMemo(() => {
    if (filteredDeparture.length == 0) return [];
    const waktuDate = new Date(selectDate); // Ambil tanggal dari selectDate
    const nowDate = new Date(); // Waktu sekarang

    // Set jam dan menit dari waktu sekarang ke selectDate
    waktuDate.setHours(
      nowDate.getHours(),
      nowDate.getMinutes(),
      nowDate.getSeconds(),
      nowDate.getMilliseconds()
    );

    return filteredDeparture
      .map((item, index) => {
        if (item.statusColor === "#e60a29") {
          // kalau delay, override waktunya ke currentTime
          return {
            ...item,
            waktuParsed: new Date(waktuDate.getTime() + index * 15 * 60000),
            delay: getDateToday(item.waktu), // ETD asli buat tooltip
          };
        }
        return {
          ...item,
          waktuParsed: null,
        }; // kalau bukan delay, pakai data asli tapi waktuParsed null
      })
      .filter((item) => {
        const waktu = new Date(item.waktuParsed);
        return waktu >= start && waktu <= end;
      });
  }, [filteredDeparture, start, end, getDateToday, selectDate]);

  const freezeRange = useMemo(() => {
    const redItems = filteredDepartures.filter(
      (item) => item.statusColor === "#e60a29"
    );
    if (redItems.length === 0) return null;

    const times = redItems.map((item) => new Date(item.waktuParsed).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { minTime, maxTime };
  }, [filteredDepartures]);

  const hasRed = useMemo(() => {
    return filteredDeparture.some((item) => item.statusColor === "#e60a29");
  }, [filteredDeparture]);

  const customerList = useMemo(() => {
    if (!Array.isArray(filteredDepartures) || filteredDepartures.length === 0)
      return [];
    return [...new Set(filteredDepartures.map((item) => item.customer))];
  }, [filteredDepartures]);

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: "Truck Departure (Real-Time)",
          data: filteredDepartures.map((item) => ({
            x: item.waktuParsed ? item.waktuParsed : item.delay,
            y: item.customer,
            cycle: item.cycle,
            delay: item.delay,
          })),
          backgroundColor: "rgba(75, 192, 192, 1)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 6,
          pointStyle: filteredDepartures.map((item) =>
            iconToImage(FaTruck, item.percentage, 22, item.statusColor)
          ),
        },
      ],
    }),
    [filteredDepartures]
  );

  const chartHeight = Math.max(customerList.length * 20, 300);

  const options = useMemo(() => {
    let min = start.getTime();
    let max = end.getTime();

    if (hasRed && freezeRange) {
      min = Math.min(min, freezeRange.minTime);
      max = Math.max(max, freezeRange.maxTime);
    }
    return {
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            displayFormats: {
              hour: "HH:mm",
            },
          },
          min: new Date(min),
          max: new Date(max),
          adapters: {
            date: {
              locale: enUS,
            },
          },
          title: {
            display: true,
            text: "Waktu ETD (Jam)",
          },
          position: "top",
        },
        y: {
          type: "category",
          labels: customerList,
          ticks: {
            autoSkip: false,
          },
        },
      },
      plugins: {
        zoom: {
          zoom: {
            wheel: {
              enabled: !hasRed, // disable zoom dengan scroll jika ada merah
              modifierKey: "ctrl",
            },
            pinch: {
              enabled: !hasRed,
            },
            mode: "x",
          },
          limits: {
            x: {
              min: "original",
              max: "original",
              minRange: 3600000 * 2, // 2 jam
            },
          },
        },
        // annotation: {
        //   annotations: {
        //     currentTimeLine: {
        //       type: "line",
        //       xMin: currentTime.getTime(),
        //       xMax: currentTime.getTime(),
        //       borderColor: "rgba(0, 0, 255, 0.7)",
        //       borderWidth: 2,
        //       label: {
        //         content: "Now",
        //         enabled: true,
        //         position: "start",
        //         backgroundColor: "rgba(0, 0, 255, 0.5)",
        //       },
        //     },
        //   },
        // },
        tooltip: {
          enabled: false,
        },
        legend: {
          display: false,
        },
        alwaysShowTooltip: {},
        freezeTruckPlugin: {},
      },
    };
  }, [start, end, customerList, hasRed, freezeRange]);

  const navigateTime = (hours) => {
    if (isLock) return;

    const base = selectDate ? new Date(selectDate) : new Date(currentTime);

    let newHour = base.getHours() + hours;

    // Buat tanggal baru dengan jam yang udah dibatasin
    const newDate = new Date(base);

    // Kalau jam keluar dari range 0-23, batasin aja, tapi ga ganti tanggal
    if (newHour < 0) {
      newDate.setHours(0, 0, 0, 0); // Set ke jam 00:00
    } else if (newHour > 23) {
      newDate.setHours(23, 0, 0, 0); // Set ke jam 23:00
    } else {
      newDate.setHours(newHour, 0, 0, 0); // Set jam normal
    }

    if (selectDate && handleSelectedDate) {
      // Kalau tanggal berubah, update parent via handle
      handleSelectedDate(newDate);
    }

    setCurrentTime(newDate);
  };

  const resetView = () => {
    setCurrentTime(new Date());
    setTimeWindow(12);
    chartRef.current?.resetZoom();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      setTimeout(() => {
        chartRef.current?.update(); // paksa update chart
      }, 100); // jeda pendek untuk passtiin state sudah update
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const ProgressItem = ({ label, count, color, large = false }) => {
    return (
      <div
        className={`p-4 rounded-lg shadow-sm border flex flex-col ${
          large ? "col-span-2 h-24" : "h-24"
        }`}
        style={{
          backgroundColor: `${color}10`,
          borderColor: color,
          borderWidth: "2px",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-gray-700">{label}</span>
        </div>

        <div className="flex-1 flex items-end">
          <span
            className={`font-bold ${large ? "text-3xl" : "text-2xl"}`}
            style={{ color: color }}
          >
            {label == "Progress Delivery"
              ? `${
                  countByStatus.On_Time +
                  countByStatus.delay +
                  countByStatus.advanced
                }/`
              : ""}
            {count}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen h-full mx-auto px-4 ${
        open ? "grid-cols-2 py-8" : "py-0"
      } w-full`}
    >
      {open && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigateTime(-5)}
              disabled={isLock}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all 
          ${
            isLock
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#105bdf] hover:bg-[#105bdf] text-white"
          }`}
            >
              <FaArrowLeft className="text-sm" />
              <span>5 Jam</span>
            </button>
            <button
              onClick={() => navigateTime(5)}
              disabled={isLock}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all 
          ${
            isLock
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#105bdf] hover:bg-blue-700 text-white"
          }`}
            >
              <span>5 Jam</span>
              <FaArrowRight className="text-sm" />
            </button>
            <button
              onClick={resetView}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-all"
            >
              <FaUndo className="text-sm" />
              <span>Reset</span>
            </button>
          </div>
          <button
            onClick={() => setLocked(!isLock)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all
        ${
          isLock
            ? "bg-red-500 hover:bg-red-600"
            : "bg-green-500 hover:bg-green-600"
        } text-white`}
          >
            {isLock ? (
              <>
                <FaUnlock className="text-sm" />
                <span>Buka Kunci</span>
              </>
            ) : (
              <>
                <FaLock className="text-sm" />
                <span>Kunci</span>
              </>
            )}
          </button>
        </div>
      )}
      <div className="flex flex-col">
        <div className={`${open ? "order-1" : "order-2 w-full"}`}>
          <div className="bg-white rounded-lg shadow-md p-0 mb-6">
            <Scatter
              data={chartData}
              options={{
                ...options,
                responsive: true,
                maintainAspectRatio: false,
              }}
              ref={chartRef}
              height={chartHeight}
              width={1000}
            />
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>
              Menampilkan {filteredDeparture.length} jadwal keberangkatan truk
              diantara{" "}
              <span className="font-medium">
                {moment(start).format("D MMMM, ")} 00:00
              </span>{" "}
              sampai
              <span className="font-medium">
                {" "}
                {moment(end).format("D MMMM, ")} 23:59
              </span>
            </p>
          </div>
        </div>

        <div className={`${open ? "order-2 " : "order-1"} py-4 space-y-4`}>
          {/* <h2 className="text-2xl font-bold text-gray-800">Delivery Status</h2> */}

          <div
            className={`grid 
          ${
            open
              ? "grid-cols-2 md:grid-cols-5"
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          } 
          gap-3`}
          >
            {Object.entries(countByStatus).map(([key, value]) => {
              return (
                <ProgressItem
                  key={key}
                  label={statusLabels[key]}
                  count={value}
                  color={statusColors[key]}
                />
              );
            })}
            <ProgressItem
              label="Progress Delivery"
              count={filteredDeparture.length}
              color="#00000"
              large
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineChart;
