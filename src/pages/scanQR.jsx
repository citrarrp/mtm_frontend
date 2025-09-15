import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function ScanQR() {
  const [Data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/data/`
        );
        const data = await res.json();
        setData(data.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  console.log(Data);

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl text-gray-800">Customer</h1>
      {Data.map((item) => (
        <div key={item._id}>
          {/* <h1 className="font-bold text-2xl mb-6 text-gray-800 border-b pb-2">
            {item.nama}
          </h1> */}
          <ul>
            <li
              className="cursor-pointer hover:text-[#105bdf] text-black font-bold border-1 rounded-md p-6 mx-5"
              onClick={() => {
                navigate(`${item._id}`);
              }}
            >
              {item.nama}
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
