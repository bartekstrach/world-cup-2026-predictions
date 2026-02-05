import { db } from "@/lib/db";
import { ParticipantsTable } from "@/components/admin/participants-table";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function getParticipants() {
  return db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });
}

export default async function ParticipantsPage() {
  const participants = await getParticipants();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold text-slate-900">
                Participants
              </h2>
              <Badge variant="secondary">{participants.length}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Manage competition participants
            </p>
          </div>
        </div>

        {/* Future: Add participant button */}
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Participant
        </Button>
      </div>

      <ParticipantsTable participants={participants} />
    </div>
  );
}
