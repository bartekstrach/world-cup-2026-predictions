import { PredictionsUpload } from "@/components/admin/predictions-upload";
import { MissingPredictionsCard } from "@/components/admin/missing-predictions-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { getAdminStats } from "@/lib/admin-stats";
import { FileText, Upload } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function PredictionsPage() {
  const t = await getT();
  const stats = await getAdminStats().catch((error) => {
    console.error("Failed to load admin stats for predictions page", error);
    return null;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminSectionHeader
        title={t("admin.predictionsPage.title")}
        subtitle={t("admin.predictionsPage.subtitle")}
        icon={Upload}
      />

      <Card className="bg-[#f0f7ff] border-[#dbeafe] rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
        <CardHeader className="p-0">
          <CardTitle className="text-lg flex items-center gap-2 text-[#1e40af] font-bold">
            <FileText className="h-5 w-5" />
            {t("admin.predictionsPage.expectedFormat")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <pre className="text-sm text-[#1e3a8a] font-mono bg-white/60 rounded-xl p-4 border border-white shadow-sm whitespace-pre-wrap">
            {t("admin.predictionsPage.sampleFormat")}
          </pre>
          <ul className="mt-4 space-y-1 text-sm text-[#3b82f6]">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              {t("admin.predictionsPage.format.participantTop")}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              {t("admin.predictionsPage.format.oneMatchPerLine")}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#3b82f6]" />
              {t("admin.predictionsPage.format.handwritten")}
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
