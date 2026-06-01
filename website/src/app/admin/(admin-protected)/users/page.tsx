export default function GlobalUsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Global Admins</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add Admin</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 border-b">Email</th>
              <th className="p-4 border-b">Role</th>
              <th className="p-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-4 border-b text-gray-900">admin@pos.whizpoint.app</td>
              <td className="p-4 border-b text-gray-900">Super Admin</td>
              <td className="p-4 border-b text-blue-600 cursor-pointer">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
