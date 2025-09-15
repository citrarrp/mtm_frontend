import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GiCardboardBoxClosed } from "react-icons/gi";
import { FaArrowLeft } from "react-icons/fa";

export default function PageUniqueMaterial() {
  const navigate = useNavigate();
  const { line } = useParams();
  const [data, setData] = useState([]);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/materials`
      );
      const Data = await res.json();
      setData(Data.data);
    } catch (err) {
      console.error("Failed to fetch schema fields:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function getPrefixOnly(code) {
    const Match = code.match(/^([A-Z]+)/);
    return Match ? Match[1] : "";
  }
  const uniqueMaterialCustomer = [];
  const seen = new Set();

  data.forEach((item) => {
    const key = `${item.material}-${getPrefixOnly(item.customer)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMaterialCustomer.push(item);
    }
  });

  return (
    <>
      {/* <Breadcrumb /> */}
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded hover:border-gray-600 border-transparent border-2 transition flex items-center gap-2"
          >
            <FaArrowLeft size={20} />
            Kembali
          </button>
        </div>

        {data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {uniqueMaterialCustomer
              .filter((item) => item.line === line.split("-")[0])
              .map((tag) => {
                const combinedKey = `${tag.material}_${getPrefixOnly(
                  tag.customer
                )}`;
                return (
                  <div
                    key={combinedKey}
                    className="relative bg-white rounded-2xl shadow-lg border-2 border-blue-50 overflow-hidden cursor-pointer group"
                    onClick={() => navigate(combinedKey)}
                  >
                    <div className="p-5 flex items-start gap-4">
                      <div className="p-3 rounded-full bg-blue-50 text-blue-700">
                        <GiCardboardBoxClosed size={30} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-700 mb-1">
                          {tag.part_name || tag.material_description.trim()}
                        </h3>
                        <p className="text-sm text-gray-500 ">
                          {tag.part_no || tag.material}
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                      {getPrefixOnly(tag.customer)}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </>
  );
}
