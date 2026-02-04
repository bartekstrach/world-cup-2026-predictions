import { db } from "@/lib/db";
import { ParticipantsTable } from "@/components/admin/participants-table";

async function getParticipants() {
  return db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });
}

export default async function ParticipantsPage() {
  const participants = await getParticipants();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600 mt-1">Manage competition participants</p>
        </div>
      </div>

      <ParticipantsTable participants={participants} />
    </div>
  );
}
