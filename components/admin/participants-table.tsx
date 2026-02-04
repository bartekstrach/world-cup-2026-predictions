"use client";

interface Participant {
  id: number;
  name: string;
  email: string | null;
}

export function ParticipantsTable({
  participants,
}: {
  participants: Participant[];
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Email
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {participants.map((p) => (
            <tr key={p.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {p.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {p.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {p.email || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
