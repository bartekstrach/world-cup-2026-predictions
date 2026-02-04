import { PredictionsUpload } from "@/components/admin/predictions-upload";

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Predictions Upload</h2>
        <p className="text-gray-600 mt-1">Upload scanned prediction sheets</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Expected Format</h3>
        <pre className="text-sm text-blue-800 font-mono">
          {`Name: John Doe
1. 2:1
2. 0:0
3. 3:2
...`}
        </pre>
      </div>

      <PredictionsUpload />
    </div>
  );
}
