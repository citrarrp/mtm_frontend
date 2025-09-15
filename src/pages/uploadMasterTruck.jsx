import React, { useState } from "react";
import * as XLSX from "xlsx";
import api from "../utils/api";
import { useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";

const TrucksDataUpload = () => {
  const [truckData, setTruckData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState([]);

  const fieldMapping = {
    Remarks: "typeTruck",
    "LP Name": "partnerName",
    Customer: "destination",
    "ETA Cust.": "ETACust",
    Cycle: "cycleNumber",
  };

  const fetchSODDiagram = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SOD_URL}/sodDiagram/api/sod/`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data.data;
    } catch (err) {
      console.error("Failed to fetch SOD Diagram:", err);
      return [];
    }
  };

  useEffect(() => {
    const loadSOD = async () => {
      const data = await fetchSODDiagram();
      const uniqueCustomers = [
        ...new Set(data.map((item) => item.customerName.trim())),
      ];
      setAvailableCustomers(uniqueCustomers);
    };

    loadSOD();
  }, []);

  const normalizeCustomer = (s) => (s || "").trim();

  const matchCustomer = (excelCust, availableCustomers) => {
    const normExcel = normalizeCustomer(excelCust);
    const found = availableCustomers.find((cust) =>
      normExcel.includes(normalizeCustomer(cust))
    );
    return found || excelCust; // kalau ga ketemu, tetap pakai isi dari Excel
  };

  const cleanKey = (key) =>
    key
      .replace(/[\r\n]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const formatTimeValue = (value) => {
    if (!value) return null;

    try {
      const stringValue = String(value).trim();
      const timePattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
      const timeMatch = stringValue.match(timePattern);

      if (timeMatch) {
        const hours = timeMatch[1].padStart(2, "0");
        const minutes = timeMatch[2];
        const seconds = timeMatch[3] || "00";
        return `${hours}:${minutes}:${seconds}`;
      }
      if (value instanceof Date) {
        return `${value.getHours().toString().padStart(2, "0")}:${value
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${value.getSeconds().toString().padStart(2, "0")}`;
      }

      if (stringValue.includes(":")) {
        const momentTime = moment(
          stringValue,
          ["HH:mm:ss", "HH:mm", "H:mm:ss", "H:mm"],
          true
        );
        if (momentTime.isValid()) {
          return momentTime.format("HH:mm:ss");
        }
      }
      // Kembalikan nilai string aja kalau ga bisa ke format waktu
      return stringValue;
    } catch (error) {
      console.error("Error formatting time value:", error);
      return String(value);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      const wb = XLSX.read(event.target?.result, {
        type: "binary",
        cellDates: true,
      });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const headerRowIndex = rawData.findIndex((r) =>
        r.some((cell) => String(cell).toLowerCase().includes("customer"))
      );

      const headers = rawData[headerRowIndex];
      const dataRow = rawData.slice(headerRowIndex + 1);

      const mappedData = dataRow
        .filter(
          (row) =>
            row.length > 0 &&
            row.some(
              (cell) => cell !== null && cell !== undefined && cell !== ""
            )
        )
        .map((row,) => {
          const mappedRow = {
            partnerName: "",
            destination: "",
            route: "",
            typeTruck: "",
            ETACust: "",
            cycleNumber: "",
          };
          headers.forEach((header, colIndex) => {
            if (!header) return; // Skip header yang isi datanya kosong

            const normalizedHeader = cleanKey(String(header));
            const mongoKey = fieldMapping[normalizedHeader];

            if (!mongoKey) return;

            let cellValue = row[colIndex];

            // Untuk khusus customer perlu dicek dengan fungsi matchCustomer, karena di excel pakai PT, sedangkan di SOD pakai nama tanpa PT
            if (normalizedHeader === "Customer") {
              cellValue = matchCustomer(
                String(cellValue || ""),
                availableCustomers
              );
             
            } else if (normalizedHeader === "ETA Cust." && cellValue) {
              cellValue = formatTimeValue(cellValue);
            } else if (normalizedHeader === "Cycle" && cellValue) {
              cellValue = cellValue
                .replace(/^C\s*/, "")
                .replace(/\s+/g, " ")
                .trim();
            }

            if (cellValue !== null && cellValue !== undefined) {
              mappedRow[mongoKey] = String(cellValue).trim();
            }
          });

          return mappedRow;
        });

      setTruckData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (truckData.length === 0) return;

    setIsUploading(true);

    const payload = truckData.map((row) => ({
      ...row,
    }));
    try {
      const res = await api.post("/trucks", payload);
      if (res.data.success) {
        alert(`${res.data?.message || "Data berhasil diunggah!"}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Gagal submit: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setTruckData([]);
    setFileName("");
    // Reset file input
    document.getElementById("dropzone-file").value = "";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Upload Data Master Trucks
        </h2>
        {/* <NavLink
          to="update"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-800 bg-blue-200 hover:bg-blue-400 transition-colors duration-150"
        >
          <MdEdit size={20} className="mr-2" />
          Update Material
        </NavLink> */}
      </div>
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
              <span className="text-blue-600">Click to upload</span> or drag and
              drop
            </h1>
            <p className="text-lg text-gray-500">.xlsx atau .xls (Max. 10MB)</p>
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
      {truckData.length > 0 && fileName && (
        <div className="mb-6">
          <div className="overflow-x-auto border rounded-lg max-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(truckData[0]).map((key) => (
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
                {truckData.slice(0, 5).map((row, i) => (
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
              dari ({truckData.length} rows)
            </p>
          </div>
        </div>
      )}

      {truckData.length > 0 && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
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
  );
};

export default TrucksDataUpload;
