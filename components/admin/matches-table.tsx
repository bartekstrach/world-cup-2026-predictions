"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import {
  MATCH_STAGES,
  MATCH_STATUSES,
  type MatchStage,
  type MatchStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/date";
import { toFifaCode } from "@/lib/country-utils";
import { cn } from "@/lib/utils";

const STATUS_FILTER_OPTIONS: MatchStatus[] = [
  MATCH_STATUSES.SCHEDULED,
  MATCH_STATUSES.LIVE,
  MATCH_STATUSES.FINISHED,
];

const DEFAULT_STATUS_FILTER: MatchStatus[] = [
  MATCH_STATUSES.SCHEDULED,
  MATCH_STATUSES.LIVE,
];

interface Match {
  id: number;
  matchNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  stage: MatchStage;
  matchDate: Date | string;
  status: MatchStatus | null;
  homeTeam: { name: string; code: string };
  awayTeam: { name: string; code: string };
}

export function MatchesTable({
  matches,
  defaultStageFilter,
}: {
  matches: Match[];
  defaultStageFilter: MatchStage;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Match[]>(matches);
  const [stageFilter, setStageFilter] = useState<MatchStage | "all">(
    defaultStageFilter,
  );
  const [statusFilter, setStatusFilter] = useState<MatchStatus[]>(
    DEFAULT_STATUS_FILTER,
  );
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!statusDropdownOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [statusDropdownOpen]);

  function toggleStatusFilter(status: MatchStatus) {
    setStatusFilter((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  const statusFilterLabel = useMemo(() => {
    if (statusFilter.length === 0) {
      return t("matchesTable.placeholders.status");
    }

    return STATUS_FILTER_OPTIONS.filter((status) =>
      statusFilter.includes(status),
    )
      .map((status) => t(`matchesTable.status.${status}`))
      .join(", ");
  }, [statusFilter, t]);
  const [editing, setEditing] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [status, setStatus] = useState<MatchStatus>("scheduled");
  const [savingMatchId, setSavingMatchId] = useState<number | null>(null);

  async function handleSave(matchId: number) {
    setSavingMatchId(matchId);

    try {
      const response = await fetch("/api/admin/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeScore,
          awayScore,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(t("matchesTable.requestFailed"));
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === matchId
            ? {
                ...row,
                homeScore,
                awayScore,
                status,
              }
            : row,
        ),
      );

      toast.success(t("matchesTable.updated"), {
        description:
          status === "finished"
            ? t("matchesTable.updatedFinished")
            : t("matchesTable.updatedLive"),
      });
      setEditing(null);
    } catch {
      toast.error(t("matchesTable.failed"), {
        description: t("matchesTable.tryAgain"),
      });
    } finally {
      setSavingMatchId(null);
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const effectiveStatus = row.status ?? "scheduled";
      const matchesStage = stageFilter === "all" || row.stage === stageFilter;
      const matchesStatus = statusFilter.includes(effectiveStatus);

      return matchesStage && matchesStatus;
    });
  }, [rows, stageFilter, statusFilter]);

  const getStatusBadge = (status: MatchStatus | null) => {
    if (status === "finished") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#0a192f] text-white">
          {t("matchesTable.status.finished")}
        </span>
      );
    }

    if (status === "live") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500 text-white animate-pulse">
          {t("matchesTable.status.live")}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
        {t("matchesTable.status.scheduled")}
      </span>
    );
  };

  return (
    <Card className="rounded-2xl border-slate-100 p-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("matchesTable.filters.stage")}
            </span>
            <Select
              value={stageFilter}
              onValueChange={(value) =>
                setStageFilter(value as MatchStage | "all")
              }
            >
              <SelectTrigger className="w-48 border-slate-200 bg-white">
                <SelectValue
                  placeholder={t("matchesTable.placeholders.stage")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("matchesTable.filters.allStages")}
                </SelectItem>
                {MATCH_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {t(`predictionSheets.stages.${stage}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("matchesTable.filters.status")}
            </span>
            <div className="relative" ref={statusFilterRef}>
              <button
                type="button"
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
                onClick={() => setStatusDropdownOpen((open) => !open)}
                className={cn(
                  "flex h-9 w-52 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
              >
                <span className="line-clamp-1 text-left text-slate-700">
                  {statusFilterLabel}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
              </button>

              {statusDropdownOpen ? (
                <div
                  role="listbox"
                  aria-multiselectable="true"
                  className="absolute right-0 z-50 mt-1 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-md"
                >
                  {STATUS_FILTER_OPTIONS.map((status) => (
                    <label
                      key={status}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-[#10b981]"
                        checked={statusFilter.includes(status)}
                        onChange={() => toggleStatusFilter(status)}
                      />
                      {t(`matchesTable.status.${status}`)}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto public-table-scroll">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <TableHead className="w-16 text-center p-4 h-auto">#</TableHead>
              <TableHead className="text-center p-4 h-auto">
                {t("matchesTable.headers.kickoff")}
              </TableHead>
              <TableHead className="p-4 h-auto">
                {t("matchesTable.headers.stage")}
              </TableHead>
              <TableHead className="p-4 h-auto">
                {t("matchesTable.headers.match")}
              </TableHead>
              <TableHead className="text-center p-4 h-auto">
                {t("matchesTable.headers.result")}
              </TableHead>
              <TableHead className="text-center p-4 h-auto">
                {t("matchesTable.headers.status")}
              </TableHead>
              <TableHead className="text-right p-4 h-auto">
                {t("matchesTable.headers.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((match) => (
              <TableRow
                key={match.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <TableCell className="font-mono text-slate-400 font-medium text-center p-4">
                  {match.matchNumber}
                </TableCell>
                <TableCell className="text-center p-4">
                  <time className="font-mono text-slate-600 whitespace-nowrap">
                    {formatDateTime({ date: new Date(match.matchDate) })}
                  </time>
                </TableCell>
                <TableCell className="font-medium text-slate-600 p-4 whitespace-nowrap">
                  {t(`predictionSheets.stages.${match.stage}`)}
                </TableCell>
                <TableCell className="font-medium text-slate-700 p-4">
                  {toFifaCode(match.homeTeam.code)} {t("common.vs")}{" "}
                  {toFifaCode(match.awayTeam.code)}
                </TableCell>
                <TableCell className="text-center p-4">
                  {editing === match.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={homeScore}
                        onChange={(e) => setHomeScore(Number(e.target.value))}
                        className="w-16 text-center font-mono focus-visible:ring-[#10b981]/40"
                      />
                      <span className="text-slate-300 font-bold">:</span>
                      <Input
                        type="number"
                        min="0"
                        value={awayScore}
                        onChange={(e) => setAwayScore(Number(e.target.value))}
                        className="w-16 text-center font-mono focus-visible:ring-[#10b981]/40"
                      />
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-[#0a192f]">
                      {match.homeScore !== null && match.awayScore !== null
                        ? `${match.homeScore}:${match.awayScore}`
                        : "-"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center p-4">
                  {editing === match.id ? (
                    <div className="flex justify-center">
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          setStatus(value as MatchStatus)
                        }
                      >
                        <SelectTrigger className="w-32 border-slate-200 focus:ring-[#10b981]/40">
                          <SelectValue
                            placeholder={t("matchesTable.placeholders.status")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">
                            {t("matchesTable.status.scheduled")}
                          </SelectItem>
                          <SelectItem value="live">
                            {t("matchesTable.status.live")}
                          </SelectItem>
                          <SelectItem value="finished">
                            {t("matchesTable.status.finished")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    getStatusBadge(match.status)
                  )}
                </TableCell>
                <TableCell className="p-4">
                  {editing === match.id ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(match.id)}
                        className="bg-[#0a192f] text-white hover:bg-[#0a192f]/90"
                        disabled={savingMatchId === match.id}
                      >
                        {savingMatchId === match.id
                          ? t("matchesTable.saving")
                          : t("matchesTable.save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(null)}
                        disabled={savingMatchId === match.id}
                      >
                        {t("matchesTable.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#0a192f]"
                        onClick={() => {
                          setEditing(match.id);
                          setHomeScore(match.homeScore ?? 0);
                          setAwayScore(match.awayScore ?? 0);
                          setStatus(match.status ?? "scheduled");
                        }}
                      >
                        {t("matchesTable.edit")}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
