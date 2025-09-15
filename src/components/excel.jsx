import React, { useState } from "react";
import * as XLSX from "xlsx";
import moment from "moment-timezone";
import { useEffect } from "react";
import DeleteField from "./deleteData";
import api from "../utils/api";
import axios from "axios";

moment.locale("id");

function Excel() {
  const [fileName, setFileName] = useState("");
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [selectedColumns, setSelectedColumns] = useState(["job_no"]); // Untuk data uniknya dari masing pesanan material. misal job untuk ADM
  const [schemaFields, setSchemaFields] = useState([]); // simpan schema field yang akan digunakan, order_delivery, dn_number
  const [newSchemaLabel, setNewSchemaLabel] = useState("");
  const [showSchemaForm, setShowSchemaForm] = useState(false);
  const [showTabel, setShowTabel] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(""); // Untuk memilih customer jika satu excel banyak customer
  const [separator, setSeparator] = useState("");
  const [customerList, setCustomerList] = useState([]); // simpan daftar customer disimpan
  const [searchTerm, setSearchTerm] = useState("");
  const [kanbanType, setKanban] = useState(true); // nilai kanban, apa gunakan kanban atau tidak
  const [sheetNames, setSheetNames] = useState([]); // simpan sheet dari excel
  const [selectedSheet, setSelectedSheet] = useState(null); // Untuk pilih sheet
  const [selectedFields, setSelectedFields] = useState([]); // field yang dipilih untuk setiap material dan dn, untuk hashing, misal ADM, yakni DN + Job No -> Material
  const [dataReal, setDataReal] = useState({
    kanban: "",
    kanbanlength: 0,
    labelSupplier: "",
    labelLength: 0,
  });
  const formats = [
    "M/D/YYYY",
    "D/M/YYYY",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "DD.MM.YYYY",
    "DD.MM.YY",
    "D.M.YY",
    "D.M.YYYY",
    "MMMM D, YYYY",
    "D MMMM YYYY",
    "D MMM YYYY",
    moment.ISO_8601,
  ];
  const [selectedFormat, setSelectedFormat] = useState(null);

  const fetchSchemaFields = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/fields`);
      const data = await res.json();
      setSchemaFields(data);
    } catch (err) {
      console.error("Failed to fetch schema fields:", err);
    }
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
      return null;
    }
  };

  useEffect(() => {
    fetchSchemaFields();
  }, []);

  const [dataSOD, setDataSOD] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);

  useEffect(() => {
    const loadSOD = async () => {
      const data = await fetchSODDiagram();
      setDataSOD(data);

      const uniqueCustomers = [
        ...new Set(data.map((item) => item.customerName.trim())),
      ];
      setAvailableCustomers(uniqueCustomers);
    };

    loadSOD();
  }, []);

  const handleAddSchemaClick = () => {
    setShowSchemaForm(true);
  };

  const normalize = (str) =>
    str
      ?.toString()
      .replace(/[-_/]/g, " ")
      .replace(/\s+/g, "")
      .trim()
      .toLowerCase();

  const matchKodeCustomer = (kode, target) => {
    if (!kode || !target || kode === "") return false;

    const cleanedKode = kode.toLowerCase();
    const cleanedTarget = target.toLowerCase();

    if (cleanedKode === cleanedTarget) {
      // Awalan
      return true;
    } else if (cleanedKode.endsWith("_")) {
      // Awalan
      const base = cleanedKode.slice(0, -1);
      return cleanedTarget.startsWith(base);
    } else if (cleanedKode.startsWith("_")) {
      // Akhiran
      const base = cleanedKode.slice(1);
      return cleanedTarget.endsWith(base);
    } else {
      // Persis (kode murni atau alfanumerik)
      return false;
    }
  };

  const findBestMatchedSOD = (data, selectedCustomerRaw) => {
    const normalizedTarget = normalize(selectedCustomerRaw);

    const byKodeCustomer = data.find((item) =>
      matchKodeCustomer(item.kodeCustomer, normalizedTarget)
    );

    if (byKodeCustomer) return byKodeCustomer;

    // 2. Kalau gagal, pakai fuzzy match customerName
    const byCustomerName = data.find((item) => {
      const cleanedItem = normalize(item.customerName);

      const isSensitive = /\s\d/.test(item.customerName.toLowerCase());
      if (isSensitive) {
        if (cleanedItem.includes("assy") || normalizedTarget.includes("assy")) {
          return (
            normalizedTarget.includes(cleanedItem) ||
            cleanedItem.includes(normalizedTarget)
          );
        }
        return normalizedTarget === cleanedItem;
      }

      return (
        normalizedTarget.includes(cleanedItem) ||
        cleanedItem.includes(normalizedTarget)
      );
    });

    return byCustomerName ?? null;
  };

  const handleSubmitNewSchema = async (e) => {
    e.preventDefault();
    const label = newSchemaLabel.trim();
    const value = label.toLowerCase().replace(/\s+/g, "_");
    if (!label) return;

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value }),
      });
    } catch (err) {
      console.error("Failed to append schema:", err);
    }

    setShowSchemaForm(false);
    setNewSchemaLabel("");
    await fetchSchemaFields();
  };

  const extractColon = (str) => {
    if (typeof str !== "string") {
      return str;
    }

    return str.includes(":") ? str.split(":").slice(1).join(":").trim() : str;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
    setFileName(nameWithoutExt);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: "binary", cellDates: true });

      setSheetNames(workbook.SheetNames); // simpan semua nama sheet
      setSelectedSheet(null); // reset pilihan sebelumnya

      // Simpan workbook untuk dipakai setelah sheet dipilih
      setTimeout(() => {
        window.__xlsWorkbook = workbook; // kamu bisa juga pakai state kalau tidak pakai global
      }, 0);
    };
    reader.readAsBinaryString(file);
  };

  const findHeaderRowIndex = (data) => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const isLikelyHeader =
        row &&
        row.length > 2 &&
        row.every((cell) => typeof cell === "string" && cell.trim() !== "");

      if (isLikelyHeader) {
        return i;
      }
    }
    return 0; // fallback: baris pertama
  };

  const handleSheetSelection = (sheetName) => {
    const workbook = window.__xlsWorkbook;
    if (!workbook) return;

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headerRowIndex = findHeaderRowIndex(rawData);

    if (headerRowIndex === -1) return;

    const rawHeaders = rawData[headerRowIndex];
    const rows = rawData.slice(headerRowIndex + 1);

    const seen = {};
    const headers = rawHeaders.map((header) => {
      let cleanHeader = String(header || "Column").trim();
      if (seen[cleanHeader]) {
        const count = seen[cleanHeader]++;
        cleanHeader = `${cleanHeader} ${count}`;
      } else {
        seen[cleanHeader] = 1;
      }
      return cleanHeader;
    });

    const structuredRows = rows
      .filter((row) =>
        headers.some((_, idx) => row[idx] !== undefined && row[idx] !== null)
      )
      .map((row) => {
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });
    setExcelHeaders(headers);
    setExcelData(structuredRows);
    setShowTabel(true);
  };

  function convertTo24HFormat(timeStr) {
    const [time, modifier] = timeStr.trim().split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:00`;
  }

  function normalizeDeliveryTime(timeRaw) {
    if (!timeRaw) return null;

    if (typeof timeRaw === "string") {
      // Jika AM/PM format
      if (
        timeRaw.toLowerCase().includes("am") ||
        timeRaw.toLowerCase().includes("pm")
      ) {
        return convertTo24HFormat(timeRaw); // hasil "HH:MM:SS"
      }

      // Jika format ISO atau 24-jam langsung ambil jam-menit-detiknya
      const date = new Date(timeRaw);
      if (!isNaN(date)) {
        return date.toTimeString().slice(0, 8); // "HH:MM:SS"
      }

      // Kalau format "09:09" atau "09:09:00"
      const match = timeRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match) {
        const [_, h, m, s = "00"] = match;
        return `${String(h).padStart(2, "0")}:${m}:${s}`;
      }
    } else {
      const date = timeRaw instanceof Date ? timeRaw : new Date(timeRaw);

      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${hours}:${minutes}:${seconds}`;
    }

    return timeRaw;
  }

  function waktuWIBToUTCISOString(timeStrWIB) {
    // Misal: timeStrWIB = "07:52:00"
    if (!(timeStrWIB instanceof Date)) timeStrWIB = new Date(timeStrWIB);
    if (isNaN(timeStrWIB)) return null;

    const hours = timeStrWIB.getHours().toString().padStart(2, "0");
    const minutes = timeStrWIB.getMinutes().toString().padStart(2, "0");
    const seconds = timeStrWIB.getSeconds().toString().padStart(2, "0");

    // const [hh, mm, ss] = timeStrWIB.split(":").map(Number);
    const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0)); // 07:52 UTC

    date.setUTCHours(date.getUTCHours() - 7);

    return date.toISOString(); // Ini hasil UTC yang mewakili 07:52 WIB
  }

  function getSecondsSinceMidnight(dateStrOrObj) {
    const date =
      typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
    return (
      date.getUTCHours() * 3600 +
      date.getUTCMinutes() * 60 +
      date.getUTCSeconds()
    );
  }

  const extractNumber = (str) => {
    if (!str) return null;
    const match = str.match(/\d+/); // cari angka pertama
    return match ? match[0] : null;
  };

  // Untuk kedapannya mungkin perlu simpan set, cek satu per satu cycle dan harus berbeda, karena ada cycle yang malah ga masuk, seperti TMMIN
  function findClosestCycle(deliveryTime, filterSOD, customerName) {
    if (!deliveryTime || !filterSOD || !customerName) return;

    const targetTime = new Date(`1970-01-01T${deliveryTime}Z`);
    let closest = null;

    const targetSeconds = getSecondsSinceMidnight(targetTime);

    filterSOD
      .filter((item) => item.processName.toLowerCase() === "truck out")
      .forEach((item) => {
        const waktuUntukSubmit = waktuWIBToUTCISOString(item.waktu);

        const sodTime = new Date(waktuUntukSubmit);
        const sodSeconds = getSecondsSinceMidnight(sodTime);

        if (sodSeconds <= targetSeconds) {
          const diff = Math.abs(targetSeconds - sodSeconds);
          if (!closest || diff < closest.diff) {
            closest = { cycle: item.cycle, diff };
          }
        }
      });
    return closest?.cycle ?? 1;
  }

  const ColumnSelection = (column) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((i) => i !== column)
        : [...prev, column]
    );
  };

  const handleSeparatorChange = (e) => {
    setSeparator(e.target.value);
  };

  const resetAllStates = () => {
    setFileName("");
    setExcelData([]);
    setExcelHeaders([]);
    setCustomerList([]);
    setMapping({});
    setSelectedCustomer("");
    setSelectedColumns([]);
    setSeparator("");
    setSearchTerm("");
    setShowTabel(false);
    setNewSchemaLabel("");
    setShowSchemaForm(false);
    setSelectedSheet("");
    setSheetNames([]);
    setSelectedFields([]);
    setKanban(null);
    setDataReal({
      kanban: "",
      kanbanlength: 0,
      labelSupplier: "",
      labelLength: 0,
    });
    document.getElementById("dropzone-file").value = "";
  };
  const handleSubmit = async (selectedFormat) => {
    try {
      const cleanedExcelData = excelData.filter((row) => {
        // Cek kalau semua value di row null / undefined / empty string
        return Object.values(row).some(
          (val) =>
            val !== null && val !== undefined && String(val).trim() !== ""
        );
      });

      if (!selectedCustomer && customerList.length === 1) {
        const groupedByCustomer = cleanedExcelData.reduce((acc, row) => {
          const customerRaw = String(customerList[0]);
          const customer = customerRaw
            .replace(/[ \-_/]/g, " ")
            .trim()
            .toLowerCase(); //
          if (!acc[customer]) acc[customer] = [];
          acc[customer].push(row);
          return acc;
        }, {});

        const formatValue = (val) => {
          if (val instanceof Date && !isNaN(val)) {
            const utc = moment.utc(val); // nilai asli UTC dari Excel
            const wib = utc.clone().tz("Asia/Jakarta");

            // Kalau UTC-nya jam 16:00:00 atau lebih, anggap tanggung → geser ke hari berikutnya (karena TMMIN selalu kebaca 23:59 hari sebelumnya)
            if (utc.hour() >= 16) {
              return wib
                .add(1, "day")
                .startOf("day")
                .format("YYYY-MM-DD HH:mm:ss");
            }

            // Kalau nggak, cukup tampilkan sesuai WIB
            return wib.format("YYYY-MM-DD HH:mm:ss");
          }

          const parsed = moment.tz(val, selectedFormat, true, "Asia/Jakarta");

          return parsed.isValid() ? parsed : val;
        };

        const promises = Object.entries(groupedByCustomer).map(
          async ([customer]) => {
            const dataSOD = await fetchSODDiagram();
            const filteredDataSOD = dataSOD.filter((item) => {
              const cleanCustomer = customer
                .replace(/[ \-_/]/g, " ")
                .toLowerCase();
              const cleanCustomerName = item.customerName
                .replace(/[ \-_/]/g, " ")
                .toLowerCase();

              const isSensitive = /\s\d/.test(cleanCustomer);
              if (isSensitive) {
                if (
                  cleanCustomer.includes("assy") ||
                  cleanCustomerName.includes("assy")
                ) {
                  return (
                    cleanCustomer.includes(cleanCustomerName) ||
                    cleanCustomerName.includes(cleanCustomer)
                  );
                }
                return cleanCustomerName === cleanCustomer;
              }

              return (
                cleanCustomer.includes(cleanCustomerName) ||
                cleanCustomerName.includes(cleanCustomer)
              );
            });

            const selectedData = Object.entries(groupedByCustomer).map(
              ([customerName, rows]) => {
                // proses setiap customer secara terpisah
                const customerRows = rows.map((row) => {
                  const orderDeliveryCol = mapping["order_delivery"];
                  const dnNumberCol = mapping["dn_number"];
                  const odAltCol = mapping["od_alternative"];
                  const customerMatCol = mapping["customer_material"];
                  const materialCol = mapping["material"];

                  const orderDeliveryValue = extractColon(
                    formatValue(row[orderDeliveryCol])
                  );
                  const dnNumberValue = formatValue(row[dnNumberCol])?.trim();

                  if (!orderDeliveryValue && !dnNumberValue && !row[odAltCol])
                    return null;
                  if (!row[customerMatCol] && !row[materialCol]) return null;

                  const values = selectedColumns
                    .filter(
                      (col, _, arr) => !(col === "job_no" && arr.length > 1)
                    ) // skip kolom job_no karena kesalahan saya pakai index 0 job_no
                    .map((col) => {
                      let value = formatValue(row[col]);

                      if (col === orderDeliveryCol) {
                        value =
                          orderDeliveryValue?.trim() || dnNumberValue || null;

                        if (!value) {
                          value =
                            formatValue(
                              row[mapping["od_alternative"]]
                            )?.trim() || "";
                        }
                        const match = value?.match(/OD\s+([A-Z0-9]+)/i);
                        const numberOnly = extractNumber(value);
                        if (match) {
                          value = match[1];
                        } else if (numberOnly) value = numberOnly;
                        else {
                          value = extractColon(value);
                          // value = value.trim().split(" ").pop().replace(/\W+$/, "");
                        }
                      } else if (col === odAltCol) {
                        value = value?.trim();

                        const match = value.match(/OD\s+([A-Z0-9]+)/i);
                        const numberOnly = extractNumber(value);

                        if (match) value = match[1];
                        else if (numberOnly) value = numberOnly;
                        else {
                          value = extractColon(value);
                          // value = value.trim().split(" ").pop().replace(/\W+$/, "");
                        }
                      } else {
                        value = extractColon(value);
                      }

                      return value ?? "";
                    });
                  return values.map((v) => v ?? "").join(separator ?? "");
                });

                return {
                  customerName,
                  data: customerRows.filter((r) => r != null),
                };
              }
            );

            const sourceLabelMapping = {};
            Object.entries(mapping).forEach(([schema, excelCol]) => {
              if (excelCol) {
                sourceLabelMapping[schema] = excelCol;
              }
            });

            const kolomSelected = Object.entries(groupedByCustomer).map(
              ([customerName, rows]) => {
                const mappedRows = rows.map((row) => {
                  const obj = Object.entries(mapping).reduce(
                    (acc, [schema, excelCol]) => {
                      let val = row[excelCol] ?? "";
                      acc[schema] = extractColon(val);

                      if (
                        schema === "delivery_date" ||
                        schema === "order_date"
                      ) {
                        acc[schema] = formatValue(val); // hanya format di sini
                      }

                      if (schema === "order_delivery") {
                        val =
                          val ||
                          extractColon(row[mapping.dn_number])?.trim() ||
                          null;

                        if (!val) {
                          val =
                            formatValue(
                              row[mapping["od_alternative"]]
                            )?.trim() || "";
                        }
                        const match = val?.match(/OD\s+([A-Z0-9]+)/i);
                        const numberOnly = extractNumber(val);

                        if (match) val = match[1];
                        else if (numberOnly) val = numberOnly;
                        else extractColon(val);
                        // val = val.trim().split(" ").pop().replace(/\W+$/, "");

                        acc[schema] = val;
                      }

                      if (schema === "od_alternative") {
                        val = val?.trim();

                        const match = val.match(/OD\s+([A-Z0-9]+)/i);
                        const numberOnly = extractNumber(val);
                        if (match) val = match[1];
                        else if (numberOnly) val = numberOnly;
                        else extractColon(val);
                        // val = val.trim().split(" ").pop().replace(/\W+$/, "");

                        acc[schema] = val;
                      }
                      if (schema === "dn_number") {
                        val =
                          val ||
                          extractColon(row[mapping.order_delivery])?.trim() ||
                          null;
                        if (val?.trim() === "" || !val) {
                          if (
                            row[mapping["od_alternative"]] &&
                            row[mapping["od_alternative"]].trim() !== ""
                          ) {
                            val =
                              formatValue(
                                row[mapping["od_alternative"]]
                              )?.trim() || "";
                            const match = val?.match(/OD\s+([A-Z0-9]+)/i);
                            const numberOnly = extractNumber(val);

                            if (match) val = match[1];
                            else if (numberOnly) val = numberOnly;
                            else {
                              val = extractColon(val);
                              // val = val.trim().split(" ").pop().replace(/\W+$/, "");
                            }
                          } else {
                            // Kalau od_alternative juga kosong → return null supaya nanti bisa difilter
                            acc["dn_number"] = null;
                          }
                        }
                        acc[schema] = val;
                      }
                      return acc;
                    },
                    {}
                  );

                  let cycleVal = null;
                  if (
                    obj["delivery_cycle"] !== null &&
                    obj["delivery_cycle"] !== ""
                  ) {
                    const cleaned = String(obj["delivery_cycle"]).replace(
                      /[^\d]/g,
                      ""
                    );
                    cycleVal =
                      cleaned !== "" && !isNaN(cleaned)
                        ? parseInt(cleaned)
                        : null;
                  }

                  if (!cycleVal) {
                    if (obj["delivery_time"]) {
                      const timeRaw = obj["delivery_time"];
                      const deliveryTime = normalizeDeliveryTime(timeRaw);

                      const matchedCycle = findClosestCycle(
                        deliveryTime,
                        filteredDataSOD,
                        customerName
                      );

                      cycleVal = matchedCycle ?? 1;
                    } else {
                      cycleVal = 1;
                    }
                  }

                  obj["delivery_cycle"] = cycleVal;

                  const qty = parseFloat(obj["qty"]);
                  obj["qty"] = parseInt(obj["qty"]);
                  const orderPcs = parseFloat(obj["order_(pcs)"]);
                  obj["order_(pcs)"] = parseInt(obj["order_(pcs)"]);
                  obj["qtyKanban"] =
                    !isNaN(qty) && qty !== 0 && !isNaN(orderPcs)
                      ? Math.max(1, Math.ceil(orderPcs / qty))
                      : 1;

                  if (!obj.dn_number && !obj.order_delivery) return null;
                  return obj;
                });

                return {
                  customerName,
                  data: mappedRows.filter((r) => r !== null), // hasilnya dalam bentuk array per customer
                };
              }
            );

            const mappedPartNo = excelData.map(
              (item) => item[mapping["part_no"]] || item[mapping["material"]]
            );

            const uniquePartName = [
              ...new Set(mappedPartNo.filter(Boolean)),
            ].reduce((acc, key) => {
              acc[key] = 0;
              return acc;
            }, {});

            if (!customerList || !customer) return false;

            const customerName = String(customerList[0]);

            const payload = {
              nama: customerName.replace(/[ \-_/]/g, " ").toUpperCase(),
              kolomSelected:
                kolomSelected.find(
                  (data) =>
                    data.customerName ===
                    customerName.replace(/[ \-_/]/g, " ").toLowerCase()
                )?.data ?? [],
              selectedData:
                selectedData.find(
                  (data) =>
                    data.customerName ===
                    customerName.replace(/[ \-_/]/g, " ").toLowerCase()
                )?.data ?? [],
              sourceValueLabel: sourceLabelMapping,
              separator,
              selectedColumns,
              dataReal,
              selectedCustomer,
              selectedFields,
              uniquePartName,
              customerCode: filteredDataSOD[0].kodeCustomer,
              tracking: filteredDataSOD,
              kanban: kanbanType,
              selectedFormat,
            };

            const res = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/api/data/`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );

            const result = await res.json();
            return result;
          }
        );

        const results = await Promise.all(promises);
        if (results[0].success) alert("Berhasil Menambahkan Data!");

        resetAllStates();
      } else {
        const filteredData = excelData.filter((row) => {
          return (
            row[selectedCustomer] && String(row[selectedCustomer]).trim() !== ""
          );
        });

        const groupedByCustomer = filteredData.reduce((acc, row) => {
          const customerRaw = String(row[selectedCustomer]);

          const mainCustomer = customerRaw
            .split("/")[0]
            .replace(/[-_/]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

          const filteredSOD = dataSOD.filter((item) =>
            customerList.some(
              (c) =>
                item.customerName?.toLowerCase().replace(/\s+/g, "") ===
                c.toLowerCase().replace(/\s+/g, "")
            )
          );

          const cleanedMain = mainCustomer.replace(/\s+/g, "");
          const matchedOriginalName = findBestMatchedSOD(
            filteredSOD,
            cleanedMain
          );

          if (matchedOriginalName) {
            if (!acc[matchedOriginalName.customerName])
              acc[matchedOriginalName.customerName] = [];
            acc[matchedOriginalName.customerName].push(row);
          }

          return acc;
        }, {});
        const promises = Object.entries(groupedByCustomer).map(
          async ([customer]) => {
            const dataSOD = await fetchSODDiagram();
            const filteredDataSOD = dataSOD.filter((item) => {
              const cleanCustomer = customer
                .replace(/[ \-_/]/g, " ")
                .toLowerCase();
              const cleanCustomerName = item.customerName
                .replace(/[ \-_/]/g, " ")
                .toLowerCase();

              const isSensitive = /\s\d/.test(cleanCustomer);
              if (isSensitive) {
                if (
                  cleanCustomer.includes("assy") ||
                  cleanCustomerName.includes("assy")
                ) {
                  return (
                    cleanCustomer.includes(cleanCustomerName) ||
                    cleanCustomerName.includes(cleanCustomer)
                  );
                }
                return cleanCustomerName === cleanCustomer;
              }

              return (
                cleanCustomer.includes(cleanCustomerName) ||
                cleanCustomerName.includes(cleanCustomer)
              );
            });

            const formatValue = (val) => {
              if (val instanceof Date && !isNaN(val)) {
                const utc = moment.utc(val);
                const wib = utc.clone().tz("Asia/Jakarta");

                // Kalau UTC-nya jam 16:00:00 atau lebih, anggap tanggung → geser ke hari berikutnya
                if (utc.hour() >= 16) {
                  return wib
                    .add(1, "day")
                    .startOf("day")
                    .format("YYYY-MM-DD HH:mm:ss");
                }

                // Kalau nggak, cukup tampilkan sesuai WIB
                return wib.format("YYYY-MM-DD HH:mm:ss");
              }

              const parsed = moment.tz(
                val,
                selectedFormat,
                true,
                "Asia/Jakarta"
              );

              return parsed.isValid() ? parsed : val;
            };

            const filterSelectedCustomer = filteredData.filter((row) => {
              const customerFieldValue = row[selectedCustomer];
              if (!customerFieldValue) return;

              const normalized = customerFieldValue
                .toString()
                .split("/")[0]
                .replace(/[-_/]/g, " ")
                .replace(/\s+/g, " ") // 🔥 ini penting
                .trim()
                .toLowerCase();

              const trueTarget = findBestMatchedSOD(
                filteredDataSOD,
                normalized
              );

              return trueTarget;
            });

            const selectedData = filterSelectedCustomer
              .map((row) => {
                const orderDeliveryCol = mapping["order_delivery"];
                const dnNumberCol = mapping["dn_number"];
                const odAltCol = mapping["od_alternative"];
                const customerMatCol = mapping["customer_material"];
                const materialCol = mapping["material"];

                const orderDeliveryValue = extractColon(
                  formatValue(row[orderDeliveryCol])
                );
                const dnNumberValue = formatValue(row[dnNumberCol])?.trim();

                if (!orderDeliveryValue && !dnNumberValue && !row[odAltCol])
                  return null;

                if (!row[customerMatCol] && !row[materialCol]) return null;

                const values = selectedColumns
                  .filter(
                    (col, _, arr) => !(col === "job_no" && arr.length > 1)
                  ) // ambil selain job_no
                  .map((col) => {
                    let value = formatValue(row[col]);

                    if (col === orderDeliveryCol) {
                      value =
                        orderDeliveryValue?.trim() || dnNumberValue || null;

                      if (!value) {
                        value =
                          formatValue(row[mapping["od_alternative"]])?.trim() ||
                          "";
                      }
                      const match = value?.match(/OD\s+([A-Z0-9]+)/i);
                      const numberOnly = extractNumber(value);

                      if (match) {
                        value = match[1];
                      } else if (numberOnly) value = numberOnly;
                      else {
                        value = extractColon(value);

                        // value = value.trim().split(" ").pop().replace(/\W+$/, "");
                      }
                    } else if (col === odAltCol) {
                      value = value?.trim();

                      const match = value.match(/OD\s+([A-Z0-9]+)/i);
                      const numberOnly = extractNumber(value);

                      if (match) value = match[1];
                      else if (numberOnly) value = numberOnly;
                      else {
                        value = extractColon(value);
                      }
                    } else {
                      value = extractColon(value);
                    }

                    return value ?? "";
                  });
                return values.map((v) => v ?? "").join(separator ?? "");
              })
              .filter((r) => r != null);

            const sourceLabelMapping = {};
            Object.entries(mapping).forEach(([schema, excelCol]) => {
              if (excelCol) {
                sourceLabelMapping[schema] = excelCol;
              }
            });

            const kolomSelected = Object.entries(groupedByCustomer).map(
              ([customerName, rows]) => {
                const mappedRows = rows
                  .map((row) => {
                    const obj = Object.entries(mapping).reduce(
                      (acc, [schema, excelCol]) => {
                        let val = row[excelCol] ?? "";

                        acc[schema] = extractColon(val);
                        if (
                          schema === "delivery_date" ||
                          schema === "order_date"
                        ) {
                          acc[schema] = formatValue(val); // hanya format di sini
                        }
                        if (schema === "order_delivery") {
                          val =
                            val ||
                            extractColon(row[mapping.dn_number])?.trim() ||
                            null;

                          if (!val) {
                            val =
                              formatValue(
                                row[mapping["od_alternative"]]
                              )?.trim() || "";
                          }
                          const match = val?.match(/OD\s+([A-Z0-9]+)/i);
                          const numberOnly = extractNumber(val);
                          if (match) {
                            val = match[1];
                          } else if (numberOnly) val = numberOnly;
                          else {
                            val = extractColon(val);
                            // val = val.trim().split(" ").pop().replace(/\W+$/, "");
                          }

                          acc[schema] = val;
                        }

                        if (schema === "od_alternative") {
                          val = val?.trim();

                          const match = val.match(/OD\s+([A-Z0-9]+)/i);
                          const numberOnly = extractNumber(val);

                          if (match) val = match[1];
                          else if (numberOnly) val = numberOnly;
                          else {
                            val = extractColon(val);
                          }
                          acc[schema] = val;
                        }

                        if (schema === "dn_number") {
                          val =
                            val ||
                            extractColon(row[mapping.order_delivery])?.trim() ||
                            null;
                          if (val?.trim() === "" || !val) {
                            if (
                              row[mapping["od_alternative"]] &&
                              row[mapping["od_alternative"]].trim() !== ""
                            ) {
                              val =
                                formatValue(
                                  row[mapping["od_alternative"]]
                                )?.trim() || "";
                              const match = val?.match(/OD\s+([A-Z0-9]+)/i);
                              const numberOnly = extractNumber(val);
                              if (match) {
                                val = match[1];
                              } else if (numberOnly) val = numberOnly;
                              else {
                                val = extractColon(val);
                                // val = val.trim().split(" ").pop().replace(/\W+$/, "");
                              }
                            } else {
                              // Kalau od_alternative juga kosong → return null supaya nanti bisa difilter
                              acc["dn_number"] = null;
                            }
                          }
                          acc[schema] = val;
                        }
                        return acc;
                      },
                      {}
                    );

                    let cycleVal = null;
                    if (
                      obj["delivery_cycle"] !== null &&
                      obj["delivery_cycle"] !== ""
                    ) {
                      const cleaned = String(obj["delivery_cycle"]).replace(
                        /[^\d]/g,
                        ""
                      );
                      cycleVal =
                        cleaned !== "" && !isNaN(cleaned)
                          ? parseInt(cleaned)
                          : null;
                    }

                    if (!cycleVal || cycleVal == "") {
                      if (obj["delivery_time"]) {
                        const timeRaw = obj["delivery_time"];
                        const deliveryTime = normalizeDeliveryTime(timeRaw);

                        const matchedCycle = findClosestCycle(
                          deliveryTime,
                          filteredDataSOD,
                          customerName
                        );

                        cycleVal = matchedCycle ?? 1;
                      } else {
                        cycleVal = 1;
                      }
                    }

                    obj["delivery_cycle"] = cycleVal;

                    const qty = parseFloat(obj["qty"]);
                    obj["qty"] = parseInt(obj["qty"]);
                    const orderPcs = parseFloat(obj["order_(pcs)"]);
                    obj["order_(pcs)"] = parseInt(obj["order_(pcs)"]);

                    obj["qtyKanban"] =
                      !isNaN(qty) && qty !== 0 && !isNaN(orderPcs)
                        ? Math.max(1, Math.ceil(orderPcs / qty))
                        : 1;

                    if (!obj.dn_number || !obj.order_delivery) return null;
                    return obj;
                  })
                  .filter((r) => r !== null);

                const allMaterialKosong = mappedRows.every(
                  (r) => !r["material"]
                );

                const filteredRows = allMaterialKosong
                  ? mappedRows // biarkan saja
                  : mappedRows.filter((r) => r["material"]); // buang yang kosong

                return {
                  customerName,
                  data: filteredRows, // hasilnya dalam bentuk array per customer
                };
              }
            );

            const mappedPartNo = excelData.map(
              (item) => item[mapping["part_no"]] || item[mapping["material"]]
            );

            const uniquePartName = [
              ...new Set(mappedPartNo.filter(Boolean)),
            ].reduce((acc, key) => {
              acc[key] = 0;
              return acc;
            }, {});

            const customerName = customerList.find((target) => {
              if (!target || !customer) return false;

              const cleanedTarget = target
                .toLowerCase()
                .replace(/[-_/]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

              const cleanedCustomer = customer
                .toLowerCase()
                .replace(/[-_/]/g, " ")
                .replace(/\s+/g, " ")
                .trim();

              const isSensitive = /\s\d/.test(cleanedCustomer);
              if (isSensitive) {
                return cleanedTarget === cleanedCustomer;
              }
              const noSpaceCustomer = cleanedCustomer.replace(/\s+/g, "");
              const noSpaceTarget = cleanedTarget.replace(/\s+/g, "");

              return noSpaceTarget.includes(noSpaceCustomer);
            });

            const payload = {
              nama: customerName.replace(/[ \-_/]/g, " ").toUpperCase(),
              kolomSelected:
                kolomSelected.find((data) => {
                  const dataName = data.customerName
                    .toLowerCase()
                    .replace(/[-_/]/g, " ")
                    .replace(/\s+/g, "");

                  const targetName = customerName
                    .toLowerCase()
                    .replace(/[-_/]/g, " ")
                    .replace(/\s+/g, "");
                  return dataName === targetName;
                })?.data ?? [],
              selectedData,
              sourceValueLabel: sourceLabelMapping,
              separator,
              selectedColumns,
              dataReal,
              selectedCustomer,
              selectedFields,
              uniquePartName,
              tracking: filteredDataSOD,
              kanban: kanbanType,
              selectedFormat,
            };

            const res = await fetch(
              `${import.meta.env.VITE_BACKEND_URL}/api/data/`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );

            const result = await res.json();
            return result;
          }
        );
        const results = await Promise.all(promises);
        const allSuccess = results.every((r) => r.success);
        if (allSuccess) {
          alert("Berhasil Menambahkan Data!");
        } else {
          alert("Sebagian data gagal ditambahkan.");
        }
        resetAllStates();
      }
    } catch (err) {
      console.error(err);
      alert("Error Submitting Data");
    }
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "Apakah Anda yakin ingin menghapus user ini?"
    );
    if (!confirmation) return;

    try {
      const data = await api.delete(`/fields/${id}`);
      if (data.data.success) {
        setNewSchemaLabel("");
        await fetchSchemaFields();
        return { success: true, message: "Field berhasil dihapus!" };
      } else {
        return {
          success: false,
          message: data.message || "Gagal mengambil data!",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Gagal menghapus user",
      };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-2">
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
              <span className="text-blue-400">Click to upload</span> or drag and
              drop
            </h1>
            <p className="text-lg text-gray-500">.xlsx atau .xls (Max. )</p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .xlsm"
          />
        </label>

        {fileName && (
          <div className="mt-4 py-2 px-4 bg-blue-50 rounded-lg">
            <p className="py-5 text-lg">
              Nama File:{" "}
              <span className="font-bold text-[#2c64c7]">
                {fileName.toUpperCase()}
              </span>
            </p>
          </div>
        )}

        {sheetNames.length > 0 && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <label
              htmlFor="sheet-select"
              className="block text-lg font-medium text-gray-600 mb-2"
            >
              Pilih Sheet:
            </label>
            <select
              id="sheet-select"
              onChange={(e) => {
                const name = e.target.value;
                setSelectedSheet(name);
                handleSheetSelection(name);
              }}
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-blue-400 focus:border-blue-400"
            >
              <option value=""> Pilih </option>
              {sheetNames.map((name, idx) => (
                <option key={idx} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {fileName && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {availableCustomers.map((name, idx) => (
              <div
                key={idx}
                className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <label className="flex items-center cursor-pointer w-full">
                  <input
                    type="checkbox"
                    value={name}
                    checked={customerList.includes(name)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const value = e.target.value;
                      setCustomerList((prev) =>
                        checked
                          ? [...prev, value]
                          : prev.filter((n) => n !== value)
                      );
                    }}
                    className="
            appearance-none w-5 h-5 border-2 border-blue-600 rounded 
            mr-3 cursor-pointer relative flex items-center justify-center
            checked:bg-blue-600 checked:border-blue-600
            hover:border-blue-700 focus:ring-2 focus:ring-blue-200
            focus:outline-none transition-colors
            before:content-[''] before:absolute before:bg-white
            before:w-[6px] before:h-[10px] before:border-r-2 before:border-b-2
            before:border-white before:rotate-45 before:opacity-0
            before:checked:opacity-100 before:-mt-[2px]
          "
                  />
                  <span className="text-blue-600 text-sm font-medium select-none">
                    {name}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}

        {customerList.length > 1 && (
          <div className="mb-8 px-6 bg-gray-50 rounded-lg">
            <label className="block text-lg font-medium text-gray-600 mb-2">
              Pilih Customer:
            </label>
            <select
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-blue-400 focus:border-blue-400"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Pilih Customer</option>
              {excelHeaders.length > 0 &&
                excelHeaders.map((column, idx) => (
                  <option key={idx} value={column}>
                    {column}
                  </option>
                ))}
            </select>
          </div>
        )}

        {fileName && (
          <div className="mb-8 px-6 bg-gray-50 rounded-lg">
            <label className="block text-lg font-medium text-gray-600 mb-2">
              Pilih Format:
            </label>
            <select
              className="w-full p-3 border-2 border-gray-300 rounded-md focus:ring-blue-400 focus:border-blue-400"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="">Pilih </option>
              {formats.map((format, idx) => (
                <option key={idx} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
        )}

        {showTabel && selectedSheet && (
          <div className="overflow-hidden border border-gray-200 shadow-sm mt-10">
            <div className="overflow-x-auto max-w-full h-[300px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    {excelHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excelData.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      {excelHeaders.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        >
                          {row[header] !== undefined
                            ? row[header].toString()
                            : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showTabel && excelHeaders.length > 0 && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Pilih Kolom
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schemaFields.data.map((schema, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {schema.label}
                  </label>
                  <select
                    className="w-full p-2 border-2 border-gray-300 rounded-md focus:ring-blue-400 focus:border-blue-400"
                    value={mapping[schema.value] || ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [schema.value]:
                          (schema.value === "delivery_cycle" &&
                            e.target.value == null) ||
                          undefined ||
                          e.target.value === ""
                            ? null
                            : e.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih Field</option>
                    {excelHeaders.map((column, index) => (
                      <option key={index} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                  <DeleteField successDelete={() => handleDelete(schema._id)} />
                </div>
              ))}
            </div>
            <div className="mt-6">
              {!showSchemaForm ? (
                <button
                  className="flex items-center gap-2 bg-[#105bdf] text-white px-4 py-2 rounded hover:bg-[#2c64c7]"
                  onClick={handleAddSchemaClick}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Tambah Field Baru
                </button>
              ) : (
                <div className="bg-white p-4 rounded-md shadow-sm mt-4">
                  <h4 className="text-lg fotn-medium text-gray-700 mb-2">
                    Tambah Field Baru
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan label schema"
                      className="flex-1 p-2 border-2 border-gray-300 rounded-md focus:ring-blue-400 focus:border-blue-400"
                      value={newSchemaLabel}
                      onChange={(e) => setNewSchemaLabel(e.target.value)}
                    />
                    <button
                      type="submit"
                      className=" bg-[#27b387] text-white px-4 py-2 rounded-md hover:bg-[#1d8665] transition-colors"
                      onClick={handleSubmitNewSchema}
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showTabel && (
          <div>
            <div className="mb-6 p-4 bg-gray-50">
              <h3 className="text-gray-700 font-medium text-lg mb-2 block">
                3 Point Check
              </h3>

              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="agreement"
                    className="peer hidden"
                    onChange={() => setKanban(false)}
                  />
                  <div
                    className="w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center mr-2
                    peer-checked:border-emerald-600 peer-checked:bg-emerald-500 transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                  </div>
                  <span className="text-gray-600 peer-checked:text-emerald-600 font-medium transition-colors">
                    Tidak ada Kanban
                  </span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="agreement"
                    className="peer hidden"
                    onChange={() => setKanban(true)}
                  />
                  <div
                    className="w-5 h-5 rounded-full border-2 border-rose-500 flex items-center justify-center mr-2
                    peer-checked:border-rose-600 peer-checked:bg-rose-500 transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                  </div>
                  <span className="text-gray-600 peer-checked:text-rose-600 font-medium transition-colors">
                    Ada Kanban
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schemaFields?.data?.length > 0 ? (
                schemaFields.data.map((schema, idx) => (
                  <label
                    key={`${schema.value}-${idx}`}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedFields.includes(schema.value)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={schema.value}
                      checked={selectedFields.includes(schema.value)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const value = schema.value;

                        setSelectedFields((prev) =>
                          checked
                            ? [...prev, value]
                            : prev.filter((v) => v !== value)
                        );
                      }}
                      className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {schema.label}
                    </span>
                  </label>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-gray-500">
                  Tidak ada data yang tersedia
                </div>
              )}
            </div>

            <div className="mb-8">
              <div>
                {kanbanType && (
                  <div className="mb-6 p-4 bg-gray-50">
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                      Pilih Pemisah Data:
                    </label>
                    <input
                      type="text"
                      className="p-2 border-2 border-gray-300 rounded-md max-w-xs"
                      value={separator}
                      placeholder="Karakter :, ;, |"
                      onChange={handleSeparatorChange}
                    />
                  </div>
                )}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Pilih Kode Unik
                    </h2>

                    <div className="relative w-full sm:w-xl">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Cari kolom..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {excelHeaders
                      .filter((col) => {
                        return col
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase());
                      })
                      .map((col, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-md border transition-all ${
                            selectedColumns.includes(col)
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-400 "
                              type="checkbox"
                              checked={selectedColumns.includes(col)}
                              onChange={() => ColumnSelection(col)}
                            />
                            <span
                              className="text-sm font-medium text-gray-700 truncate"
                              title={col}
                            >
                              {col}
                            </span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masukkan Label Supplier
                  </label>
                  <input
                    type="text"
                    name="labelSupplier"
                    value={dataReal.labelSupplier}
                    onChange={(e) =>
                      setDataReal({
                        ...dataReal,
                        labelSupplier: e.target.value,
                        labelLength: e.target.value.length,
                      })
                    }
                    placeholder="Contoh: NT-0050"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {kanbanType && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Masukkan Kanban
                    </label>
                    <input
                      type="text"
                      name="kanban"
                      value={dataReal.kanban}
                      onChange={(e) =>
                        setDataReal({
                          ...dataReal,
                          kanban: e.target.value.toUpperCase(),
                          kanbanlength: e.target.value.length,
                        })
                      }
                      placeholder="Contoh: DN00099944ANT-0050"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 uppercase"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3">
          <button
            className="inline-flex  cursor-pointer px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm bg-[#2c64c7] text-white hover:bg-[#105bdf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c64c7] transition-colors"
            onClick={() => handleSubmit(selectedFormat)}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default Excel;
