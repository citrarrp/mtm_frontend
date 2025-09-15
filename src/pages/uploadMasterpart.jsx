import React, { useState } from "react";
import { MdEdit } from "react-icons/md";
import { NavLink } from "react-router";
import * as XLSX from "xlsx";
import api from "../utils/api";

const MaterialUpload = () => {
  const [excelData, setExcelData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const fieldMapping = {
    // "Sales Organization": "sales_organization",
    // "Distribution Channel": "distribution_channel",
    Customer: "customer",
    Product: "material",
    // "Created By": "created_by",
    // "Created on": "created_on",
    "Customer Number": "customer_material",
    Unique: "unique",
    // "Customer's Description of Material": "customer_material_description",
    // "Minimum Delivery Qty": "minimum_delivery_qty",
    // "Base Unit of Measure": "base_unit_of_measure",
    // "SAP Number": "sap_number",
    "Qty/Kanban": "qtyKanban",
    "Job Number": "job_no",
    // Description: "material_description",
    "Product Desc": "material_description",
    Line: "line",
    Customer2: "customer_description",
  };

  const cleanKey = (key) =>
    key
      .replace(/[\r\n]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      const wb = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws);

      // Mapping header ke field MongoDB
      const mappedData = rawData.map((row) => {
        const mappedRow = {};
        for (const rawKey in row) {
          const normalizedKey = cleanKey(rawKey);
          const mongoKey = fieldMapping[normalizedKey];

          if (!mongoKey) continue;

          if (normalizedKey === "Created on") {
            mappedRow[mongoKey] = isNaN(new Date(row[rawKey]).getTime())
              ? new Date()
              : new Date(row[rawKey]);
          } else if (normalizedKey === "Qty/Kanban") {
            mappedRow[mongoKey] = Number(row[rawKey]) || 0;
          } else {
            mappedRow[mongoKey] = row[rawKey];
          }
        }
        return mappedRow;
      });

      setExcelData(mappedData);
    };

    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (excelData.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalRows = excelData.length;
    let successfulUploads = 0;

    for (let i = 0; i < totalRows; i++) {
      const row = { ...excelData[i], status: i === 0 ? "first" : "normal" }; // flag baris pertama
      try {
        console.log(row, "data");
        const res = await api.post("/materials", JSON.stringify(row), {
          headers: { "Content-Type": "application/json" },
        });

        if (res?.data.success) {
          successfulUploads++;
        } else {
          throw new Error("Gagal upload baris");
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploadProgress(Math.round(((i + 1) / totalRows) * 100));
      }
    }

    setIsUploading(false);
    alert(
      `Upload selesai! ${successfulUploads} dari ${totalRows} data berhasil diunggah.`
    );
    handleReset();
  };

  const handleReset = () => {
    setExcelData([]);
    setFileName("");
    // Reset file input
    document.getElementById("dropzone-file").value = "";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Upload Excel Master Part
        </h2>
        <NavLink
          to="update"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-800 bg-blue-200 hover:bg-blue-400 transition-colors duration-150"
        >
          <MdEdit size={20} className="mr-2" />
          Update Material
        </NavLink>
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

      {excelData.length > 0 && (
        <div className="mb-6">
          <div className="overflow-x-auto border rounded-lg max-w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(excelData[0]).map((key) => (
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
                {excelData.slice(0, 5).map((row, i) => (
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
              dari ({excelData.length} rows)
            </p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">
              Mengunggah...
            </span>
            <span className="text-sm font-medium text-blue-700">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      {excelData.length > 0 && (
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

export default MaterialUpload;
