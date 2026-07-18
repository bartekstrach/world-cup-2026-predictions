"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { withMatchMedal } from "@/components/tournament-medal-ui";

type PublicationStageOption = {
  stage: string;
  order: number;
};

type PublicationMatchOption = {
  id: number;
  matchNumber: number;
  matchDate: string;
  stage: string;
  stageOrder: number;
  homeTeamCode: string;
  awayTeamCode: string;
  homeTeamName: string;
  awayTeamName: string;
};

type PublicationOptionsResponse = {
  competitionId: number | null;
  allowAllPublishedOverride: boolean;
  unpublishedStages: PublicationStageOption[];
  unpublishedMatches: PublicationMatchOption[];
};

export function PublishControlsCard() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);

  const [allowOverride, setAllowOverride] = useState(false);
  const [stages, setStages] = useState<PublicationStageOption[]>([]);
  const [matches, setMatches] = useState<PublicationMatchOption[]>([]);

  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/publication/options", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as PublicationOptionsResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || t("admin.publication.loadFailedFallback"),
        );
      }

      setAllowOverride(data.allowAllPublishedOverride);
      setStages(data.unpublishedStages);
      setMatches(data.unpublishedMatches);
      setSelectedStage((current) =>
        current && data.unpublishedStages.some((item) => item.stage === current)
          ? current
          : (data.unpublishedStages[0]?.stage ?? ""),
      );
      setSelectedMatchId((current) =>
        current &&
        data.unpublishedMatches.some((item) => item.id.toString() === current)
          ? current
          : (data.unpublishedMatches[0]?.id.toString() ?? ""),
      );
    } catch (error) {
      toast.error(t("admin.publication.loadFailed"), {
        description:
          error instanceof Error
            ? error.message
            : t("admin.publication.loadFailedFallback"),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const selectedStageLabel = useMemo(() => {
    if (!selectedStage) return t("admin.publication.selectStage");
    return t(`predictionSheets.stages.${selectedStage}`);
  }, [selectedStage, t]);

  const selectedMatchLabel = useMemo(() => {
    const match = matches.find(
      (item) => item.id.toString() === selectedMatchId,
    );
    if (!match) return t("admin.publication.selectMatch");
    return withMatchMedal(
      `${match.homeTeamCode} ${t("common.vs")} ${match.awayTeamCode}`,
      {
        matchNumber: match.matchNumber,
        matchId: match.id,
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,
      },
    );
  }, [matches, selectedMatchId, t]);

  const publishStage = useCallback(async () => {
    if (!selectedStage) return;

    setSavingStage(true);
    try {
      const response = await fetch("/api/admin/publication", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "stage",
          stage: selectedStage,
          isPublished: true,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error || t("admin.publication.stagePublishFailed"),
        );
      }

      toast.success(t("admin.publication.stagePublished"), {
        description: selectedStageLabel,
      });
      await loadOptions();
    } catch (error) {
      toast.error(t("admin.publication.stagePublishFailed"), {
        description:
          error instanceof Error
            ? error.message
            : t("admin.publication.saveFailedFallback"),
      });
    } finally {
      setSavingStage(false);
    }
  }, [loadOptions, selectedStage, selectedStageLabel, t]);

  const publishMatch = useCallback(async () => {
    const matchId = Number(selectedMatchId);
    if (!Number.isInteger(matchId) || matchId <= 0) return;

    setSavingMatch(true);
    try {
      const response = await fetch("/api/admin/publication", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "match",
          matchId,
          isPublished: true,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error || t("admin.publication.matchPublishFailed"),
        );
      }

      toast.success(t("admin.publication.matchPublished"), {
        description: selectedMatchLabel,
      });
      await loadOptions();
    } catch (error) {
      toast.error(t("admin.publication.matchPublishFailed"), {
        description:
          error instanceof Error
            ? error.message
            : t("admin.publication.saveFailedFallback"),
      });
    } finally {
      setSavingMatch(false);
    }
  }, [loadOptions, selectedMatchId, selectedMatchLabel, t]);

  const toggleOverride = useCallback(
    async (nextValue: boolean) => {
      setSavingOverride(true);
      const previous = allowOverride;
      setAllowOverride(nextValue);

      try {
        const response = await fetch("/api/admin/publication", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "override",
            allowAllPublishedOverride: nextValue,
          }),
        });

        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            data.error || t("admin.publication.overrideSaveFailed"),
          );
        }

        toast.success(t("admin.publication.overrideSaved"), {
          description: nextValue
            ? t("admin.publication.overrideEnabled")
            : t("admin.publication.overrideDisabled"),
        });
      } catch (error) {
        setAllowOverride(previous);
        toast.error(t("admin.publication.overrideSaveFailed"), {
          description:
            error instanceof Error
              ? error.message
              : t("admin.publication.saveFailedFallback"),
        });
      } finally {
        setSavingOverride(false);
      }
    },
    [allowOverride, t],
  );

  return (
    <Card className="rounded-2xl border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] gap-0">
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-[#0a192f]">
          {t("admin.publication.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 mt-4 space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {t("admin.publication.stage")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-full sm:flex-1 border-slate-200 bg-white">
                <SelectValue placeholder={t("admin.publication.selectStage")} />
              </SelectTrigger>
              <SelectContent>
                {stages.map((item) => (
                  <SelectItem key={item.stage} value={item.stage}>
                    {t(`predictionSheets.stages.${item.stage}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="sm:w-auto"
              onClick={() => void publishStage()}
              disabled={
                loading || savingStage || stages.length === 0 || !selectedStage
              }
            >
              {savingStage
                ? t("admin.publication.saving")
                : t("admin.publication.publishStageAction", {
                    stage: selectedStageLabel,
                  })}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {t("admin.publication.match")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
              <SelectTrigger className="w-full sm:flex-1 border-slate-200 bg-white">
                <SelectValue placeholder={t("admin.publication.selectMatch")} />
              </SelectTrigger>
              <SelectContent>
                {matches.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    #{item.matchNumber}{" "}
                    {withMatchMedal(
                      `${item.homeTeamCode} ${t("common.vs")} ${item.awayTeamCode}`,
                      {
                        matchNumber: item.matchNumber,
                        matchId: item.id,
                        homeTeamCode: item.homeTeamCode,
                        awayTeamCode: item.awayTeamCode,
                      },
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="sm:w-auto"
              onClick={() => void publishMatch()}
              disabled={
                loading ||
                savingMatch ||
                matches.length === 0 ||
                !selectedMatchId
              }
            >
              {savingMatch
                ? t("admin.publication.saving")
                : t("admin.publication.publishMatchAction", {
                    match: selectedMatchLabel,
                  })}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-slate-700">
              {t("admin.publication.override")}
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300 accent-[#10b981]"
              checked={allowOverride}
              disabled={savingOverride || loading}
              onChange={(event) => void toggleOverride(event.target.checked)}
            />
          </label>
        </div>

        {!loading && stages.length === 0 && matches.length === 0 ? (
          <p className="text-sm text-slate-500">
            {t("admin.publication.none")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
