import moment from "moment-timezone";
import { useState, useRef, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useParams } from "react-router";
import api from "../utils/api";
import QRCode from "react-qr-code";
import axios from "axios";
import { MdFileCopy } from "react-icons/md";
import { FaChevronDown } from "react-icons/fa6";

export default function InputSmart() {
  const { id } = useParams();
  const [rows, setRows] = useState(() =>
    Array.from({ length: 20 }, () => ({ kanban: "", labelSupplier: "" }))
  );
  const inputRefs = useRef([]);
  const [validList, setValidList] = useState([]);
  // const [partListReal, setPartListReal] = useState([]);
  const [jumlahKanban, setValidKanban] = useState({});
  // const [selectedData, setSelectedData] = useState([]);
  const [Data, setData] = useState([]);
  const [createdAtList, setCreatedAtList] = useState([]);
  // const [fullData, setFullData] = useState([]);
  const [uniqueColumn, setSelectedColumn] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [summaryTable, setSummaryTable] = useState([]);
  const [endDN, setSudahSelesai] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDnOpen, setIsDnOpen] = useState(false);
  const [qrCodes, setqrCodes] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [kanban, setKanban] = useState(null);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [cycleFilter, setCycleFilter] = useState(1);
  const [dnFilter, setDNFilter] = useState([]);
  const [shiftWaktuMap, setShiftWaktuMap] = useState({});
  // const [separator, setSeparator] = useState("|");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataReal, setDataReal] = useState({});
  const [selectedFields, setSelectedFields] = useState([]);
  const isFirst = useRef(true);
  const [refreshInputs, setRefreshInputs] = useState(false);
  const [summary, setSummary] = useState(null);
  const [currentComboMap, setCurrentComboMap] = useState(new Map());
  const [missPart, setMisspart] = useState(0);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/data/${id}`
        );
        const data = await res.json();
        const KolomSelected = data.data.kolomSelected;
        // setSelectedData(data.data.kolomSelected.selectedData);
        setCreatedAtList(
          KolomSelected.flatMap((kolom) =>
            kolom.data.map((item) => item.delivery_date)
          )
        );
        // setFullData(data.data.kolomSelected);
        // setSeparator(data.data.separator);
        setDataReal(data.data.dataReal);
        setSelectedFields(data.data.selectedFields);
        setSelectedColumn(data.data.selectedColumns);
        setKanban(data.data.kanban);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id]);

  const fetchShift = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_SOD_URL}/sodDiagram/api/shift/`
      );
      const savedInputs = res.data.data;
      return savedInputs;
    } catch (error) {
      console.error("Error in fetch shift", error);
    }
  };

  const generateSummary = useCallback(
    (data, selectedFields, Separator = "_") => {
      const singleFieldMap = {}; // { fieldName: Map<fieldValue, totalQty> } => order_No, nilai unik
      const currentsingleFieldMap = {};
      const comboFieldMap = new Map(); // Map<joinedKey, totalQty> => kombinasi
      const selectedDataMap = new Map();
      const dnMap = new Map(); // Map<dn_number, totalQty> => dn/order_no
      const currentProgressMap = new Map(); // key = combo dari selectedFields qtyKanban
      const currentDNMap = new Map(); // qtyKanban, qty order_no

      const comboToDNMap = new Map(); // Mapping kombinasi ke part material
      const jumlahOrderDNMap = new Map(); // mapping orderQty semua order_no
      const jumlahOrderComboField = new Map(); //mapping orderQty semua kombinasi
      const comboToMaterialMap = new Map();

      // ada 3 alur :
      // dn terdiri dari berbagai kode unik ? jika ada maka pastikan selesai semua uniknya baru dn terupdate.
      // dn ter-update semuanya selesai => finish prepare
      // di setiap uniknya bertambah comboToDNMap qtyKanban, comboToDNMap qty
      // mapping unik => ke dn number dan material.

      Data.filter(
        (item) =>
          !cycleFilter || String(item.delivery_cycle) === String(cycleFilter)
      ).forEach((item) => {
        const qty = Number(item.qty) || 1;
        const orderQty = Number(item?.["order_(pcs)"]);
        const totalQty = Math.round(orderQty / qty);

        selectedFields.forEach((field) => {
          const value = item[field];
          if (!value) return;

          if (!singleFieldMap[field]) singleFieldMap[field] = new Map();

          if (!currentsingleFieldMap[field])
            currentsingleFieldMap[field] = new Map();

          singleFieldMap[field].set(
            value,
            (singleFieldMap[field].get(value) || 0) + totalQty
          );
          currentsingleFieldMap[field].set(value, 0);
        });

        const values = selectedFields.map((f) => item[f]);
        if (values.some((v) => !v)) return; // skip jika ada field kosong
        const comboKey = values.join(Separator);

        if (
          comboKey.includes("undefined") ||
          comboKey.includes("null") ||
          comboKey.endsWith("_")
        ) {
          console.warn("Invalid comboKey:", comboKey, "from item:", item);
        }

        comboToMaterialMap.set(comboKey, item.material); // tergantung field material

        if (kanban) {
          selectedDataMap.set(comboKey, item.selectedData);
        } else {
          selectedDataMap.set(comboKey, item.customer_material);
        }

        if (!comboFieldMap.has(comboKey)) {
          comboFieldMap.set(comboKey, { qty: 0, qtyKanban: qty });
          currentProgressMap.set(comboKey, { qty: 0, qtyKanban: qty });
        }

        const combo = comboFieldMap.get(comboKey);
        combo.qty += totalQty;
        console.log((combo.qtyKanban += orderQty), "jumlah wty kanban");

        jumlahOrderComboField.set(
          comboKey,
          (jumlahOrderComboField.get(comboKey) || 0) + orderQty
        );

        const dn = item.dn_number;
        if (dn) {
          currentDNMap.set(dn, 0);
          dnMap.set(dn, (dnMap.get(dn) || 0) + totalQty);
          jumlahOrderDNMap.set(dn, (jumlahOrderDNMap.get(dn) || 0) + orderQty);
          comboToDNMap.set(comboKey, dn);
        }
      });
      const clonedCurrentComboMap = new Map(
        [...currentProgressMap.entries()].map(([key]) => [
          key,
          { qty: 0, qtyKanban: 0 },
        ])
      );
      console.log(
        singleFieldMap,
        comboFieldMap,
        dnMap,
        comboToDNMap,
        currentDNMap,
        "currentprogress",
        currentProgressMap,
        currentsingleFieldMap,
        jumlahOrderComboField,
        jumlahOrderDNMap,
        comboToMaterialMap,
        selectedDataMap,
        "ini infonya"
      );
      return {
        singleFieldMap,
        comboFieldMap,
        dnMap,
        comboToDNMap,
        currentDNMap,
        currentProgressMap,
        currentsingleFieldMap,
        jumlahOrderComboField,
        jumlahOrderDNMap,
        comboToMaterialMap,
        clonedCurrentComboMap,
        selectedDataMap,
      };
    },
    [cycleFilter, Data, kanban]
  );

  // const generateCurrentProgressMap = (rows, comboFieldMap) => {
  //   const progressMap = new Map();

  //   rows.forEach((row, index) => {
  //     if (validList[index] !== true) return;

  //     const kanban = row.kanban?.toLowerCase();
  //     const supplier = row.labelSupplier?.toLowerCase();

  //     if (!kanban || !supplier || kanban === supplier) return;

  //     for (const [comboKey, qty] of comboFieldMap.entries()) {
  //       const comboParts = comboKey.split("_");
  //       const kanbanSlice = kanban
  //         .slice(0, dataReal.kanbanlength)
  //         .toLowerCase();

  //       const containsAll = comboParts.every((part) =>
  //         kanbanSlice.includes(part.toLowerCase())
  //       );

  //       if (containsAll) {
  //         const currentqty = progressMap.get(comboKey).qty || 0;
  //         const currentOrder = progressMap.get(comboKey).qtyKanban || 0;
  //         progressMap.set(comboKey, {
  //           qty: currentqty + 1,
  //           qtyKanban: currentOrder + qty.qtyKanban,
  //         });
  //         break; // hanya satu combo per row
  //       }
  //     }
  //   });

  //   return progressMap;
  // };

  function matchEntryWithMergedData(
    comboFieldMap,
    ProgressMap,
    row,
    comboToDNMap,
    dnMap,
    comboToMaterialMap,
    selectedDataMap,
    jenisCustomer
  ) {
    // console.log(
    //   comboFieldMap,
    //   ProgressMap,
    //   dataReal,
    //   row,
    //   comboToDNMap,
    //   "ni data"
    // );
    const kanban = row.kanban?.toLowerCase();
    const supplier = row.labelSupplier?.toLowerCase();

    // console.log(
    //   kanban,
    //   supplier,
    //   kanban.slice(0, dataReal.kanbanlength).includes(supplier),
    //   kanban.slice(0, 23),
    //   dataReal.kanbanlength
    // );

    const kanbanMatch = dataReal.kanbanlength
      ? kanban.length >= dataReal.kanbanlength
      : true;
    const supplierMatch = dataReal.labelLength
      ? supplier.length >= dataReal.labelLength
      : true;

    if (!kanbanMatch) {
      if (jenisCustomer && !supplierMatch) {
        return { matchFound: false };
      }
      return { matchFound: false };
    }

    for (const [comboKey, value] of comboFieldMap.entries()) {
      const comboParts = comboKey.split("_");
      // console.log(comboKey, value, "isi comboField", comboParts);

      const containsAll = comboParts.every((part) =>
        kanban.includes(part.toLowerCase())
      );

      console.log(comboKey, "conoth data");

      // console.log(comboToDNMap, comboKey, comboToDNMap.get(comboKey));
      const material = comboToMaterialMap
        .get(comboKey)
        .replace(/[-_/ ]/g, "")
        .toLowerCase();
      const unique = selectedDataMap
        .get(comboKey)
        .replace(/[-_/ ]/g, "")
        .toLowerCase();
      // const supplierMaterial = supplier
      //   .split("|")[0]
      //   .replace(/[-_/ ]/g, "")
      //   .toLowerCase();

      const supplierParts = (jenisCustomer ? supplier : kanban)
        .toLowerCase()
        .split("|")
        .map((s) => s.replace(/[-_/ ]/g, "").toLowerCase());

      console.log(
        material,
        unique,
        supplierParts,
        selectedDataMap,
        supplier,
        "ada ga sih"
      );
      // if (
      //   material?.toLowerCase() === supplierMaterial ||
      //   unique?.toLowerCase() === supplierMaterial ||
      //   (supplierMaterial.includes(unique?.toLowerCase()) && containsAll)
      // ) {

      if (
        supplierParts.some(
          (part) => (material === part || unique === part) && containsAll
        )
      ) {
        const matchedDN = comboToDNMap.get(comboKey);
        console.log(
          matchedDN,
          "dianggap",
          comboFieldMap,
          value,
          comboKey,
          value.qty
        );

        const qtyActual = value.qty;
        const currentQty = ProgressMap.get(comboKey).qty;
        // console.log("progress", qtyActual, currentQty);
        const overLimit = currentQty > qtyActual;
        console.log(currentQty, qtyActual, matchedDN);

        if (overLimit) {
          return { matchFound: false, matchedDN };
        }

        return {
          matchFound: true,
          comboKey,
          qtyActual,
          matchedDN,
        };
      }
    }

    return { matchFound: false, pesan: "" };
  }

  const handleCopy = (index) => {
    if (qrCodes.length === 0) return;
    const text = qrCodes[index];

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedIndex(index);
          setTimeout(() => setCopiedIndex(null), 1500);
        })
        .catch(() => {
          // Kalau gagal, pakai fallback
          fallbackCopy(text, index);
        });
    } else {
      // Kalau Clipboard API nggak ada
      fallbackCopy(text, index);
    }
  };

  const fallbackCopy = (text, index) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    setCopiedIndex(index);
  };

  useEffect(() => {
    if (!Data || !selectedFields?.length) return;

    const newSummary = generateSummary(Data, selectedFields, "_");
    // console.log(newSummary, "INI SUMMARY");
    setSummary(newSummary);
  }, [Data, selectedFields, generateSummary]);

  const checkProsesSekarang = useCallback(async () => {
    const dataWaktu = await fetchShift();
    const now = moment();
    return dataWaktu.find((item) => {
      const mulai = moment(
        `${now.format("YYYY-MM-DD")}T${moment
          .utc(item.jam_mulai)
          .format("HH:mm:ss")}`
      );
      const selesai = moment(
        `${now.format("YYYY-MM-DD")}T${moment
          .utc(item.jam_selesai)
          .format("HH:mm:ss")}`
      );

      if (selesai.isBefore(mulai)) {
        selesai.add(1, "day");
      }

      return now.isBetween(mulai, selesai, null, "[)");
    });
  }, []);

  const fetchMisspart = useCallback(
    async (date) => {
      try {
        const dateStr = moment(date).format("YYYY-MM-DD");
        const res = await api.get(
          `/inputQR/misspart?tanggal=${dateStr}&id=${id}&cycle=${cycleFilter}`,
          { headers: { "Cache-Control": "no-cache" } }
        );
        setMisspart(res.data.data.misspart);
      } catch (err) {
        console.error("Error fetching misspart:", err);
        setMisspart(0);
      }
    },
    [id, cycleFilter] // dependency yang dipakai dalam function
  );

  const fetchSavedInputs = useCallback(
    async (date) => {
      try {
        const dateStr = moment(date).format("YYYY-MM-DD");
        const res = await api.get(
          `/inputQR?date=${dateStr}&customerId=${id}&cycle=${cycleFilter}`
        );

        const savedInputs = res.data.data;

        if (savedInputs && savedInputs.length > 0) {
          // console.log(new Date(), "waktu ambil");
          const roundedLength = Math.ceil(savedInputs.length / 10) * 10;
          const newRows = Array.from({ length: roundedLength }, () => ({
            kanban: "",
            labelSupplier: "",
            pesan: "",
          }));
          const newValidList = [];

          if (kanban) {
            // console.log(savedInputs, "simpan rows");
            savedInputs.forEach((input) => {
              if (input.index !== undefined && input.index < newRows.length) {
                newRows[input.index] = {
                  kanban: input.kanban || "",
                  labelSupplier: kanban ? input.labelSupplier : "",
                  pesan: input.pesan,
                  dnFound: input.dnFound,
                };
                newValidList[input.index] = input.status || false;
              }
            });

            setRows(newRows);
            setValidList(newValidList);
          } else if (!kanban) {
            savedInputs.forEach((input) => {
              if (input.index !== undefined && input.index < newRows.length) {
                newRows[input.index] = {
                  kanban: input.kanban || "",
                  labelSupplier: "",
                  pesan: input.pesan,
                };
                newValidList[input.index] = input.status || false;
              }
            });

            setRows(newRows);
            setValidList(newValidList);
          }
          // console.log(newRows, "ini row awal");
        }
        setShouldAutoFocus(true);
      } catch (error) {
        console.error("Error fetching saved inputs:", error);
      }
    },
    [id, kanban, cycleFilter]
  );

  useEffect(() => {
    if (refreshInputs) {
      fetchSavedInputs(selectedDate);
      setRefreshInputs(false); // reset lagi
    }
  }, [refreshInputs, fetchSavedInputs, selectedDate]);

  const prevDnFilter = useRef([]);
  useEffect(() => {
    if (!rows.length || !dnFilter.length) return;

    const prev = prevDnFilter.current.join(",");
    const now = dnFilter.join(",");

    // console.log(prev, now, "tes dnFilter");

    if (prev !== now) {
      prevDnFilter.current = [...dnFilter];
      fetchSavedInputs(selectedDate);
      setTimeout(() => {
        setValidList((prevValidList) =>
          rows.map((row, index) => {
            const found = (row.dnFound || "").trim().toUpperCase();
            const match = dnFilter.map((x) => x.toUpperCase()).includes(found);
            // console.log(match, prevValidList[index], "contoh dalam");
            return match ? prevValidList[index] : false;
          })
        );
      }, 50); // tunggu fetch selesai
    }

    if (selectedDate) {
      fetchMisspart(selectedDate);
    }
  }, [dnFilter, fetchSavedInputs, selectedDate, rows, fetchMisspart]);

  const handleClickDate = async (Date) => {
    setDataLoaded(false);

    setSelectedDate(Date);
    try {
      const formattedDate = moment(Date).format("YYYY-MM-DD");

      const res = await axios.get(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/data/byDate?customer=${id}&date=${formattedDate}`
      );

      // console.log(res, "response", separator);
      const result = res.data.data || [];
      console.log(result, res, "ini response");

      if (result.length > 0) {
        setData(result);
        // setSelectedData(
        //   result.map(
        //     (item) => normalizeText(item.selectedData || ""),
        //     separator
        //   )
        // );
        setDataLoaded(true);

        await fetchSavedInputs(Date);
      } else {
        setData([]);
        // setSelectedData([]);
        setDataLoaded(false);
        setRows(
          Array.from({ length: 20 }, () => ({
            kanban: "",
            labelSupplier: "",
          }))
        );
        setValidList([]);
      }
    } catch (err) {
      console.error("Error fetching data by date:", err);
      setData([]);
      // setSelectedData([]);
      setDataLoaded(false);
      setRows(
        Array.from({ length: 20 }, () => ({ kanban: "", labelSupplier: "" }))
      );
      setValidList([]);
    }
  };

  // async (
  //   dn,   //ORDER_NO
  //   total, //total harusnya actual (job/unik nya)
  //   sudahInput, //sudah berapa yang diinput (job/uniknya)
  //   // totalDN,
  //   sudahInputAll, //sudah semua job/uniknya ? berapa
  //   totalMaplength, //berapa banyak job/uniknya
  //   totalDNCycle, //berapa dn cycle yang ada di cycle ini (buat ambil shift dan waktu)
  //   // totalJobInDN === dnClosedStatus[dn + "_" + cycle],
  //   sudahClosedDNCycle, //berapa yang sudah close dn nya pada cycle tersebut
  //   forceFinish = false, // finish dari close dan totalDN
  //   qtyNow, // jumlah qty (currentCombo +)
  //   qtyAll //jumlah qty semua (jumlahOrderDN)
  const updateDnStatus = useCallback(
    async ({
      dn,
      total,
      sudahInput,
      sudahInputAll,
      totalMaplength,
      totalDNCycle,
      sudahClosedDNCycle,
      forceFinish = false,
      qtyNow,
      qtyAll,
    }) => {
      // console.log(
      //   "disini apa dn",
      //   dn,
      //   total,
      //   sudahInput,
      //   sudahInputAll,
      //   totalMaplength,
      //   totalDNCycle,
      //   sudahClosedDNCycle,
      //   forceFinish,
      //   qtyNow,
      //   qtyAll
      // );
      if (sudahInputAll == null || totalMaplength == null) return;

      if (total - sudahInput < 0) return;

      // console.log(qtyNow, "jumlah qty", sudahInputAll, dn);
      const percent =
        sudahInputAll === 0
          ? 0
          : sudahInputAll > qtyAll
          ? 100
          : Math.round((sudahInputAll / qtyAll) * 100);

      let currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
      try {
        const basePayload = {
          customerId: id,
          tanggal: moment(selectedDate).format("YYYY-MM-DD"),
          dnNumber: dn,
          persentase: percent,
          qty: qtyNow,
        };

        // console.log(basePayload, "dasar payload");
        let res;

        if (sudahInput === 1 && totalMaplength - sudahInputAll === 0) {
          const proses = await checkProsesSekarang();
          currentShift = proses?.kode_shift;

          res = await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track`,
            {
              ...basePayload,
              status: "first",
              shift: null,
              sudahAll: false,
            }
          );

          res = await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track`,
            {
              ...basePayload,
              status: "done",
              shift: sudahInputAll === totalMaplength ? currentShift : null,
              sudahAll: sudahInputAll === totalMaplength,
            }
          );

          let statusInput;
          if (totalMaplength - sudahInputAll === 0) {
            statusInput = "done";
          } else if (sudahInputAll === 1) {
            statusInput = "first";
          } else {
            statusInput = "-";
          }
          // console.log(res, "hasil reponse");
          if (
            res?.data?.verificationCode &&
            (sudahInputAll === totalMaplength || statusInput === "done")
          ) {
            setqrCodes((prev) => {
              const newCode =
                res.data.verificationCode || res.data.data.verificationCode;
              return prev.includes(newCode) || newCode == null
                ? prev
                : [...prev, newCode];
            });
          }
        } else {
          const status =
            sudahInput === 1
              ? "first"
              : totalMaplength - sudahInputAll === 0
              ? "done"
              : "-";

          let currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
          if (!currentShift || currentShift === "-") {
            const proses = await checkProsesSekarang();
            currentShift = proses?.kode_shift;
          }
          res = await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track`,
            {
              ...basePayload,
              status,
              shift: sudahInputAll === totalMaplength ? currentShift : null,
              sudahAll: sudahInputAll === totalMaplength,
            }
          );
        }

        let statusInput;

        if (totalMaplength - sudahInputAll === 0) {
          statusInput = "done";
        } else if (sudahInput === 1) {
          statusInput = "first";
        } else {
          statusInput = "-";
        }

        if (
          res?.data?.verificationCode &&
          sudahInputAll === totalMaplength &&
          statusInput === "done"
        ) {
          setqrCodes((prev) => {
            const newCode =
              res.data.verificationCode || res.data.data.verificationCode;
            return prev.includes(newCode) || newCode == null
              ? prev
              : [...prev, newCode];
          });
        }

        if (
          !shiftWaktuMap?.[cycleFilter || 1]?.shift &&
          res.data.shift !== shiftWaktuMap?.[cycleFilter || 1]?.shift &&
          forceFinish
        ) {
          if (res.data.shift && forceFinish) {
            setShiftWaktuMap((prev) => ({
              ...prev,
              [cycleFilter]: {
                waktuAktual: res.data.waktuAktual
                  ? moment(res.data.waktuAktual).format("DD-MM-YYYY HH:mm")
                  : " ",
                shift:
                  totalDNCycle === sudahClosedDNCycle ? res.data.shift : " ",
              },
            }));
          }
        }

        // console.log(res, "hasil reponse");

        if (forceFinish && res.data.verificationCode) {
          await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track/finish`,
            {
              customerId: id,
              tanggal: moment(selectedDate).format("YYYY-MM-DD"),
              codeOD: res.data.verificationCode || null,
              dnNumber: dn,
            }
          );
        }
      } catch (error) {
        console.error("Error updating DN status:", error);
      }
    },
    [id, selectedDate, checkProsesSekarang, cycleFilter, shiftWaktuMap]
  );

  const updateODStatus = useCallback(
    async (
      order_no,
      sudahInputOD,
      totalKanban,
      totalMaplength,
      sudahInputAll,
      finishAll = false,
      qtyNow = 0
    ) => {
      if (sudahInputAll == null || totalMaplength == null) return; // true jika null atau undefined

      if (totalKanban < sudahInputOD) return;
      const percent =
        sudahInputOD === 0
          ? 0
          : sudahInputOD > totalKanban
          ? 100
          : Math.round((sudahInputOD / totalKanban) * 100);

      // console.log(
      //   "contoh map",
      //   order_no,
      //   sudahInputOD,
      //   totalKanban,
      //   totalMaplength,
      //   sudahInputAll,
      //   finishAll,
      //   qtyNow
      // );

      try {
        const basePayload = {
          customerId: id,
          tanggal: moment(selectedDate).format("YYYY-MM-DD"),
          persentase: percent,
          qty: qtyNow,
        };

        let res;

        // Jika dua kondisi terpenuhi
        let currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
        if (sudahInputOD === 1) {
          currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
          const proses = await checkProsesSekarang();
          currentShift = proses?.kode_shift;
          res = await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track`,
            {
              ...basePayload,
              status: "first",
              shift: null,
              sudahAll: false,
            }
          );

          if (totalKanban - sudahInputOD === 0) {
            res = await axios.put(
              `${import.meta.env.VITE_BACKEND_URL}/api/track`,
              {
                ...basePayload,
                status: "done",
                shift: sudahInputAll === totalMaplength ? currentShift : null,
                sudahAll: sudahInputAll === totalMaplength,
              }
            );
            // console.log("Res pertama", res);
          }
          let statusInput;

          if (totalKanban - sudahInputOD === 0) {
            statusInput = "done";
          } else if (sudahInputOD === 1) {
            statusInput = "first";
          } else {
            statusInput = "-";
          }

          // console.log(statusInput, "pertama astatus");
          if (
            res?.data?.verificationCode &&
            sudahInputOD === totalKanban &&
            statusInput === "done"
          ) {
            // console.log(res.data.verificationCode, "KENAPA GA ADA");
            const newCode =
              res.data.verificationCode || res.data.data?.verificationCode;
            setqrCodes((prev) =>
              prev.includes(newCode) || !newCode ? prev : [...prev, newCode]
            );
          }

          if (
            !shiftWaktuMap?.[cycleFilter || 1]?.shift &&
            res.data.shift !== shiftWaktuMap?.[cycleFilter || 1]?.shift &&
            finishAll
          ) {
            // console.log("disini ga");
            setShiftWaktuMap((prev) => ({
              ...prev,
              [cycleFilter || 1]: {
                waktuAktual: res.data.waktuAktual
                  ? moment(res.data.waktuAktual).format("DD-MM-YYYY HH:mm")
                  : " ",
                shift: res.data.shift || " ",
              },
            }));
          }
        } else {
          const status = totalKanban - sudahInputOD === 0 ? "done" : "-";

          // console.log("kesini", sudahInputAll, totalMaplength, status);
          let currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
          if (!currentShift || currentShift === "-") {
            const proses = await checkProsesSekarang();
            currentShift = proses?.kode_shift;
          }
          res = await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track`,
            {
              ...basePayload,
              status,
              shift: sudahInputAll === totalMaplength ? currentShift : null,
              sudahAll: sudahInputAll === totalMaplength,
            }
          );
          // console.log(res, "status", status, sudahInputAll === totalMaplength);
        }

        let statusInput;
        if (totalKanban - sudahInputOD === 0) {
          statusInput = "done";
        } else if (sudahInputOD === 1) {
          statusInput = "first";
        } else {
          statusInput = "-";
        }
        if (
          res?.data?.verificationCode &&
          sudahInputOD === totalKanban &&
          statusInput === "done"
        ) {
          setqrCodes((prev) => {
            const newCode =
              res.data.verificationCode || res.data.data.verificationCode;
            return prev.includes(newCode) || newCode == null
              ? prev
              : [...prev, newCode];
          });
        }

        if (
          !shiftWaktuMap?.[cycleFilter || 1]?.shift &&
          res.data.shift !== shiftWaktuMap?.[cycleFilter || 1]?.shift &&
          finishAll
        ) {
          setShiftWaktuMap((prev) => ({
            ...prev,
            [cycleFilter || 1]: {
              waktuAktual: res.data.waktuAktual
                ? moment(res.data.waktuAktual).format("DD-MM-YYYY HH:mm")
                : " ",
              shift: res.data.shift || " ",
            },
          }));
        }

        // console.log(res.data.verificationCode, "Ada ga");
        if (finishAll && res.data.verificationCode) {
          // console.log("kesini", res.data.verificationCode, "kirim");
          await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/track/finish`,
            {
              customerId: id,
              tanggal: moment(selectedDate).format("YYYY-MM-DD"),
              codeOD: res.data.verificationCode || null,
            }
          );
        }
      } catch (error) {
        console.error("Error updating DN status:", error);
      }
    },
    [id, selectedDate, shiftWaktuMap, checkProsesSekarang, cycleFilter]
  );

  // const lastCharAfterSpace = (str) => {
  //   if (!str) return "";
  //   const parts = str.trim().split(" ");
  //   return parts.length > 1 ? parts[parts.length - 1] : parts;
  // };

  const generateSummaryTable = useCallback(async () => {
    if (
      !dataLoaded ||
      uniqueColumn.length < 1 ||
      !Array.isArray(selectedFields) ||
      selectedFields.length === 0 ||
      !summary
    )
      return;
    let uniqueKey = "";
    // console.log(summary, "ringkasan");

    const {
      singleFieldMap,
      comboFieldMap,
      dnMap,
      comboToDNMap,
      currentDNMap,
      currentProgressMap,
      currentsingleFieldMap,
      jumlahOrderComboField,
      jumlahOrderDNMap,
      comboToMaterialMap,
      clonedCurrentComboMap,
      selectedDataMap,
    } = summary;

    const clonedCurrentDNMap = new Map(currentDNMap);
    const clonedCurrentProgressMap = new Map(currentProgressMap);
    // console.log(comboToMaterialMap, "ini pertama");
    const seen = new Set();

    rows.forEach((row, index) => {
      if (!validList[index] || seen.has(index)) return;

      const kanban = row.kanban?.toLowerCase();
      const supplier = row.labelSupplier?.toLowerCase();

      if (!kanban || !supplier || kanban === supplier) return;

      let comboMatch = null;

      for (const [comboKey, targetQty] of comboFieldMap.entries()) {
        const comboParts = comboKey.split("_");
        // const kanbanSlice =
        //   dataReal.kanbanlength > 0
        //     ? kanban.slice(0, dataReal.kanbanlength).toLowerCase()
        //     : "";

        console.log(comboParts, kanban);

        const containsAll = comboParts.every((part) =>
          kanban.includes(part.toLowerCase())
        );

        if (containsAll) {
          comboMatch = { comboKey, targetQty };
          break;
        }
        // console.log(containsAll, "break", comboMatch);
      }
      // console.log(
      //   clonedCurrentProgressMap,
      //   currentProgressMap,
      //   "ini progress",
      //   clonedCurrentDNMap
      // );

      console.log(comboMatch, "kesini ya");

      if (
        comboMatch &&
        supplier.length >= (dataReal.labelLength ?? 0) &&
        kanban.length >= (dataReal.kanbanlength ?? 0)
      ) {
        const { comboKey, targetQty } = comboMatch;

        const current = clonedCurrentProgressMap.get(comboKey) || {
          qty: 0,
          qtyKanban: 0,
        };

        uniqueKey = comboKey;
        const material = comboToMaterialMap
          .get(comboKey)
          .replace(/[-_/ ]/g, "")
          .toLowerCase();
        // const supplierMaterial = supplier
        //   .split("|")[0]
        //   .replace(/[-_/ ]/g, "")
        //   .toLowerCase();
        const unique = selectedDataMap
          .get(comboKey)
          .replace(/[-_/ ]/g, "")
          .toLowerCase();

        const supplierParts = supplier
          .split("|")
          .map((s) => s.replace(/[-_/ ]/g, "").toLowerCase());

        // if (
        //   material?.toLowerCase() === supplierMaterial ||
        //   unique?.toLowerCase() === supplierMaterial ||
        //   (supplierMaterial.includes(unique?.toLowerCase()) && containsAll)
        // ) {
        console.log(supplier, "nih isi");
        supplierParts.map((part) => console.log(part, material, unique));
        if (
          supplierParts.some(
            (part) =>
              material === part || unique === part || part.includes(unique)
          )
        ) {
          console.log("ini cocok");
          const dn = comboToDNMap.get(comboKey);
          const target = comboFieldMap.get(comboKey);
          const current = clonedCurrentProgressMap.get(comboKey) || {
            qty: 0,
            qtyKanban: 0,
          };
          // console.log(dn, dnFilter.includes(dn), "cek dn");
          if (dn && dnFilter.includes(dn)) {
            // if (current.qty >= target.qty) {
            //   console.log(
            //     `SKIP DN ${dn} untuk ${comboKey}, qty sudah full (${current.qty}/${currentTarget})`
            //   );
            //   return;
            // }

            clonedCurrentDNMap.set(dn, (clonedCurrentDNMap.get(dn) || 0) + 1);
            // clonedCurrentProgressMap.set(
            //   comboKey,
            //   (clonedCurrentProgressMap.get(comboKey) || 0) + 1
            // );

            clonedCurrentProgressMap.set(comboKey, {
              qty: current.qty + 1,
              qtyKanban:
                currentProgressMap.get(comboKey).qtyKanban *
                Math.min(current.qty + 1, target.qty),
            });
            // console.log(current, clonedCurrentProgressMap, "loop terus");
          }
          // console.log(comboKey, uniqueKey, "masa ga ada");
        }
        seen.add(index);
        uniqueKey = comboKey;
      }

      console.log("kesini", clonedCurrentProgressMap, clonedCurrentDNMap);
    });

    const jumlahComboPerDN = new Map();

    for (const [, dn] of comboToDNMap.entries()) {
      jumlahComboPerDN.set(dn, (jumlahComboPerDN.get(dn) || 0) + 1);
    }

    // const seenDN = new Set();
    const summaryTable = [];

    for (const [dn, totalQty] of dnMap.entries()) {
      const combos = [...comboToDNMap.entries()]
        .filter(([, v]) => v === dn)
        .map(([k]) => k);

      let closed = true;
      let currentQty = 0;
      let currentOrder = 0;
      // console.log(clonedCurrentProgressMap, "ini");

      combos.forEach((combo) => {
        const target = comboFieldMap.get(combo)?.qty || 0;

        const orderPerCombo = comboFieldMap.get(combo).qtyKanban || 0;
        const { qty, qtyKanban } = clonedCurrentProgressMap.get(combo) || {
          qty: 0,
          qtyKanban: 0,
        };

        if (qty < target) closed = false;
        // console.log(qty, target, "emang ya");
        currentQty += qty;
        currentOrder = orderPerCombo * qty;
      });

      const { qty, qtyKanban } = clonedCurrentProgressMap.get(uniqueKey) || {
        qty: 0,
        qtyKanban: 0,
      };
      // console.log(uniqueKey, qty, "unik kan");

      const totalQty = dnMap.get(dn);
      // console.log(
      //   clonedCurrentProgressMap.get(uniqueKey).qty,
      //   "jumlah qty sekarang"
      // );

      // console.log(uniqueKey, "KOLOM UNIK", currentQty, totalQty);

      summaryTable.push({
        dn_number: dn,
        jumlah_order: jumlahOrderDNMap.get(dn),
        total: totalQty,
        sisa: Math.max(totalQty - currentQty, 0),
        orderNow: currentOrder,
        status: closed ? "Closed" : "Open",
      });

      // for (const [comboKey, targetQty] of comboFieldMap.entries()) {
      //   const currentQty = clonedCurrentProgressMap.get(comboKey) || 0;
      //   if (currentQty >= targetQty) closedCount++;
      // }
      const closedCount = summaryTable.filter(
        (item) => item.status === "Closed"
      ).length;

      // let totalKanban = 0;

      // for (const [comboKey, relatedDN] of comboToDNMap) {
      //   if (relatedDN === dn) {
      //     const progress = clonedCurrentProgressMap.get(comboKey);
      //     if (progress?.qty > 0) {
      //       totalKanban += progress.qtyKanban || 0;
      //     }
      //   }
      // }

      const jumlahAll = Array.from(clonedCurrentProgressMap.entries()).reduce(
        (total, [key, value]) => {
          const relatedDN = comboToDNMap.get(key);
          if (relatedDN !== dn) return total; // skip combo yang bukan untuk DN ini

          return total + (value.qty === 0 ? 0 : value.qtyKanban);
        },
        0
      );

      // console.log(
      //   "setelah berubah",
      //   singleFieldMap,
      //   comboFieldMap,
      //   dnMap,
      //   comboToDNMap,
      //   currentDNMap,
      //   currentProgressMap,
      //   clonedCurrentComboMap,
      //   clonedCurrentProgressMap,
      //   currentsingleFieldMap,
      //   jumlahOrderComboField,
      //   jumlahOrderDNMap,
      //   comboToMaterialMap,
      //   selectedDataMap
      // );

      // console.log("unik", uniqueKey);
      setCurrentComboMap(clonedCurrentProgressMap);

      let sudahFullCount = 0;
      for (const [key, nowValue] of clonedCurrentProgressMap.entries()) {
        const fullValue = comboFieldMap.get(key);
        if (fullValue && nowValue.qty >= fullValue.qty) {
          sudahFullCount++;
        }
      }
      // console.log(
      //   dn,
      //   totalQty,
      //   comboFieldMap.get(uniqueKey)?.qty || 0,
      //   clonedCurrentProgressMap.get(uniqueKey)?.qty || 0,
      //   sudahFullCount,
      //   Math.min(sudahFullCount, jumlahComboPerDN.get(dn)),
      //   jumlahComboPerDN.get(dn),
      //   dnMap.size,
      //   closedCount,
      //   closedCount === jumlahComboPerDN.get(dn), // apa dn sudah ada semua, dnMap, dan
      //   jumlahAll, // jumlah qty DN
      //   jumlahOrderDNMap.get(dn)
      // );

      await updateDnStatus({
        dn,
        total: comboFieldMap.get(uniqueKey)?.qty || 0,
        sudahInput: clonedCurrentProgressMap.get(uniqueKey)?.qty || 0,
        sudahInputAll: Math.min(sudahFullCount, jumlahComboPerDN.get(dn)),
        totalMaplength: jumlahComboPerDN.get(dn),
        totalDNCycle: dnMap.size,
        sudahClosedDNCycle: closedCount,
        forceFinish: closedCount === dnMap.size,
        qtyNow: jumlahAll,
        qtyAll: jumlahOrderDNMap.get(dn),
      });
    }
    // setSummary((prev) => {
    //   return {
    //     ...prev,
    //     currentProgressMap: clonedCurrentProgressMap,
    //   };
    // });

    setSummaryTable(summaryTable);
  }, [
    rows,
    validList,
    // selectedData,
    dataLoaded,
    // updateDnStatus,
    uniqueColumn,
    updateDnStatus,
    // separator,
    selectedFields,
    summary,
    dnFilter,
    // selectedFields.length,
    dataReal,
    // dataReal.kanbanlength,
    // generateSummary,
  ]);

  const generateSummaryTableNoKanban = useCallback(async () => {
    if ((!dataLoaded && !uniqueColumn) || !summary) return;

    const totalMap = {};
    const jumlahQTY = {};
    const jumlahQTYDN = {};
    const jobCountPerCycle = {};
    const jobMap = new Map();
    const qtyPerJob = {};
    const qtyPerDNBerjalan = {};

    const {
      singleFieldMap,
      comboFieldMap,
      dnMap,
      comboToDNMap,
      currentDNMap,
      currentProgressMap,
      currentsingleFieldMap,
      jumlahOrderComboField,
      jumlahOrderDNMap,
      comboToMaterialMap,
      clonedCurrentComboMap,
      selectedDataMap,
    } = summary;

    Data.forEach((item) => {
      // console.log("disini perhitungan", Data, item);
      // const dn = item.dn_number;
      const cycle = item.delivery_cycle || "1";
      const [job1, job2] = String(item.customer_material).split("-");
      const job = job1 + "-" + job2;
      // const key = `${dn},${job}`;
      const key = `${job}+${cycle}`;
      // console.log(key, job);
      const orderQty = Number(item[`order_(pcs)`]);
      const unitQty = Number(item.qty);
      const totalQty = Math.max(1, Math.ceil(orderQty / unitQty));
      totalMap[key] = (totalMap[key] || 0) + totalQty;
      jumlahQTY[key] = (jumlahQTY[key] || 0) + orderQty;
      // if (!jobCountPerDN[dn]) jobCountPerDN[dn] = new Set();
      // jobCountPerDN[dn].add(job);
      if (!jobCountPerCycle[cycle]) jobCountPerCycle[cycle] = new Set();
      jobCountPerCycle[cycle].add(job);

      jobMap.set(key, item);
      jumlahQTYDN[job + cycle] = (jumlahQTYDN[job + cycle] || 0) + orderQty;
      // jumlahQTYDN[dn + cycle] = (jumlahQTYDN[dn + cycle] || 0) + orderQty;
      qtyPerJob[key] = totalQty * unitQty;
      // qtyPerDNBerjalan[dn] = (qtyPerDNBerjalan[dn] || 0) + qtyPerJob[key];
      qtyPerDNBerjalan[cycle] = (qtyPerDNBerjalan[cycle] || 0) + qtyPerJob[key];
    });

    const sisaMap = {};

    const clonedCurrentDNMap = new Map(currentDNMap);
    const clonedCurrentProgressMap = new Map(currentProgressMap);
    const seen = new Set();

    let uniqueKey = "";
    rows.forEach((row, index) => {
      // console.log(validList[index], "masuk rows");
      if (!validList[index] || seen.has(index)) return;

      const jobKey = Array.from(jobMap.keys()).find((key) => {
        const job = key.split("+")[0];
        // console.log(
        //   row.kanban?.toLowerCase().includes(job.toLowerCase(), "status")
        // );
        return row.kanban?.toLowerCase().includes(job.toLowerCase());
      });

      if (jobKey) {
        // console.log(jobKey, "kesini ga");
        sisaMap[jobKey] = (sisaMap[jobKey] || 0) + 1;
      }

      const kanban = row.kanban?.toLowerCase();

      if (!kanban) return;

      let comboMatch = null;
      for (const [comboKey, targetQty] of comboFieldMap.entries()) {
        const comboParts = comboKey.split("_");
        // const kanbanSlice =
        //   dataReal.labelLength > 0
        //     ? kanban.slice(0, dataReal.labelLength).toLowerCase()
        //     : "";

        console.log(
          comboParts,
          kanban,
          dataReal,
          kanban.slice(0, dataReal.labelLength).toLowerCase()
        );

        const containsAll = comboParts.every((part) =>
          kanban.includes(part.toLowerCase())
        );

        if (containsAll) {
          comboMatch = { comboKey, targetQty };
          break;
        }
        // console.log(containsAll, "break", comboMatch);
      }

      if (comboMatch && kanban.length >= (dataReal.labelLength ?? 0)) {
        const { comboKey, targetQty } = comboMatch;

        const current = clonedCurrentProgressMap.get(comboKey) || {
          qty: 0,
          qtyKanban: 0,
        };

        uniqueKey = comboKey;
        const material = comboToMaterialMap
          .get(comboKey)
          .replace(/[-_/ ]/g, "")
          .toLowerCase();

        const unique = selectedDataMap
          .get(comboKey)
          .replace(/[-_/ ]/g, "")
          .toLowerCase();

        const supplierParts = kanban
          .split("|")
          .map((s) => s.replace(/[-_/ ]/g, "").toLowerCase());

        if (
          supplierParts.some(
            (part) =>
              material === part || unique === part || part.includes(unique)
          )
        ) {
          const dn = comboToDNMap.get(comboKey);
          const target = comboFieldMap.get(comboKey);
          const current = clonedCurrentProgressMap.get(comboKey) || {
            qty: 0,
            qtyKanban: 0,
          };

          if (dn && dnFilter.includes(dn)) {
            clonedCurrentDNMap.set(dn, (clonedCurrentDNMap.get(dn) || 0) + 1);
            // clonedCurrentProgressMap.set(
            //   comboKey,
            //   (clonedCurrentProgressMap.get(comboKey) || 0) + 1
            // );

            clonedCurrentProgressMap.set(comboKey, {
              qty: current.qty + 1,
              qtyKanban:
                currentProgressMap.get(comboKey).qtyKanban *
                Math.min(current.qty + 1, target.qty),
            });
            // console.log(current, clonedCurrentProgressMap, "loop terus");
          }
          // console.log(comboKey, uniqueKey, "masa ga ada");
        }
        seen.add(index);
        uniqueKey = comboKey;
      }

      console.log("kesini", clonedCurrentProgressMap, clonedCurrentDNMap);
    });

    setValidKanban(sisaMap);
    setSudahSelesai(totalMap);

    const summaryTableNoKanban = [];
    const dnClosedStatus = {};
    // let closedDNCount = 0;
    // let totalDN = Object.keys(jobCountPerDN).length;
    // let totalJob = Object.keys(jobCountPerCycle).length;
    // let totalDNCount = Object.keys(jobCountPerDN).length;

    for (const key of Object.keys(totalMap)) {
      // const [dn, job] = key.split(",");
      const [job, cycle] = key.split("+");
      const total = totalMap[key];
      const input = sisaMap[key] || 0;
      const currentProgressQty = input * (jobMap.get(key)?.qty || 0); // Ini qty aktual

      const sisa = Math.max(total - input, 0);
      const status = sisa === 0 ? "Closed" : "Open";

      summaryTableNoKanban.push({
        dn_number: job,
        jumlah_order: jumlahQTY[key],
        total,
        sisa,
        status,
      });

      if (status === "Closed") {
        // dnClosedStatus[dn] = (dnClosedStatus[dn] || 0) + 1;
        dnClosedStatus[cycle] = (dnClosedStatus[cycle] || 0) + 1;
      }

      // Jika semua job dalam DN ini sudah closed
      // const totalJobInDN = jobCountPerDN[dn]?.size || 0;
      // const jobClosedInThisDN = dnClosedStatus[dn] || 0;
      // const isAllJobInThisDNClosed = jobClosedInThisDN === totalJobInDN;

      // Jika semua DN selesai
      // const willBeClosedDNCount = Object.values(dnClosedStatus).filter(
      //   (count, idx) => {
      //     const dnKey = Object.keys(dnClosedStatus)[idx];
      //     return count === jobCountPerDN[dnKey]?.size;
      //   }
      // ).length;

      // const willBeClosedDNCount = Object.values(dnClosedStatus).filter(
      //   (count, idx) => {
      //     console.log(count, idx);
      //     const dnKey = Object.keys(dnClosedStatus)[idx];
      //     console.log(
      //       dnClosedStatus,
      //       "ini",
      //       dnKey,
      //       jobCountPerCycle[dnKey].size,
      //       jobCountPerCycle[Number(dnKey)]
      //     );
      //     return count === jobCountPerCycle[dnKey]?.size;
      //   }
      // ).length;

      const isAllDNClosed =
        dnClosedStatus[cycle] === jobCountPerCycle[cycle].size;
      // console.log(isAllDNClosed, totalDN, willBeClosedDNCount, "ini kitiman");
      // console.log(
      //   "INI DIKIRIM",
      //   key,
      //   sisaMap,
      //   dnClosedStatus,
      //   jobCountPerCycle,
      //   input,
      //   total,
      //   jobCountPerCycle[cycle].size,
      //   dnClosedStatus[cycle],
      //   isAllDNClosed,
      //   currentProgressQty
      // );

      for (const [dn, totalQty] of dnMap.entries()) {
        const combos = [...comboToDNMap.entries()]
          .filter(([, v]) => v === dn)
          .map(([k]) => k);

        let closed = true;
        let currentQty = 0;
        let currentOrder = 0;
        // console.log(clonedCurrentProgressMap, "ini");

        combos.forEach((combo) => {
          const target = comboFieldMap.get(combo)?.qty || 0;

          const orderPerCombo = comboFieldMap.get(combo).qtyKanban || 0;
          const { qty, qtyKanban } = clonedCurrentProgressMap.get(combo) || {
            qty: 0,
            qtyKanban: 0,
          };

          if (qty < target) closed = false;
          // console.log(qty, target, "emang ya");
          currentQty += qty;
          currentOrder = orderPerCombo * qty;
        });

        const { qty, qtyKanban } = clonedCurrentProgressMap.get(uniqueKey) || {
          qty: 0,
          qtyKanban: 0,
        };
        // console.log(uniqueKey, qty, "unik kan");

        const totalQty = dnMap.get(dn);

        const jumlahAll = Array.from(clonedCurrentProgressMap.entries()).reduce(
          (total, [key, value]) => {
            const relatedDN = comboToDNMap.get(key);
            if (relatedDN !== dn) return total; // skip combo yang bukan untuk DN ini

            return total + (value.qty === 0 ? 0 : value.qtyKanban);
          },
          0
        );
        setCurrentComboMap(clonedCurrentProgressMap);

        await updateODStatus(
          key, // tetap pakai key = `${dn},${job}`
          input,
          total,
          // totalDN,
          // willBeClosedDNCount,
          // isAllDNClosed,
          jobCountPerCycle[cycle].size,
          dnClosedStatus[cycle],
          isAllDNClosed,
          currentProgressQty
        );
      }
    }

    setSummaryTable(summaryTableNoKanban);
    // setAllDnClosed(allClosed);
  }, [
    rows,
    validList,
    Data,
    dataLoaded,
    updateODStatus,
    dataReal,
    dnFilter,
    summary,
    uniqueColumn,
  ]);

  useEffect(() => {
    if (kanban === true) {
      generateSummaryTable();
    } else {
      generateSummaryTableNoKanban();
    }
  }, [validList, generateSummaryTable, kanban, generateSummaryTableNoKanban]);

  const handleInput = async (index, field, value) => {
    if (!summary) return;

    // const {
    //   singleFieldMap,
    //   comboFieldMap,
    //   dnMap,
    //   comboToDNMap,
    //   currentDNMap,
    //   currentProgressMap,
    //   currentsingleFieldMap,
    //   jumlahOrderComboField,
    //   jumlahOrderDNMap,
    // } = summary;

    const newValue = value.trim();
    const updatedRows = [...rows];
    updatedRows[index][field] = newValue;
    setRows(updatedRows);

    const row = updatedRows[index];

    // console.log(separator, "pemisah", selectedFields);
    // console.log(comboFieldMap, dnMap, comboToDNMap, "kombinasu");
    // const updatedProgressMap = generateCurrentProgressMap(
    //   updatedRows,
    //   comboFieldMap,
    //   dataReal
    // );

    // console.log("progress", currentComboMap, summary.comboFieldMap);

    if (field === "kanban" || field === "labelSupplier") {
      if (!value.endsWith("\n")) {
        return; // tunggu sampai user tekan Enter
      }
    }

    const match = matchEntryWithMergedData(
      // Data,
      summary.comboFieldMap,
      currentComboMap,
      row,
      summary.comboToDNMap,
      summary.dnMap,
      summary.comboToMaterialMap,
      summary.selectedDataMap,
      kanban
      // dataReal
      // startDate,
      // endDate,
      // separator
    );
    console.log(match, "ini cocok ga");

    const isValid = match.matchFound;

    const changedRow = {
      ...row,
      status: isValid,
    };

    console.log(changedRow, "status");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/inputQR`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            row: changedRow,
            index,
            id,
            selectedDate,
            dnFound: match.matchedDN,
            cycle: cycleFilter,
            // validPart: String(partNo).toUpperCase(),
          }),
        }
      );
      // console.log(
      //   changedRow,
      //   index,
      //   id,
      //   selectedDate,
      //   match.matchedDN,
      //   cycleFilter,
      //   "ini dikirim"
      // );
      const result = await res.json();
      // console.log("Result submit:", result);

      const statusFromServer = result.status;
      const messageFromServer = result.pesan;

      setValidList((prev) => {
        const updated = [...prev];
        updated[index] = statusFromServer;
        return updated;
      });

      // if (statusFromServer && match.comboKey) {
      //   setSummary((prev) => {
      //     const newMap = new Map(prev.currentProgressMap);
      //     const current = newMap.get(match.comboKey) || {
      //       qty: 0,
      //       qtyKanban: 0,
      //     };
      //     newMap.set(match.comboKey, {
      //       qty: current.qty + 1,
      //       qtyKanban: current.qtyKanban + (match.qtyActual || 1),
      //     });

      //     return {
      //       ...prev,Z
      //       currentProgressMap: newMap,
      //     };
      //   });
      // }
      if (result.refresh) {
        setRefreshInputs(true);
        if (field == "kanban") {
          if (value.endsWith("\n")) {
            setTimeout(() => {
              inputRefs.current[index * 2 + 1]?.focus();
            }, 1);
          }
        } else {
          if (value.endsWith("\n")) {
            setTimeout(() => {
              inputRefs.current[(index + 1) * 2]?.focus();
            }, 1);
          }
        }
      }

      // setPartListReal((prev) => {
      //   const updated = [...prev];
      //   updated[index] = (messageFromServer ?? "").toLowerCase();
      //   return updated;
      // });

      setRows((prevRows) => {
        const updated = [...prevRows];
        updated[index] = {
          ...updated[index],
          pesan: match.pesan ?? (messageFromServer ?? "").toLowerCase(),
        };
        return updated;
      });

      // if (!statusFromServer && messageFromServer) {
      //   alert(`Baris ${index + 1}: ${messageFromServer}`);
      // }
    } catch (err) {
      console.error("Failed to submit row:", err);
    }
    // }

    if (field === "kanban" && newValue !== "") {
      if (value.endsWith("\n")) {
        setTimeout(() => {
          inputRefs.current[index * 2 + 1]?.focus();
        }, 1);
      }
    }

    if (field === "labelSupplier" && newValue !== "") {
      const last10Filled = updatedRows
        .slice(-10)
        .every((r) => r.kanban && r.labelSupplier);

      if (last10Filled) {
        const newRows = Array.from({ length: 10 }, () => ({
          kanban: "",
          labelSupplier: "",
        }));
        setRows((prev) => [...prev, ...newRows]);
      }

      if (value.endsWith("\n")) {
        setTimeout(() => {
          inputRefs.current[(index + 1) * 2]?.focus();
        }, 1);
      }
    }
  };

  const handleInputKanban = async (index, field, value) => {
    const newValue = value;
    const updatedRows = [...rows];
    updatedRows[index][field] = newValue;
    setRows(updatedRows);

    const row = updatedRows[index];

    const parts = updatedRows[index].kanban.trim().toLowerCase().split("|");
    const A = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    // .slice(0, -4)
    // .split("|")[0];
    let isValid = false;

    const dataSelectFitur = summary.selectedDataMap;
    console.log(A, dataSelectFitur, "ono data", kanban);
    const baru = dataSelectFitur.get(A.toUpperCase());

    // console.log(summary.selectedDataMap, "ini pake", baru);
    // const found = selectedData.findIndex((d) => {
    //   return (
    //     A.includes(
    //       lastCharAfterSpace(normalizeText(d?.toLowerCase()), separator)
    //     ) || A.includes(baru.split("-")[1])
    //   );
    // });

    const found = A.toUpperCase().split("|")[1] === baru;
    console.log(baru, "ini emang ga ada?");

    // console.log(found, "keteu ga", A, baru);
    // if (found == -1) {
    //   console.log("dnfound");
    //   isValid = false;
    // }

    const [job1, job2, job3] = (baru || "").split("-");
    // if (found !== -1) {
    if (found) {
      // console.log("jumlah + 1");
      isValid = true;
      // if (
      //   jumlahKanban[
      //     `${Data[found].dn_number},${Data[found][uniqueColumn[0]]}`
      //   ] > endDN[`${Data[found].dn_number},${Data[found][uniqueColumn[0]]}`]
      // ) {
      //   console.log("jumlahkanban");
      //   isValid = false;
      // }
      // console.log(
      //   "jumlahkanban",
      //   endDN,
      //   jumlahKanban,
      //   jumlahKanban[`${job1 + "-" + job2}+${cycleFilter}`],
      //   `${job1 + "-" + job2}+${cycleFilter}`
      // );
      if (
        jumlahKanban[`${job1 + "-" + job2}+${cycleFilter}`] >
        endDN[`${job1 + "-" + job2}+${cycleFilter}`]
      ) {
        isValid = false;
      }

      jumlahKanban[`${job1 + "-" + job2}+${cycleFilter}`] =
        (jumlahKanban[`${job1 + "-" + job2}+${cycleFilter}`] || 0) + 1;
      // console.log(String(Data[found].dn_number), "dn");
    }
    // const updatedValidList = [...validList];
    // updatedValidList[index] = isValid;
    // // console.log(updatedValidList, "valid ksh");
    // setValidList(updatedValidList);

    const match = matchEntryWithMergedData(
      // Data,
      summary.comboFieldMap,
      currentComboMap,
      row,
      summary.comboToDNMap,
      summary.dnMap,
      summary.comboToMaterialMap,
      summary.selectedDataMap,
      kanban
      // dataReal
      // startDate,
      // endDate,
      // separator
    );

    console.log(
      summary.comboFieldMap,
      currentComboMap,
      row,
      summary.comboToDNMap,
      summary.dnMap,
      summary.comboToMaterialMap,
      summary.selectedDataMap
    );
    console.log(match, "apa bener match");

    isValid = match.matchFound;
    const changedRow = {
      ...updatedRows[index],
      status: isValid,
    };

    const updatedValidList = [...validList];
    updatedValidList[index] = isValid;
    // console.log(updatedValidList, "valid ksh");
    setValidList(updatedValidList);

    try {
      console.log(isValid, "ada");
      const isRowComplete = rows[index].kanban.endsWith("\n");

      if (isRowComplete) {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/inputQR`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              row: changedRow,
              index,
              id,
              selectedDate,
              dnFound: match.matchedDN,
              cycle: cycleFilter,
            }),
          }
        );

        const result = await res.json();
        // console.log("Submitted row:", changedRow, "Result:", result);
      }
    } catch (err) {
      console.error("Failed to save input:", err);
    }
    if (field === "kanban" && newValue !== "") {
      // setTimeout(() => {
      //   inputRefs.current[index * 2 + 2]?.focus();
      // }, 3);

      if (value.endsWith("\n")) {
        setTimeout(() => {
          inputRefs.current[(index + 2) * 2]?.focus();
        }, 1);
      }
    }
    const last10Filled = updatedRows.slice(-10).every((r) => r.kanban);

    if (last10Filled) {
      const newRows = Array.from({ length: 10 }, () => ({
        kanban: "",
        labelSupplier: "",
      }));
      setRows((prev) => [...prev, ...newRows]);

      // setTimeout(() => {
      //   inputRefs.current[(index + 1) * 2]?.focus();
      // }, 3);
      if (value.endsWith("\n")) {
        setTimeout(() => {
          inputRefs.current[(index + 1) * 2]?.focus();
        }, 1);
      }
    } else {
      // setTimeout(() => {
      //   inputRefs.current[(index + 1) * 2]?.focus();
      // }, 3);
      if (value.endsWith("\n")) {
        setTimeout(() => {
          inputRefs.current[(index + 1) * 2]?.focus();
        }, 1);
      }
    }
  };

  const handleKirimDN = async () => {
    setIsSubmitting(true);
    try {
      // console.log(cycleFilter);
      if (!cycleFilter) return;
      let currentShift = shiftWaktuMap?.[cycleFilter || 1]?.shift;
      if (!currentShift || currentShift === "-") {
        const proses = await checkProsesSekarang();
        currentShift = proses?.kode_shift;
      }
      const res = await api.post("/track/getCode", {
        customerId: id,
        tanggal: selectedDate,
        cycle: cycleFilter || 1,
        shift: currentShift,
      });

      if (res.data.shift && res.data?.verificationCode) {
        setqrCodes((prev) => {
          const newCode =
            res.data.verificationCode || res.data.data.verificationCode;
          return prev.includes(newCode) || newCode == null
            ? prev
            : [...prev, newCode];
        });
        setShiftWaktuMap((prev) => ({
          ...prev,
          [cycleFilter]: {
            waktuAktual: res.data.waktuAktual
              ? moment(res.data.waktuAktual).format("DD-MM-YYYY HH:mm")
              : " ",
            shift: res.data.shift || " ",
          },
        }));
      }
    } catch (logErr) {
      console.error("Gagal kirim log ke server:", logErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayClassName = (date) => {
    const dateStr = moment(date).format("YYYY-MM-DD");
    const isHighlighted = createdAtList.some(
      (createdAt) =>
        moment.tz(createdAt, "Asia/Jakarta").format("YYYY-MM-DD") === dateStr
    );
    return isHighlighted ? "highlighted-day" : "";
  };

  const highlightDates = createdAtList.map(
    (createdAt) => new Date(moment(createdAt).format("YYYY-MM-DD"))
  );

  // console.log(selectedData, createdAtList, Data, "creted");

  useEffect(() => {
    if (shouldAutoFocus && rows.length > 0) {
      const lastIndexWithValue = rows.findIndex((row) => !row.kanban);
      const focusIndex =
        lastIndexWithValue !== -1 ? lastIndexWithValue : rows.length;
      const inputEl = inputRefs.current[focusIndex * 2];
      if (inputEl) {
        inputEl.focus();
      }
      setShouldAutoFocus(false); // jadi ga focus terus kecuali udah fetch
    }
  }, [rows, shouldAutoFocus]);

  // <tr>
  //   <td>{cycle}</td>

  //   <td>         {/* {shift &&
  //   //         `${moment()
  //   //           .tz("Asia/Jakarta")
  //   //           .format("DD-MM-YYYY")} ${data.waktuAktual}`} */}

  //   </td>
  //   <td>{data.shift}</td>

  useEffect(() => {
    isFirst.current = true; // Reset saat Data berubah
  }, [Data]);
  useEffect(() => {
    if (!Data || Data.length === 0) return;

    // console.log(
    //   cycleFilter,
    //   Data.filter(
    //     (item) =>
    //       !cycleFilter || String(item.delivery_cycle) === String(cycleFilter)
    //   )
    // );
    const filteredDN = Array.from(
      new Set(
        Data.filter(
          (item) =>
            !cycleFilter ||
            item.delivery_cycle === String(cycleFilter) ||
            item.delivery_cycle === cycleFilter
        ).map((d) => d.dn_number)
      )
    ).sort();
    // console.log(filteredDN, "dn filters");

    setDNFilter(filteredDN);
  }, [Data, cycleFilter]);

  // </tr>
  return (
    <div className="p-4">
      <div className="mb-6 flex items-center justify-start pt-10 align-middle gap-3">
        <h1 className="font-bold text-2xl">SCAN QR</h1>
        {/* <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className={`${
            isOpen ? "text-transparent" : "text-gray-500"
          } cursor-pointer`}
        >
          <GiHamburgerMenu size={17} />
        </button> */}
      </div>
      {/* 
      <div className="flex gap-4 mb-6 flex-wrap"> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-800">
            Tanggal
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date) => handleClickDate(date)}
            dateFormat="yyyy-MM-dd"
            className="w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            dayClassName={dayClassName}
            highlightDates={highlightDates}
            // maxDate={new Date() }
            placeholderText="Pilih tanggal"
            showYearDropdown
            dropdownMode="select"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-800">DN</label>
          <div className="relative">
            <div
              className="flex justify-between items-center w-full p-3 text-sm border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 bg-white"
              onClick={() => setIsDnOpen(!isDnOpen)}
            >
              <span className="truncate">
                {dnFilter.length > 0
                  ? `${dnFilter.length} selected`
                  : "Pilih DN..."}
              </span>
              <FaChevronDown
                className={`text-gray-800 transition-transform ${
                  isDnOpen ? "rotate-180" : ""
                }`}
              />
            </div>

            {isDnOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-1 space-y-1">
                  {Array.from(
                    new Set(
                      Data.filter(
                        (item) =>
                          !cycleFilter ||
                          String(item.delivery_cycle) === String(cycleFilter)
                      ).map((d) => d.dn_number)
                    )
                  )
                    .sort()
                    .map((dn) => (
                      <label
                        key={dn}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={dnFilter.includes(dn)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDNFilter((prev) =>
                              checked
                                ? [...prev, dn]
                                : prev.filter((d) => d !== dn)
                            );
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800">{dn}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-800">
            Cycle
          </label>
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(Number(e.target.value))}
            className="w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {Array.from(new Set(Data.map((d) => d.delivery_cycle)))
              .sort()
              .map((cycle) => (
                <option key={cycle} value={cycle}>
                  Cycle {cycle}
                </option>
              ))}
          </select>
        </div>
      </div>
      {qrCodes.length > 0 && dataLoaded && (
        <>
          <div className="items-center">
            <h2 className="text-lg font-semibold mb-2">
              Scan QR Code untuk verifikasi
            </h2>
            <div className="mb-6 p-4 border rounded-lg bg-white flex flex-row gap-5 items-center">
              {qrCodes.map((qrCode, index) => {
                return (
                  <div>
                    <QRCode
                      size={150}
                      style={{ height: "auto" }}
                      value={qrCode}
                      viewBox={`0 0 256 256`}
                    />
                    <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg my-5 py-3">
                      <button
                        onClick={() => handleCopy(index)}
                        className="text-gray-600 hover:text-black"
                        title="Salin kode"
                      >
                        <MdFileCopy size={18} />
                      </button>
                      {copiedIndex === index && (
                        <span className="text-emerald-700 text-sm">
                          Tersalin!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {dataLoaded && kanban && (
        <div className="flex gap-6">
          <div className="overflow-y-auto max-h-[600px] w-[500px] space-y-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`flex flex-col gap-1 border p-2 rounded ${
                  validList[index] ? "bg-[#27b387]" : "bg-[#f33d3a]"
                }`}
              >
                <label className="text-xs text-white font-medium">Kanban</label>
                <input
                  ref={(el) => (inputRefs.current[index * 2] = el)}
                  type="text"
                  className={`w-full p-1 border rounded bg-white`}
                  value={row.kanban}
                  disabled={shiftWaktuMap?.[cycleFilter || 1]?.shift}
                  onInput={(e) =>
                    handleInput(index, "kanban", e.currentTarget.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // biar nggak submit form atau fokus next
                      const updatedValue = row.kanban + "\n";
                      handleInput(index, "kanban", updatedValue);
                    }
                  }}
                />
                <label className="text-xs text-white font-medium">
                  Label Supplier
                </label>
                <input
                  ref={(el) => (inputRefs.current[index * 2 + 1] = el)}
                  type="text"
                  className="w-full p-1 border rounded bg-white"
                  value={row.labelSupplier}
                  disabled={shiftWaktuMap?.[cycleFilter || 1]?.shift}
                  onInput={(e) =>
                    handleInput(index, "labelSupplier", e.currentTarget.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // biar nggak submit form atau fokus next
                      const updatedValue = row.labelSupplier + "\n";
                      handleInput(index, "labelSupplier", updatedValue);
                    }
                  }}
                />
                <div className="text-center items-center">
                  <p
                    className={`w-fit h-[30px] px-2 rounded-md md:text-lg lg:text-md xl:text-xl  font-bold text-white ${
                      validList[index] ? "bg-green-700" : "bg-red-800"
                    }`}
                  >
                    {validList[index] ? "OK " : `NG `}
                    {row.pesan ?? " "}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-[200px] space-y-4">
            <div className="border border-gray-300 p-4 rounded bg-white max-h-[600px] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-2">Summary Table</h2>
              {/* <select
                className="border p-1 mb-2"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
              >
                <option value="">All Cycles</option>
                {[...new Set(summaryTable.map((row) => row.cycle))].map(
                  (cycle, i) => (
                    <option key={i} value={cycle}>
                      {cycle}
                    </option>
                  )
                )}
              </select> */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">DN Number</th>
                    {/* <th className="border px-2 py-1">Total</th>
                    <th className="border px-2 py-1">Sisa</th>
                    <th className="border px-2 py-1">Status</th> */}
                    <th>Qty Order</th>
                    <th className="border px-2 py-1">Qty Kanban</th>
                    <th className="border px-2 py-1">Sisa Kanban</th>
                    {/* <th className="border px-2 py-1">Cycle</th> */}
                    <th className="border px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryTable.map((row, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">{row.dn_number}</td>
                      {/* <td className="border px-2 py-1">{row.total}</td>
                      <td className="border px-2 py-1">{row.sisa}</td> */}
                      <td className="border px-2 py-1">{row.jumlah_order}</td>
                      <td className="border px-2 py-1">{row.total}</td>
                      <td className="border px-2 py-1">{row.sisa}</td>
                      {/* <td className="border px-2 py-1">{row.cycle}</td> */}
                      <td
                        className={`border px-2 py-1 font-semibold ${
                          row.status === "Closed"
                            ? "text-[#27b387]"
                            : "text-[#f33d3a]"
                        }`}
                      >
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-2 p-2 bg-red-500 rounded-lg shadow-md">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-white font-semibold">MISS PART:</span>
                  <span className="text-white font-bold text-xl">
                    {missPart}
                  </span>
                </div>
              </div>

              <table className="my-6 h-[60px]">
                <thead>
                  <tr>
                    <th className="text-xs w-[150px]">Cycle</th>
                    <th className="text-xs w-[150px]">Waktu Selesai: </th>
                    <th className="text-xs">Shift</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.keys(shiftWaktuMap).length > 0 ? (
                    Object.entries(shiftWaktuMap).map(([cycle, data]) => (
                      <tr key={cycle}>
                        <td>{cycle}</td>
                        <td>{` ${data.waktuAktual ?? "-"}`}</td>
                        <td>{data.shift ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-center text-gray-400 py-2"></td>
                      <td className="text-center text-gray-400 py-2"></td>
                      <td className="text-center text-gray-400 py-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {dataLoaded && !kanban && (
        <div className="flex gap-6">
          <div className="overflow-y-auto max-h-[600px] w-[500px] space-y-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`flex flex-col gap-1 border p-2 rounded ${
                  validList[index] ? "bg-[#27b387]" : "bg-[#f33d3a]"
                }`}
              >
                <label className="text-xs text-white font-medium">Kanban</label>
                <input
                  ref={(el) => (inputRefs.current[index * 2] = el)}
                  type="text"
                  className={`w-full p-1 border rounded bg-white`}
                  value={row.kanban}
                  disabled={shiftWaktuMap?.[cycleFilter || 1]?.shift}
                  onInput={(e) =>
                    handleInputKanban(index, "kanban", e.currentTarget.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // biar nggak submit form atau fokus next
                      const updatedValue = row.kanban + "\n";
                      handleInputKanban(index, "kanban", updatedValue);
                    }
                  }}
                />
                <div className="text-center items-center">
                  <p
                    className={`w-fit h-[30px] px-2 rounded-md text-xl font-bold text-white ${
                      validList[index] ? "bg-green-700" : "bg-red-800"
                    }`}
                  >
                    {validList[index] ? "OK" : "NG"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="min-w-[200px] space-y-4">
            <div className="border border-gray-300 p-4 rounded bg-white max-h-[600px] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-2">Summary Table</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Job No</th>
                    <th>Qty Order</th>
                    <th className="border px-2 py-1">Qty Kanban</th>
                    <th className="border px-2 py-1">Sisa Kanban</th>
                    <th className="border px-2 py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryTable.map((row, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">
                        {row?.dn_number.split(",")[0]}
                      </td>
                      <td className="border px-2 py-1">{row.jumlah_order}</td>
                      <td className="border px-2 py-1">{row.total}</td>
                      <td className="border px-2 py-1">{row.sisa}</td>
                      <td
                        className={`border px-2 py-1 font-semibold ${
                          row.status === "Open"
                            ? "text-[#27b387]"
                            : "text-[#f33d3a]"
                        }`}
                      >
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-2 p-2 bg-red-500 rounded-lg shadow-md">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-white font-semibold">MISS PART:</span>
                  <span className="text-white font-bold text-xl">
                    {missPart}
                  </span>
                </div>
              </div>

              <table className="my-6 h-[60px]">
                <thead>
                  <tr>
                    <th className="w-[150px]">Waktu Selesai: </th>
                    <th>Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(shiftWaktuMap).length > 0 ? (
                    Object.entries(shiftWaktuMap).map(([cycle, data]) => (
                      <tr key={cycle}>
                        <td>{` ${data.waktuAktual ?? "-"}`}</td>
                        <td>{data.shift ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-center text-gray-400 py-2"></td>
                      <td className="text-center text-gray-400 py-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {dataLoaded && (
        <button
          onClick={handleKirimDN}
          disabled={isSubmitting}
          className={`my-10 float-right px-6 py-2 rounded-lg font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    ${
      isSubmitting
        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
        : "bg-[#105bdf] hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    }
  `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600"
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
              Mengonfirmasi...
            </span>
          ) : (
            "Closed Parsial"
          )}
        </button>
      )}
    </div>
  );
}
