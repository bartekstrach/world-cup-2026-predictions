"use client";

import Image from "next/image";
import { useState } from "react";

interface ParsedMatch {
  date?: string;
  time?: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface PreviewData {
  blobUrl: string;
  participantName: string;
  rawText: string;
  matches: ParsedMatch[];
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
          matchPredictions: editedData.matches,
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

  function updateMatchTeam(
    index: number,
    field: "homeTeam" | "awayTeam",
    value: string
  ) {
    if (!editedData) return;
    const newMatches = [...editedData.matches];
    newMatches[index] = {
      ...newMatches[index],
      [field]: value,
    };
    setEditedData({ ...editedData, matches: newMatches });
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          1. Upload Image
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select prediction sheet image
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
              <Image
                src={preview}
                alt="Preview"
                width={768}
                height={1024}
                className="rounded border border-gray-300"
                style={{ width: "auto", height: "auto", maxWidth: "100%" }}
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading || !!previewData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Processing..." : "Extract Text"}
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
          <h3 className="text-lg font-semibold text-gray-900">
            2. Review & Edit
          </h3>

          {/* Raw Text */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Extracted Text:
            </p>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
              {previewData?.rawText}
            </pre>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Matches Table */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Predictions ({editedData.matches.length}):
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date/Time
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Home
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      Score
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Away
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editedData.matches.map((match, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                        {match.date} {match.time}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={match.homeTeam}
                          onChange={(e) =>
                            updateMatchTeam(idx, "homeTeam", e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm border rounded"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={match.homeScore ?? ""}
                            onChange={(e) =>
                              updateMatchScore(idx, "homeScore", e.target.value)
                            }
                            className="w-12 px-2 py-1 text-sm border rounded text-center"
                            placeholder="_"
                          />
                          <span className="text-gray-500">:</span>
                          <input
                            type="number"
                            min="0"
                            value={match.awayScore ?? ""}
                            onChange={(e) =>
                              updateMatchScore(idx, "awayScore", e.target.value)
                            }
                            className="w-12 px-2 py-1 text-sm border rounded text-center"
                            placeholder="_"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={match.awayTeam}
                          onChange={(e) =>
                            updateMatchTeam(idx, "awayTeam", e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm border rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition"
            >
              {loading ? "Saving..." : "Confirm & Save to Database"}
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
