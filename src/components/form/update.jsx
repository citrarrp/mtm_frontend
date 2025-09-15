import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import moment from "moment-timezone";
import api from "../../utils/api";
import axios from "axios";

//mirip excel
function UpdateForm() {
  const [fileName, setFileName] = useState("");
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [existingCustomersData, setExistingCustomersData] = useState({});
  const [mapping, setMapping] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerCol, setSelectedCustomerCol] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dbCustomers, setDbCustomers] = useState([]);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [SOD, setSOD] = useState([]);
  const [doneSearch, setDoneSearch] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const result = await api.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/data/selectedCust/db`
        );

        if (result.data.success) {
          setDbCustomers(result.data.data);
        }
      } catch (err) {
        console.error("Gagal fetch customer dari DB", err);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchExistingData = async () => {
      if (customerList.length === 0) return;
      setIsLoading(true);
      try {
        if (customerList.length === 1) {
          const { data } = await api.get(
            `${
              import.meta.env.VITE_BACKEND_URL
            }/api/data/customer/${encodeURIComponent(customerList[0])}`
          );

          setExistingCustomersData(data);

          if (data?.success) {
            setMapping(data.data.sourceValueLabel || {});
            setSelectedColumns(data.data.selectedColumns || []);
            setSelectedFormat(data.data?.formatDate);
          }
        } else {
          const promises = customerList.map(async (customer) => {
            const { data } = await api.get(
              `${
                import.meta.env.VITE_BACKEND_URL
              }/api/data/customer/${encodeURIComponent(customer)}`
            );
            return data;
          });

          const results = await Promise.all(promises);
          setExistingCustomersData(results);

          if (results[0]?.success) {
            setMapping(results[0].data.sourceValueLabel || {});
            setSelectedColumns(results[0].data.selectedColumns || []);
            setSelectedFormat(results[0].data?.formatDate);
          }
        }
      } catch (err) {
        console.error("Failed to fetch existing data:", err);
        alert("Data customer tidak ada!");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [customerList]);

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
    setFileName(nameWithoutExt);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        setSheetNames(workbook.SheetNames); // simpan semua nama sheet
        setSelectedSheet(null);

        setTimeout(() => {
          window.__xlsWorkbook = workbook;
        }, 0);
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Format File Tidak Valid!");
      }
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
    setShowTable(true);
  };

  useEffect(() => {
    const loadSODDiagram = async () => {
      const data = await fetchSODDiagram();

      const uniqueCustomers = [
        ...new Set(data.map((item) => item.customerName.trim())),
      ];
      setAvailableCustomers(uniqueCustomers);
      setSOD(data);
    };

    loadSODDiagram();
  }, []);

  const extractColon = (str) => {
    if (typeof str !== "string") return str;
    return str.includes(":") ? str.split(":").slice(1).join(":").trim() : str;
  };

  const normalize = (str) => {
    if (typeof str !== "string") return str;

    return str
      .toString()
      .toLowerCase()
      .split("/")[0]
      .replace(/[-_]+/g, " ")
      .replace(/([a-zA-Z])(\d)/g, "$1 $2") // pisahin huruf dan angka
      .replace(/\s+/g, " ") //spasi ga double
      .trim();
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
      // Kalau AM/PM format
      if (
        timeRaw.toLowerCase().includes("am") ||
        timeRaw.toLowerCase().includes("pm")
      ) {
        return convertTo24HFormat(timeRaw); // hasil "HH:MM:SS"
      }

      // Kalau format ISO atau 24-jam langsung ambil jam-menit-detiknya
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
    // karena kesalahan format dari awal
    // Misal: timeStrWIB = "07:52:00"
    if (!(timeStrWIB instanceof Date)) timeStrWIB = new Date(timeStrWIB);
    if (isNaN(timeStrWIB)) return null;

    const hours = timeStrWIB.getHours().toString().padStart(2, "0");
    const minutes = timeStrWIB.getMinutes().toString().padStart(2, "0");
    const seconds = timeStrWIB.getSeconds().toString().padStart(2, "0");

    const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0)); // 07:52 UTC

    date.setUTCHours(date.getUTCHours() - 7);

    return date.toISOString(); // Ini hasil UTC yang 07:52 WIB
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

  // ini karena di excel tiap customer ga semua kasih penanda customer tersebut apa, jadi butuh kode. Seprti TMMIN dengan no manifest (angka pertama)
  const findCustomerFromCode = (val, SODDiagram) => {
    // Mencari kode customer di dataSODDiagram dan mendapatkan nama
    const customerFromCode = SODDiagram.find((item) => {
      const cleanedKode = item.kodeCustomer.toLowerCase();
      const cleanedTarget = val.toLowerCase();

      if (cleanedKode === cleanedTarget) {
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
        if (cleanedKode === "") {
          const customer = normalize(val);

          const normalizedTarget = normalize(item.customerName);
          return normalizedTarget.includes(customer);
        }
        return false;
      }
    });

    if (customerFromCode) {
      return customerFromCode.customerName;
    }

    return null; // Kode customer tidak ditemukan
  };

  const matchCustomerWithDB = (customerName, customers) => {
    // Normalisasi nama customer yang akan dicocokkan
    const normalizedCustomerName = normalize(customerName).toLowerCase();
    // Cari customer di dbCustomers yang cocok dengan nama yang ada di dataSODDiagram
    return customers.find((cust) =>
      normalize(cust.nama).toLowerCase().includes(normalizedCustomerName)
    );
  };

  const processMatching = (val, SODDiagram, customers) => {
    if (!val) return null;

    const directMatch = customers.find(
      (cust) =>
        normalize(cust.nama).toLowerCase() === normalize(val).toLowerCase()
    );
    if (directMatch) {
      return directMatch;
    }

    const customerName = findCustomerFromCode(val, SODDiagram);

    if (!customerName) {
      return null;
    }

    // Cari customer berdasarkan nama yang ada di dataSODDiagram
    const matchedCustomer = matchCustomerWithDB(customerName, customers);

    if (matchedCustomer) {
      return matchedCustomer;
    } else {
      return null;
    }
  };
  const extractNumber = (str) => {
    if (!str) return null;
    const match = str.match(/\d+/); // cari angka pertama
    return match ? match[0] : null;
  };

  function findClosestCycle(deliveryTime, dataSODDiagram, customerName) {
    if (!deliveryTime || !dataSODDiagram || !customerName) return null;

    const targetTime = new Date(`1970-01-01T${deliveryTime}Z`);
    let closest = null;

    const targetSeconds = getSecondsSinceMidnight(targetTime);

    dataSODDiagram
      .filter((item) => item.processName.toLowerCase() === "truck out")
      .forEach((item) => {
        const waktuUntukSubmit = waktuWIBToUTCISOString(item.waktu);
        const SODDiagramTime = new Date(waktuUntukSubmit);
        const SODDiagramSeconds = getSecondsSinceMidnight(SODDiagramTime);

        if (SODDiagramSeconds <= targetSeconds) {
          const diff = Math.abs(targetSeconds - SODDiagramSeconds);
          if (!closest || diff < closest.diff) {
            closest = { cycle: item.cycle, diff };
          }
        }
      });
    return closest?.cycle ?? 1;
  }

  const handleSearch = () => {
    let detectedCol = null;
    const matchedCustomers = new Set();

    const customerSelect = dbCustomers.filter((item) =>
      customerList.includes(item?.nama)
    );

    const filteredSOD = SOD.filter((item) =>
      customerList.includes(item?.customerName)
    );

    excelData.forEach((row) => {
      customerSelect.forEach((cust) => {
        const col = cust.selectedCustomer;
        if (!col || !row[col]) return;

        const matched = processMatching(row[col], filteredSOD, customerSelect);
        if (matched) {
          matchedCustomers.add(matched.nama);
          detectedCol = col;
        }
      });
    });

    if (detectedCol) {
      setSelectedCustomerCol(detectedCol);
      setCustomerList(Array.from(matchedCustomers));
    }
    if (customerSelect && filteredSOD) setDoneSearch(true);
  };

  const handleReset = () => {
    document.getElementById("dropzone-file").value = "";
    setFileName("");
    setExcelData([]);
    setExcelHeaders([]);
    setCustomerList([]);
    setMapping({});
    setSelectedColumns([]);
    setShowTable();
    setSelectedSheet("");
    setSheetNames([]);
  };

  const filterData = useMemo(() => {
    if (!excelData && !selectedCustomerCol) return;
    else
      return excelData.filter((row) => {
        return (
          row[selectedCustomerCol] &&
          String(row[selectedCustomerCol]).trim() !== ""
        );
      });
  }, [excelData, selectedCustomerCol]);

  useEffect(() => {
    if (dbCustomers.length == 0) return;
  }, [excelData, selectedCustomerCol, dbCustomers, filterData]);

  const handleUpdate = async () => {
    if (
      !Array.isArray(excelData) ||
      !existingCustomersData ||
      excelData.length === 0
    )
      return;
    try {
      setIsLoading(true);

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

      const dataSODDiagram = await fetchSODDiagram();

      if (customerList.length === 1) {
        const customer = customerList[0];

        const stepCycle = dataSODDiagram.filter(
          (item) =>
            item.customerName.toLowerCase().trim() ===
              customer.toLowerCase().trim() ||
            item.customerName
              .toLowerCase()
              .trim()
              .includes(customer.toLowerCase().trim())
        );

        const customerData = existingCustomersData;
        if (!customerData) {
          return Promise.resolve({
            success: false,
            message: `Data ${customer} tidak ditemukan!`,
          });
        } else {
          const separator = customerData.data.separator;

          const selectedData = excelData
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
                .filter((col, _, arr) => !(col === "job_no" && arr.length > 1)) // skip kolom pertama
                .map((col) => {
                  let value = formatValue(row[col]);

                  if (col === orderDeliveryCol) {
                    value = orderDeliveryValue?.trim() || dnNumberValue || null;

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

              return values.join(separator ?? "");
            })
            .filter((r) => r != null);

          const KolomSelected = excelData
            .map((row) => {
              const obj = Object.entries(mapping).reduce(
                (acc, [schema, excelCol]) => {
                  // if (!Object.hasOwn(mapping, "delivery_cycle")) {
                  //   acc["delivery_cycle"] = 1;
                  // }
                  let val = row[excelCol] ?? "";
                  acc[schema] = extractColon(val);

                  if (schema === "delivery_date" || schema === "order_date") {
                    acc[schema] = formatValue(val); // hanya format di sini
                  }
                  if (schema === "order_delivery") {
                    val =
                      val ||
                      extractColon(row[mapping.dn_number])?.trim() ||
                      null;

                    if (!val) {
                      val =
                        formatValue(row[mapping["od_alternative"]])?.trim() ||
                        "";
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
                          formatValue(row[mapping["od_alternative"]])?.trim() ||
                          "";
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
                  cleaned !== "" && !isNaN(cleaned) ? parseInt(cleaned) : null;
              }

              if (!cycleVal || cycleVal == "") {
                if (obj["delivery_time"]) {
                  const timeRaw = obj["delivery_time"];
                  const deliveryTime = normalizeDeliveryTime(timeRaw);

                  const matchedCycle = findClosestCycle(
                    deliveryTime,
                    stepCycle,
                    customer
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
                  ? Math.round(orderPcs / qty)
                  : 1;

              if (!obj.dn_number && !obj.order_delivery) return null;
              return obj;
            })
            .filter((r) => r != null);

          const payload = {
            kolomSelected: {
              data: KolomSelected,
              createdAt: new Date(),
              selectedData,
            },
            matchedCycle: stepCycle,
          };

          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/data/${
              customerData.data._id
            }`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const res = await response.json();

          if (res.success) {
            alert("Data berhasil diupdate untuk semua customer!");
          } else {
            alert(`Update gagal untuk customer ${customerData.data.nama}`);
          }
        }
      } else {
        const updatePromises = customerList.map(async (customer) => {
          const stepCycle = dataSODDiagram.filter((item) =>
            item.customerName.trim().includes(customer.trim())
          );

          const customerData = existingCustomersData.find((c) =>
            c.data.nama.toLowerCase().includes(customer.toLowerCase())
          );

          if (!customerData) {
            return {
              success: false,
              message: `Data not found for ${customer}`,
            };
          }

          const filteredData = excelData.filter((row) => {
            const customerFieldValue = row[selectedCustomerCol];

            if (!customerFieldValue) return false;

            const matched = processMatching(
              customerFieldValue,
              SOD.filter((item) =>
                item.customerName.toLowerCase().includes(customer.toLowerCase())
              ),
              dbCustomers.filter((c) =>
                c.nama.toLowerCase().includes(customer.toLowerCase())
              )
            );

            return !!matched;
          });

          const separator = customerData.data.separator;

          const selectedData = filteredData
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
                .filter((col, _, arr) => !(col === "job_no" && arr.length > 1)) // ambil selain job_no
                .map((col) => {
                  let value = formatValue(row[col]);

                  if (col === orderDeliveryCol) {
                    value = orderDeliveryValue?.trim() || dnNumberValue || null;

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

              return values.join(separator ?? "");
            })
            .filter((r) => r != null);

          const KolomSelected = filteredData
            .map((row) => {
              const obj = Object.entries(mapping).reduce(
                (acc, [schema, excelCol]) => {
                  let val = row[excelCol] ?? "";

                  acc[schema] = extractColon(val);

                  if (schema === "delivery_date" || schema === "order_date") {
                    acc[schema] = formatValue(val); // hanya format di sini
                  }
                  if (schema === "order_delivery") {
                    val =
                      val ||
                      extractColon(row[mapping.dn_number])?.trim() ||
                      null;

                    if (!val) {
                      val =
                        formatValue(row[mapping["od_alternative"]])?.trim() ||
                        "";
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
                          formatValue(row[mapping["od_alternative"]])?.trim() ||
                          "";
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
                  cleaned !== "" && !isNaN(cleaned) ? parseInt(cleaned) : null;
              }

              if (!cycleVal || cycleVal == "") {
                if (obj["delivery_time"]) {
                  const timeRaw = obj["delivery_time"];
                  const deliveryTime = normalizeDeliveryTime(timeRaw);

                  const matchedCycle = findClosestCycle(
                    deliveryTime,
                    stepCycle,
                    customer
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
            })
            .filter((r) => r !== null);

          // const tomorrow = new Date(today);
          // tomorrow.setDate(today.getDate() + 1);

          const payload = {
            kolomSelected: {
              data: KolomSelected,
              createdAt: new Date(),
              selectedData,
            },
            matchedCycle: stepCycle,
          };

          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/data/${
              customerData.data._id
            }`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          return res.json();
        });

        const results = await Promise.all(updatePromises);
        const allSuccess = results.every((r) => r.success);

        if (allSuccess) {
          alert("Data berhasil diupdate untuk semua customer!");
        } else {
          const errors = results
            .filter((r) => !r.success)
            .map((r) => r.message);
          alert(`Beberapa update gagal:\n${errors.join("\n")}`);
        }
      }
    } catch (err) {
      console.error("Update error:", err.message);
      alert("Error updating data");
    } finally {
      setIsLoading(false);
      handleReset();
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Update Data Customer</h2>

      {isLoading && (
        <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded">
          Memproses data...
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="dropzone-file" className="block mb-2 font-medium">
          Upload File Excel Baru
        </label>
        <input
          id="dropzone=file"
          type="file"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          onChange={handleFileUpload}
          accept=".xlsx, .xls, .xlsm"
          disabled={isLoading}
        />
      </div>

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

      {showTable && selectedSheet && customerList.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Preview Data</h3>
          <div className="max-h-100 overflow-auto border rounded">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 border text-left text-sm">No</th>
                  {excelHeaders.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-2 border text-left text-sm"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-sm">{index + 1}</td>
                    {excelHeaders.map((header, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 border text-sm">
                        {row[header]?.toString() || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {excelData.length > 5 && (
              <div className="text-center py-2 text-sm text-gray-500 bg-gray-50">
                Menampilkan 5 dari {excelData.length} baris
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={handleSearch}
          disabled={excelData.length === 0 || customerList.length < 1}
          className="px-4 py-2 text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:bg-emerald-300 text-sm"
        >
          Search
        </button>
        <button
          onClick={handleUpdate}
          disabled={
            isLoading ||
            excelData.length === 0 ||
            selectedColumns.length < 1 ||
            (!selectedCustomerCol && customerList.length > 1) ||
            !doneSearch
          }
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300 text-sm"
        >
          {isLoading ? "Memproses..." : "Update Data"}
        </button>
      </div>
    </div>
  );
}

export default UpdateForm;
