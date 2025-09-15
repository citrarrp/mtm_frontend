import { Link, useNavigate } from "react-router";
import api from "../utils/api";
import { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";

export default function TrackingDelivery() {
  const [dataCustomer, setData] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    api
      .get("/data")
      .then((res) => {
        setData(res.data.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleEdit = (id, e) => {
    e.stopPropagation();
    navigate(`/updateCycle/${id}`);
  };
  return (
    <div className="max-w-full">
      <h1 className="text-xl font-bold mb-4">Tracking Delivery</h1>
      {dataCustomer.map((data, idx) => (
        <div className="p-4" key={idx}>
          <ul>
            <li
              className="flex justify-between items-center cursor-pointer hover:bg-gray-50 text-black font-bold border rounded-lg p-4 transition-colors duration-200"
              onClick={() => {
                navigate(`${data._id}`);
              }}
            >
              <span className="hover:text-[#105bdf]">{data.nama}</span>
              <button
                onClick={(e) => handleEdit(data._id, e)}
                className="text-gray-500 hover:text-blue-600 p-3 cursor-pointer rounded-full bg-gray-200 hover:bg-blue-50 transition-colors duration-200"
                title="Edit Customer"
              >
                <FaEdit className="w-5 h-5" />
              </button>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}
