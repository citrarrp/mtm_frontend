import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { MdOutlineDeviceHub } from "react-icons/md";

export default function LabelPage() {
  const navigate = useNavigate();
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

  const seen = new Set();
  const uniqueLines = data.filter((tag) => {
    if (seen.has(tag.line)) return false;
    seen.add(tag.line);
    return true;
  });

  return (
    <>
      {/* <Breadcrumb /> */}
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 ml-2 text-gray-800 pb-4">
          Pilih Line
        </h1>

        {data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {uniqueLines
              // .filter((item) => item.line.trim() !== "")
              .map((tag, idx) => {
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl shadow-lg border-2 border-blue-50 overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`${tag.line}-${idx}`)}
                  >
                    <div className="p-5 flex items-start gap-4">
                      <div className="p-3 rounded-full bg-blue-50 text-blue-700">
                        <MdOutlineDeviceHub size={30} />
                      </div>

                      <h3 className="text-xl font-bold text-blue-700 p-3">
                        {tag.line}
                      </h3>
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
