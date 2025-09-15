import { useNavigate, useParams } from "react-router";
import api from "../utils/api";
import { useCallback, useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";
import { IoMdInformationCircleOutline } from "react-icons/io";

export default function TrackingCustomerPage() {
  const { customerId } = useParams();
  const [dataCust, setDataCust] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(`/track/${customerId}`);
      setDataCust(response.data.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // const handleDelete = async (id) => {
  //   const confirmation = window.confirm(
  //     "Apakah Anda yakin ingin menghapus cycle ini?"
  //   );
  //   if (!confirmation) return;

  //   try {
  //     setLoading(true);
  //     const data = await api.delete(`/data/${customerId}/${id}`);
  //     if (data.data.data.acknowledged) {
  //       // setNewSchemaLabel("");
  //       // await fetchSchemaFields();
  //       await fetchData();
  //       return { success: true, message: "Field berhasil dihapus!" };
  //     } else {
  //       return {
  //         success: false,
  //         message: data.message || "Gagal mengambil data!",
  //       };
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     return {
  //       success: false,
  //       message: error.response?.data?.message || "Gagal menghapus user",
  //     };
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
        <div className="flex space-x-3 p-4 rounded-xl">
          <div className="h-4 w-4 bg-blue-500/80 rounded-full animate-bounce"></div>
          <div
            className="h-4 w-4 bg-blue-400/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="h-4 w-4 bg-blue-300/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    );

  if (!dataCust)
    return (
      <div className="h-[90vh] flex items-center justify-center">
        <div className="bg-red-100/50 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 transition-all duration-300 hover:shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-15 h-15 bg-red-100 rounded-full flex items-center justify-center">
              <IoMdInformationCircleOutline
                size={50}
                className="text-red-500"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Data Tidak Ditemukan!
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Maaf, terjadi kesalahan saat memuat data tracking. Silakan coba lagi
            dalam beberapa saat.
          </p>
        </div>
      </div>
    );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Tracking Customer: {dataCust.nama}
      </h1>

      <div className="grid gap-4">
        {dataCust
          .sort((a, b) => a - b)
          .map((item) => (
            <div
              key={item}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4 flex justify-between items-center">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`${item}`)}
                >
                  <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                    Cycle {item}
                  </h3>
                </div>

                {/* <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.numberCycle);
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete Cycle"
                >
                  <MdDelete className="w-5 h-5" />
                </button> */}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
