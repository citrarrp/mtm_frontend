import React, { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { RiFolderLockFill } from "react-icons/ri";
import { IoAddCircle, IoArrowBackCircle } from "react-icons/io5";
import { Link } from "react-router";
import api from "../utils/api";

const EditableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);

  const onBlur = () => {
    table.options.meta?.updateData(row.index, column.id, value);
  };

  return (
    <input
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      value={value || ""}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
    />
  );
};

const MaterialTable = () => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await api.get("/materials");
        const result = res?.data.data || [];
        setData(result);
        setOriginalData(JSON.parse(JSON.stringify(result)));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateData = (rowIndex, columnId, value) => {
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: value,
            isEdited:
              JSON.stringify(originalData[rowIndex]) !==
              JSON.stringify({ ...row, [columnId]: value }),
          };
        }
        return row;
      })
    );
  };

  const addRow = () => {
    setData((old) => [
      ...old,
      { 
        sales_organization: "",
        distribution_channel: "",
        customer: "",
        material: "",
        created_by: "",
        created_on: new Date().toISOString().slice(0, 10),
        customer_material: "",
        customer_material_description: "",
        minimum_delivery_qty: "",
        base_unit_of_measure: "",
        sap_number: "",
        material_description: "",
        isNew: true,
      },
    ]);
  };

  const handleSubmit = async () => {
    const changed = data.filter((row) => row.isEdited || row.isNew);
    if (changed.length === 0) return alert("Tidak ada data yang berubah.");

    try {
      setIsSubmitting(true);
      const res = await api.post("/materials/", changed);

      alert(res.data.message || "Data berhasil disimpan!");
      // Refresh data setelah berhasil submit
      const refreshRes = await api.post("/materials");
      setData(refreshRes?.data.data || []);
      setOriginalData(refreshRes.data.data || []);
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    "sales_organization",
    "distribution_channel",
    "customer",
    "material",
    "created_by",
    "created_on",
    "customer_material",
    "customer_material_description",
    "minimum_delivery_qty",
    "base_unit_of_measure",
    "sap_number",
    "material_description",
  ].map((key) => ({
    accessorKey: key,
    header: key.replace(/_/g, " ").toUpperCase(),
    cell: EditableCell,
  }));

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { updateData },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto bg-white rounded-lg shadow-md">
      <Link to="/masterMaterial">
        <IoArrowBackCircle size={22} className="mb-3" />
      </Link>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center align-middle">
            <RiFolderLockFill size={23} className="mr-2" />
            Master Material
          </h2>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={addRow}
            className="flex items-center px-4 py-2 border-blue-600 border-1 text-blue-700 rounded-md hover:bg-blue-100 bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <IoAddCircle size={20} className="mr-2" />
            Tambah Baris
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting || !data.some((row) => row.isEdited || row.isNew)
            }
            className={`flex items-center px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isSubmitting
                ? "bg-blue-400 cursor-not-allowed"
                : data.some((row) => row.isEdited || row.isNew)
                ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={`${
                      index > 1 ? "min-w-[200px]" : ""
                    } px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`${
                  row.original.isEdited
                    ? "bg-gray-100"
                    : row.original.isNew
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={`${
                      index > 1 ? "min-w-[200px]" : ""
                    } px-4 py-3 whitespace-nowrap`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          {data.filter((row) => row.isEdited || row.isNew).length} perubahan
          yang belum disimpan
        </p>
      </div>
    </div>
  );
};

export default MaterialTable;
