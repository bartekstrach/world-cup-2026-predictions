"use client";

import { useState } from "react";
import Image from "next/image";

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
  rawText: string;
  extractedScoresCount: number;
  matchesCount: number;
  matches: MatchPrediction[];
}

export function PredictionsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [editedData, setEditedData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    try {
      const response = await fetch("/api/admin/predictions/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setPreviewData(data.preview);
      setEditedData(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!editedData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/predictions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: editedData.participantName,
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
        throw new Error(data.error || "Confirmation failed");
      }

      setSuccess(true);
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setPreviewData(null);
        setEditedData(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  function updateParticipantName(name: string) {
    if (!editedData) return;
    setEditedData({ ...editedData, participantName: name });
  }

  function updateMatchScore(
    index: number,
    field: "homeScore" | "awayScore",
    value: string
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
      (m) => m.homeScore !== null && m.awayScore !== null
    ).length || 0;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          1. Upload Prediction Sheet
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select scanned image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {preview && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <div className="relative max-w-md">
                <Image
                  src={preview}
                  alt="Preview"
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
            disabled={!file || loading || !!previewData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Processing..." : "Extract Scores"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">
            ✓ Predictions saved successfully!
          </p>
        </div>
      )}

      {/* Preview & Edit Section */}
      {editedData && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              2. Review & Edit Predictions
            </h3>
            <div className="text-sm text-gray-600">
              {filledScores} / {editedData.matchesCount} scores filled
            </div>
          </div>

          {/* Extraction Stats */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">
                  Scores extracted:
                </span>{" "}
                <span className="text-blue-700">
                  {previewData?.extractedScoresCount || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-900">
                  Total matches:
                </span>{" "}
                <span className="text-blue-700">{editedData.matchesCount}</span>
              </div>
            </div>
            {(previewData?.extractedScoresCount || 0) &&
              editedData.matchesCount && (
                <p className="text-xs text-blue-800 mt-2">
                  ⚠ Some scores missing - please fill manually below
                </p>
              )}
          </div>

          {/* Participant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant Name:
            </label>
            <input
              type="text"
              value={editedData.participantName}
              onChange={(e) => updateParticipantName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Matches Table */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Match Predictions:
            </p>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Match
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Prediction
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
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
                        className={isFilled ? "" : "bg-yellow-50"}
                      >
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {match.matchNumber}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {match.homeTeam.code} vs {match.awayTeam.code}
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
                                  e.target.value
                                )
                              }
                              className="w-12 px-2 py-1 text-sm border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                            <span className="text-gray-500">:</span>
                            <input
                              type="number"
                              min="0"
                              max="9"
                              value={match.awayScore ?? ""}
                              onChange={(e) =>
                                updateMatchScore(
                                  idx,
                                  "awayScore",
                                  e.target.value
                                )
                              }
                              className="w-12 px-2 py-1 text-sm border rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isFilled ? (
                            <span className="text-green-600 text-xs">✓</span>
                          ) : (
                            <span className="text-yellow-600 text-xs">
                              Empty
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
          <details className="bg-gray-50 rounded border">
            <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700">
              Show extracted text
            </summary>
            <pre className="text-xs p-4 overflow-x-auto">
              {previewData?.rawText}
            </pre>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading || filledScores === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? "Saving..." : `Save ${filledScores} Predictions`}
            </button>
            <button
              onClick={() => {
                setPreviewData(null);
                setEditedData(null);
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
