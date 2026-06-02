"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { SUBMISSION_STAGES, type SubmissionStage } from "@/lib/constants";
import { useTranslation } from "react-i18next";

interface TeamInfo {
  id: number;
  name: string;
  code: string;
}

interface MatchPrediction {
  matchId: number;
  matchNumber: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface PreviewData {
  blobUrl: string;
  participantName: string;
  stage: SubmissionStage | "";
  rawText: string;
  extractedScoresCount: number;
  matchesCount: number;
  matches: MatchPrediction[];
}

const STAGE_OPTIONS = [...SUBMISSION_STAGES] as const;

export function PredictionsUpload() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploadStage, setUploadStage] = useState<SubmissionStage | "">("");
  const [uploadParticipantName, setUploadParticipantName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [editedData, setEditedData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadParticipantName.trim()) {
      toast.error(t("predictionsUpload.participantNameRequired"), {
        description: t("predictionsUpload.fillParticipantBeforeFile"),
      });
      e.target.value = "";
      return;
    }

    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreviewData(null);
    setEditedData(null);
    setError(null);
    setSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selected);
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const participantName =
      editedData?.participantName?.trim() || uploadParticipantName.trim();
    if (participantName) {
      formData.append("participantName", participantName);
    }
    if (uploadStage) {
      formData.append("stage", uploadStage);
    }

    try {
      const response = await fetch("/api/admin/predictions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("predictionsUpload.uploadFallback"));
      }

      toast.success(t("predictionsUpload.imageProcessed"), {
        description: t("predictionsUpload.scoresExtracted", {
          count: data.preview.extractedScoresCount,
        }),
      });

      setPreviewData({
        ...data.preview,
        participantName: data.preview.participantName || participantName,
        stage: data.preview.stage || uploadStage,
      });
      setEditedData({
        ...data.preview,
        participantName: data.preview.participantName || participantName,
        stage: data.preview.stage || uploadStage,
      });
    } catch (err) {
      toast.error(t("predictionsUpload.uploadFailed"), {
        description:
          err instanceof Error
            ? err.message
            : t("predictionsUpload.unknownError"),
      });
      setError(
        err instanceof Error
          ? err.message
          : t("predictionsUpload.uploadFallback"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!editedData || !editedData.stage) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/predictions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: editedData.participantName,
          stage: editedData.stage,
          blobUrl: editedData.blobUrl,
          matchPredictions: editedData.matches
            .filter((m) => m.homeScore !== null && m.awayScore !== null)
            .map((m) => ({
              matchId: m.matchId,
              homeScore: m.homeScore,
              awayScore: m.awayScore,
            })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("predictionsUpload.confirmFailed"));
      }

      toast.success(t("predictionsUpload.predictionsSaved"), {
        description: t("predictionsUpload.predictionsSavedDesc", {
          count: data.total,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        setFile(null);
        setUploadStage("");
        setUploadParticipantName("");
        setPreview(null);
        setPreviewData(null);
        setEditedData(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      toast.error(t("predictionsUpload.saveFailed"), {
        description:
          err instanceof Error
            ? err.message
            : t("predictionsUpload.unknownError"),
      });
      setError(
        err instanceof Error
          ? err.message
          : t("predictionsUpload.confirmFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  function updateParticipantName(name: string) {
    if (!editedData) return;
    setEditedData({ ...editedData, participantName: name });
  }

  function updateStage(stage: SubmissionStage) {
    if (!editedData) return;
    setEditedData({ ...editedData, stage });
  }

  function updateMatchScore(
    index: number,
    field: "homeScore" | "awayScore",
    value: string,
  ) {
    if (!editedData) return;
    const newMatches = [...editedData.matches];
    newMatches[index] = {
      ...newMatches[index],
      [field]: value === "" ? null : parseInt(value),
    };
    setEditedData({ ...editedData, matches: newMatches });
  }

  const filledScores =
    editedData?.matches.filter(
      (m) => m.homeScore !== null && m.awayScore !== null,
    ).length || 0;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-[#0a192f] mb-4">
          {t("predictionsUpload.step1")}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.participantName")}:{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={uploadParticipantName}
              onChange={(e) => setUploadParticipantName(e.target.value)}
              className="w-full max-w-xl px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]"
              placeholder={t("predictionsUpload.participantName")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.tournamentStage")}:{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              value={uploadStage}
              onChange={(e) =>
                setUploadStage(e.target.value as SubmissionStage | "")
              }
              className="w-full max-w-xl border-slate-200 rounded-lg shadow-sm py-2 px-3 focus:ring-[#10b981] focus:border-[#10b981] bg-white text-slate-700 outline-none"
              required
            >
              <option value="">{t("predictionsUpload.selectStage")}</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`predictionSheets.stages.${stage}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.selectScannedImage")}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={!uploadParticipantName.trim()}
              className="block w-full max-w-xl text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-200 file:text-sm file:font-medium file:bg-[#f0f4f8] file:text-[#0a192f] hover:file:bg-slate-100"
            />
            {!uploadParticipantName.trim() && (
              <p className="text-xs text-amber-600 mt-1">
                {t("predictionsUpload.fillParticipantFirst")}
              </p>
            )}
          </div>

          {preview && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t("predictionsUpload.preview")}
              </p>
              <div className="relative max-w-md">
                <Image
                  src={preview}
                  alt={t("common.previewAlt")}
                  width={768}
                  height={1024}
                  className="rounded border border-gray-300"
                  style={{ width: "auto", height: "auto", maxWidth: "100%" }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={
              !file ||
              !uploadStage ||
              !uploadParticipantName.trim() ||
              loading ||
              !!previewData
            }
            className="bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:cursor-not-allowed enabled:bg-[#0a192f] enabled:hover:bg-[#0a192f]/90 transition-colors"
          >
            {loading
              ? t("predictionsUpload.processing")
              : t("predictionsUpload.extractScores")}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-semibold">
            {t("predictionsUpload.error")}
          </p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 font-semibold">
            {t("predictionsUpload.savedSuccess")}
          </p>
        </div>
      )}

      {/* Preview & Edit Section */}
      {editedData && (
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a192f]">
              {t("predictionsUpload.step2")}
            </h3>
            <div className="text-sm text-slate-500">
              {t("predictionsUpload.scoresFilled", {
                filled: filledScores,
                total: editedData.matchesCount,
              })}
            </div>
          </div>

          {/* Extraction Stats */}
          <div className="bg-[#f0f7ff] border border-[#dbeafe] rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-[#1e3a8a]">
              <div>
                <span className="font-medium">
                  {t("predictionsUpload.scoresExtractedLabel")}
                </span>{" "}
                <span>{previewData?.extractedScoresCount || 0}</span>
              </div>
              <div>
                <span className="font-medium">
                  {t("predictionsUpload.totalMatches")}
                </span>{" "}
                <span>{editedData.matchesCount}</span>
              </div>
            </div>
            {(previewData?.extractedScoresCount || 0) &&
              editedData.matchesCount && (
                <p className="text-xs text-[#1e40af] mt-2">
                  {t("predictionsUpload.someMissing")}
                </p>
              )}
          </div>

          {/* Tournament Stage */}
          <div>
            <label className="block text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.tournamentStage")}:{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              value={editedData.stage}
              onChange={(e) => updateStage(e.target.value as SubmissionStage)}
              className="w-full max-w-xl border-slate-200 rounded-lg shadow-sm py-2 px-3 focus:ring-[#10b981] focus:border-[#10b981] bg-white text-slate-700 outline-none"
              required
            >
              <option value="">{t("predictionsUpload.selectStage")}</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`predictionSheets.stages.${stage}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Participant Name */}
          <div>
            <label className="block text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.participantName")}:
            </label>
            <input
              type="text"
              value={editedData.participantName}
              onChange={(e) => updateParticipantName(e.target.value)}
              className="w-full max-w-xl px-3 py-2 border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]"
            />
          </div>

          {/* Matches Table */}
          <div>
            <p className="text-sm font-medium text-[#0a192f] mb-2">
              {t("predictionsUpload.matchPredictions")}
            </p>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50/90 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("predictionsUpload.headers.match")}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("predictionsUpload.headers.prediction")}
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {t("predictionsUpload.headers.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editedData.matches.map((match, idx) => {
                    const isFilled =
                      match.homeScore !== null && match.awayScore !== null;
                    return (
                      <tr
                        key={match.matchId}
                        className={isFilled ? "" : "bg-amber-50/40"}
                      >
                        <td className="px-3 py-2 text-sm text-slate-900 font-mono whitespace-nowrap">
                          {match.matchNumber}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700 font-medium whitespace-nowrap">
                          {match.homeTeam.code} {t("common.vs")}{" "}
                          {match.awayTeam.code}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={match.homeScore ?? ""}
                              onChange={(e) =>
                                updateMatchScore(
                                  idx,
                                  "homeScore",
                                  e.target.value,
                                )
                              }
                              className="w-12 px-2 py-1 text-sm border border-slate-200 rounded text-center font-mono font-bold focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]"
                              placeholder="0"
                            />
                            <span className="text-slate-300 font-bold">:</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={match.awayScore ?? ""}
                              onChange={(e) =>
                                updateMatchScore(
                                  idx,
                                  "awayScore",
                                  e.target.value,
                                )
                              }
                              className="w-12 px-2 py-1 text-sm border border-slate-200 rounded text-center font-mono font-bold focus:ring-2 focus:ring-[#10b981]/30 focus:border-[#10b981]"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isFilled ? (
                            <span className="text-[#10b981] text-xs font-semibold">
                              ✓
                            </span>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium">
                              {t("predictionsUpload.empty")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Text (Collapsible) */}
          <details className="bg-slate-50 rounded border border-slate-200">
            <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-slate-700">
              {t("predictionsUpload.showExtracted")}
            </summary>
            <pre className="text-xs p-4 overflow-x-auto font-mono">
              {previewData?.rawText}
            </pre>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || loading || !!previewData}
            >
              {loading
                ? t("predictionsUpload.processing")
                : t("predictionsUpload.extractScores")}
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={loading || filledScores === 0 || !editedData.stage}
            >
              {loading
                ? t("predictionsEditor.saving")
                : t("predictionsUpload.saveCount", { count: filledScores })}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setPreviewData(null);
                setEditedData(null);
              }}
            >
              {t("forms.common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
