import DeleteUser from "./deleteUser";

export default function TableUser({ users, onDeleteUser, loading, error }) {
  const handleDelete = async (userId) => {
    const confirmation = window.confirm(
      "Apakah Anda yakin ingin menghapus user ini?"
    );
    if (!confirmation) return;

    const result = await onDeleteUser(userId);

    alert(result.message);
  };

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
  {
    error && !loading && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }
  return (
    <div className="w-full my-20 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-lg overflow-hidden mx-auto max-w-3xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Daftar User</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    NPK
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Full Name
                  </th>

                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Position
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.npk}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.fullname}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left w-3xs">
                      <span
                        className={`ml-3 px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg 
                            ${
                              item.position.includes("Operator") ||
                              item.position.includes("User")
                                ? "bg-purple-300 text-purple-800"
                                : item.position.includes("operator")
                                ? "bg-blue-300 text-blue-800"
                                : "bg-green-300 text-green-800"
                            }`}
                      >
                        {item.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium place-items-center">
                      <DeleteUser
                        id={item._id}
                        successDelete={() => handleDelete(item._id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
