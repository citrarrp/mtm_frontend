import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { useReactToPrint } from "react-to-print";
import api from "../utils/api";
import moment from "moment-timezone";
import TagMTM from "./autoPrintTag.jsx";
import { AuthContext } from "../context/auth";
import DatePicker from "react-datepicker";
import html2canvas from "html2canvas";
import IminPrinter from "../assets/imin-printer-js.js";
import SUNMI from "sunmi-js-sdk";
import { FaPrint } from "react-icons/fa";

const CetakTag = ({ dataAsli, Material, lineAt, code, customer }) => {
  // const [isPrint, setIsPrinting] = useState(false);
  const [tableComponent, setTableComponent] = useState(null);
  const { user } = useContext(AuthContext);
  const [printerStatus, setPrintStatus] = useState("Load");
  const [tag, setTag] = useState([]);

  const Jadwalshift = [
    { value: "1", label: "00:00-07:40" },
    { value: "2", label: "07:30-16:10" },
    { value: "3", label: "16:00-00:10" },
  ];

  const getCurrentShift = () => {
    const now = moment();

    for (let shift of Jadwalshift) {
      const [startStr, endStr] = shift.label.split("-");
      let start = moment(`${now.format("YYYY-MM-DD")}T${startStr}`);
      let end = moment(`${now.format("YYYY-MM-DD")}T${endStr}`);

      // kalau shift melewati tengah malam
      if (end.isBefore(start)) end.add(1, "day");

      if (now.isBetween(start, end, null, "[)")) {
        return shift.value;
      }
    }

    return null; // kalau gak ketemu shift
  };
  const { register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      shift: getCurrentShift(),
      kanban: false, // Default value untuk kanban
    },
  });

  const shiftOptions = [
    "Shift 1 (00:00 - 07:40)",
    "Shift 2 (07:30 - 16:10)",
    "Shift 3 (16:00 - 00:10)",
  ];

  const shift = watch("shift") || null;
  const date = watch("date");
  const printDiv = useRef(null);

  const reactToPrintFn = useReactToPrint({
    content: () => printDiv.current,
    contentRef: printDiv,
    onPrintError: (error) => {
      console.error("Print error:", error);
      alert("Terjadi kesalahan saat mencetak dokumen.");
    },
    documentTitle: "Laporan Print",
    removeAfterPrint: true,
  });
  const displayData =
    dataAsli && dataAsli.length > 0 ? dataAsli : [{ kanban: false }];

  const sunmi = new SUNMI();
  const imin = new IminPrinter();

  const fallbackWebPrint = async (canvas, paperWidth) => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const rotatedCanvas = document.createElement("canvas");
      const ctx = rotatedCanvas.getContext("2d");
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
      ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      canvas = rotatedCanvas;
    }
    if (canvas.width !== paperWidth) {
      const resizedCanvas = document.createElement("canvas");
      const ctx = resizedCanvas.getContext("2d");
      const scaleFactor = paperWidth / canvas.width;
      resizedCanvas.width = paperWidth;
      resizedCanvas.height = canvas.height * scaleFactor;
      ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
      canvas = resizedCanvas;
    }

    const imgData = canvas.toDataURL("image/png", 1.0);

    try {
      await api.post("/print-tag", { image: imgData });
    } catch (err) {
      console.error("Gagal print:", err);
      await delay(300);
      reactToPrintFn();
    }
  };

  const transformCanvasForPrint = (canvas, paperWidth, rotate90 = true) => {
    if (!canvas) return null;

    const scaledCanvas = document.createElement("canvas");
    const scaleFactor = paperWidth / canvas.width;
    scaledCanvas.width = paperWidth;
    scaledCanvas.height = canvas.height * scaleFactor;
    const context2DScale = scaledCanvas.getContext("2d");
    context2DScale.imageSmoothingEnabled = true;
    context2DScale.imageSmoothingQuality = "high";
    context2DScale.drawImage(
      canvas,
      0,
      0,
      scaledCanvas.width,
      scaledCanvas.height
    );

    if (!rotate90) return scaledCanvas;

    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = scaledCanvas.height;
    rotatedCanvas.height = scaledCanvas.width;
    const ctxRotate = rotatedCanvas.getContext("2d");
    ctxRotate.imageSmoothingEnabled = true;
    ctxRotate.imageSmoothingQuality = "high";
    ctxRotate.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    ctxRotate.rotate(Math.PI / 2);
    ctxRotate.drawImage(
      scaledCanvas,
      -scaledCanvas.width / 2,
      -scaledCanvas.height / 2
    );

    return rotatedCanvas;
  };

  const handlePrintUniversal = async ({ paperSize = "58mm" } = {}) => {
    const paperWidth = paperSize === "58mm" ? 3650 : 3650;
    // setIsPrinting(true);

    if (!printDiv.current) {
      console.error("printDiv ref tidak ditemukan!");
      return;
    }

    let canvas = await html2canvas(printDiv.current, { scale: 2 });
    try {
      let rowCanvas = await html2canvas(printDiv.current, { scale: 2.5 });
      const processedCanvas = transformCanvasForPrint(
        rowCanvas,
        paperWidth,
        true
      );

      const dataUrl = processedCanvas.toDataURL("image/png", 2.0);

      const connectIminWithTimeout = (timeoutMs = 2000) => {
        return new Promise((resolve, reject) => {
          let done = false;

          // Timeout manual
          const timer = setTimeout(() => {
            if (!done) {
              done = true;
              reject(new Error("Timeout koneksi iMin"));
            }
          }, timeoutMs);

          imin
            .connect()
            .then((isConnect) => {
              if (done) return; // sudah timeout
              clearTimeout(timer);
              done = true;
              if (!isConnect) {
                reject(new Error("Gagal konek ke iMin"));
              } else {
                resolve(true);
              }
            })
            .catch((err) => {
              if (done) return;
              clearTimeout(timer);
              done = true;
              reject(err);
            });
        });
      };
      try {
        if (imin) {
          setPrintStatus("Mencoba konek ke iMin...");
          await connectIminWithTimeout(6000);

          const status = await imin.getPrinterStatus(
            imin.PrintConnectType?.USB || 0
          );
          console.log("Status printer iMin:", status);

          const errorMap = {
            [-1]: "Printer tidak terhubung atau mati",
            [1]: "Printer tidak terhubung atau mati",
            [3]: "Kepala printer terbuka",
            [7]: "Kertas habis",
            [8]: "Kertas hampir habis",
            [99]: "Error tidak dikenal",
          };

          if (errorMap[status]) {
            const msg = errorMap[status];
            setPrintStatus(`Gagal print iMin: ${msg}`);
            console.error(`Gagal cetak, ${msg}`);
            return;
          }

          setPrintStatus("Terhubung ke iMin, memulai print...");
          imin.initPrinter();
          imin.printSingleBitmap(dataUrl);
          imin.printAndFeedPaper(5);
          if (typeof imin.partialCut === "function") imin.partialCut();

          setPrintStatus("Cetak iMin selesai");

          return;
        }
      } catch (err) {
        console.error("Error iMin:", err);
      }
      try {
        setPrintStatus("Mencoba konek ke Sunmi...");
        await sunmi.launchPrinterService();
        sunmi.init();

        const status = await sunmi.printer.queryApi.getStatus();
        console.log("Status Sunmi:", status);
        if (status !== 1 && status !== 2)
          throw new Error("Printer Sunmi tidak siap");

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = dataUrl;
        img.onload = async () => {
          try {
            await sunmi.printer.printBitmap(img, (res) =>
              console.log("Hasil print Sunmi:", res)
            );
            if (typeof sunmi.printer.cutPaper === "function") {
              sunmi.printer.cutPaper((res) =>
                console.log("Hasil cut Sunmi:", res)
              );
            }
            setPrintStatus("Cetak Sunmi selesai");
          } catch (err) {
            console.error("Gagal cetak Sunmi:", err);
            fallbackWebPrint(processedCanvas, paperWidth);
          }
        };
        return;
      } catch (err) {
        console.error("Error Sunmi:", err);
      }
      setPrintStatus("Printer tidak ditemukan, fallback web print");
      fallbackWebPrint(processedCanvas, paperWidth);
    } catch (err) {
      console.error("Error saat cetak:", err);
      fallbackWebPrint(canvas, paperWidth);
    } finally {
      // setIsPrinting(false);
    }
  };

  const fetchLabelTag = useCallback(async () => {
    try {
      const res = await api.get("/production", {
        params: {
          customer: customer || "",
          material: code,
          line: lineAt?.split("-")[0] || "",
          shift,
          date,
        },
      });

      if (res.data.success) {
        setTag(res.data.data); // ambil 1 data
      }
    } catch (err) {
      console.error("error :", err);
    }
  }, [customer, code, lineAt, shift, date]);

  useEffect(() => {
    if (shift && date) {
      fetchLabelTag();
    }
  }, [shift, date, lineAt, fetchLabelTag]);

  const onSubmit = async (formData) => {
    try {
      const res = await api.post("/production/update", {
        customer,
        material: code,
        line: lineAt.split("-")[0],
        shift,
        operator: user.fullname,
        date: date,
      });

      if (res.data.success) {
        setTableComponent(
          <TagMTM
            tagData={tag || res.data.data}
            dataCust={displayData}
            dataPart={Material}
            code={code}
            line={lineAt.split("-")[0]}
            date={date}
            shift={formData.shift}
            kanban={Material.kanban}
            user={user}
            customer={customer}
            idx={lineAt.split("-")[1]}
          />
        );
        fetchLabelTag();
        handlePrintUniversal();
      } else {
        alert("Gagal update: " + res.data.message);
      }
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Terjadi kesalahan saat mengirim data ke server");
    }
  };

  return (
    <>
      <section className="min-h-[85vh] max-h-screen p-4 lg:p-8 max-w-5xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 pb-4">
            Cetak Label
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <div className="sm:col-span-3">
                <label
                  htmlFor="date"
                  className="block text-[16px] font-medium text-gray-700 mb-1"
                >
                  Tanggal
                </label>

                <Controller
                  name="date"
                  control={control}
                  defaultValue={new Date()}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      id="date"
                      selected={field.value}
                      onChange={(date) => field.onChange(date)}
                      dateFormat="dd/MM/yyyy"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border py-2 px-3 text-base focus:ring-blue-500 focus:border-blue-500"
                      // placeholderText="Pilih tanggal"
                    />
                  )}
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="shift"
                  className="block text-[16px] font-medium text-gray-700 mb-1"
                >
                  Shift
                </label>
                <select
                  id="shift"
                  {...register("shift")}
                  className="mt-1 block w-3/4 rounded-md border-gray-300 shadow-sm border py-2 px-3 text-base focus:ring-blue-500 focus:border-blue-500"
                >
                  {shiftOptions.map((s, i) => (
                    <option key={i} value={Number(i + 1)}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <p>Jumlah : {tag[0]?.qty ?? 0}</p>
              </div>
              <div>Status: {printerStatus}</div>
            </div>

            <div className="flex flex-col justify-between items-center ">
              <div ref={printDiv} className="h-full">
                {tableComponent}
              </div>
              <button
                type="submit"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-[16px] font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Cetak
              </button>
            </div>
          </div>
        </form>
      </section>
      {/* <div>
        {isPrint && (
          <div className="fixed inset-0 backdrop-blur-xs bg-black/5 bg-opacity-10 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center">
              <div className="animate-bounce mb-4">
                <FaPrint className="text-blue-500 text-4xl" />
              </div>
              <div className="flex space-x-2 mb-4">
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div
                  className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                Sedang Mencetak
              </h3>
              <p className="text-gray-600 mt-2">Harap tunggu sebentar...</p>
            </div>
          </div>
        )}
      </div> */}
    </>
  );
};

export default CetakTag;
