import { PredictionsUpload } from "@/components/admin/predictions-upload";
import { MissingPredictionsCard } from "@/components/admin/missing-predictions-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { getAdminStats } from "@/lib/admin-stats";
import { FileText, Upload } from "lucide-react";

export default async function PredictionsPage() {
  const stats = await getAdminStats().catch((error) => {
    console.error("Failed to load admin stats for predictions page", error);
    return null;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminSectionHeader
        title="Predictions Upload"
        subtitle="Upload scanned prediction sheets with OCR"
        icon={Upload}
      />

      <Card className="bg-[#f0f7ff] border-[#dbeafe] rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
        <CardHeader className="p-0">
          <CardTitle className="text-lg flex items-center gap-2 text-[#1e40af] font-bold">
            <FileText className="h-5 w-5" />
            Expected Format
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <pre className="text-sm text-[#1e3a8a] font-mono bg-white/60 rounded-xl p-4 border border-white shadow-sm whitespace-pre-wrap">
            {`Name: John Doe

15.06 Monday
A 15:00 Brazil 2:1 Germany
A 18:00 Japan 1:1 Mexico

16.06 Tuesday
A 15:00 Brazil 2:0 Japan
B 18:00 Spain 3:0 England
...`}
          </pre>
          <ul className="mt-4 space-y-1 text-sm text-[#3b82f6]">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              Participant name at the top
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              One match per line with scores
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              Handwritten scores in clear boxes work best
            </li>
          </ul>
        </CardContent>
      </Card>

      {stats ? (
        <MissingPredictionsCard
          totalMissingPredictions={stats.total_missing_predictions}
          byParticipant={stats.missingPredictionsByParticipant}
          byMatch={stats.missingPredictionsByMatch}
        />
      ) : null}

      <PredictionsUpload />
    </div>
  );
}
