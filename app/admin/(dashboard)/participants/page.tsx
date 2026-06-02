import { db } from "@/lib/db";
import { ParticipantsTable } from "@/components/admin/participants-table";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { getT } from "@/lib/i18n/server";

async function getParticipants() {
  return db.query.participants.findMany({
    orderBy: (participants, { asc }) => [asc(participants.name)],
  });
}

export default async function ParticipantsPage() {
  const t = await getT();
  const participants = await getParticipants();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <AdminSectionHeader
            title={t("admin.participantsPage.title")}
            subtitle={t("admin.participantsPage.subtitle")}
            icon={Users}
            className="mb-0"
          />
        </div>
        <Badge className="bg-slate-100 text-slate-600 font-mono text-sm px-2 py-0.5 rounded-md font-bold border-0">
          {participants.length}
        </Badge>
      </div>

      <ParticipantsTable participants={participants} />
    </div>
  );
}
