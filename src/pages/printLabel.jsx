import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import "react-datepicker/dist/react-datepicker.css";
import CetakTag from "../components/PilihTag";
import api from "../utils/api";
import { FaArrowLeft } from "react-icons/fa";

export default function PrintLabel() {
  const { line, uniqueCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [dataMaterial, setDataMaterial] = useState([]);

  const fetchData = async () => {
    try {
      const res = await api.get("/data/all/unique");

      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch data material unique:", err);
    }
  };

  const fetchMaterial = async () => {
    try {
      const res = await api.get("/materials");

      setDataMaterial(res.data.data);
    } catch (err) {
      console.error("Failed to fetch schema fields:", err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      await fetchData();
      await fetchMaterial();
    };
    fetchAll();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.material.toLowerCase().trim() ===
          uniqueCode.split("_")[0].toLowerCase().trim() &&
        item.line.toLowerCase() === line.split("-")[0].toLowerCase().trim()
    );
  }, [data, uniqueCode, line]);

  const uniqueMaterial = useMemo(() => {
    return dataMaterial.filter(
      (item) =>
        item.material === uniqueCode.split("_")[0] &&
        item.customer.includes(uniqueCode.split("_")[1])
    );
  }, [dataMaterial, uniqueCode]);

  function getPrefixOnly(code) {
    const Match = code.match(/^([A-Z]+)/);
    return Match ? Match[1] : "";
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded hover:border-gray-600 border-transparent border-2 transition flex items-center gap-2"
        >
          <FaArrowLeft size={20} />
          Kembali
        </button>
      </div>

      <CetakTag
        dataAsli={filteredData}
        Material={uniqueMaterial}
        lineAt={line}
        code={uniqueCode.split("_")[0]}
        customer={getPrefixOnly(uniqueCode.split("_")[1])}
      />
    </div>
  );
}
