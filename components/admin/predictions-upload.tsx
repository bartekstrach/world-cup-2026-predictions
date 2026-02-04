"use client";

import { useState } from "react";

interface ExtractedData {
  participantName: string;
  participantId: number;
  predictions: Array<{
    matchNumber: number;
    homeScore: number;
    awayScore: number;
    updated?: boolean;
  }>;
}

export function PredictionsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);
    setError(null);

    // Create preview
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

      setResult(data.extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Image
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
              <img
                src={preview}
                alt="Preview"
                className="max-w-md rounded border border-gray-300"
              />
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? "Processing..." : "Upload & Process"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            ✓ Extracted Successfully
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-green-800">Participant:</p>
              <p className="text-green-900">
                {result.participantName} (ID: {result.participantId})
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-green-800 mb-2">
                Predictions ({result.predictions.length}):
              </p>
              <div className="bg-white rounded border border-green-200 p-4 max-h-96 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Match</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.predictions.map((pred) => (
                      <tr
                        key={pred.matchNumber}
                        className="border-b last:border-0"
                      >
                        <td className="py-2">#{pred.matchNumber}</td>
                        <td className="py-2 font-mono">
                          {pred.homeScore}:{pred.awayScore}
                        </td>
                        <td className="py-2">
                          {pred.updated ? (
                            <span className="text-yellow-600">Updated</span>
                          ) : (
                            <span className="text-green-600">New</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
