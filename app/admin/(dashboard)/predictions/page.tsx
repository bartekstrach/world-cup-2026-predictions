import { PredictionsUpload } from "@/components/admin/predictions-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Upload className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Predictions Upload
          </h2>
          <p className="text-muted-foreground mt-1">
            Upload scanned prediction sheets with OCR
          </p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Expected Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-blue-900 font-mono bg-white rounded-lg p-4 border border-blue-200">
            {`Name: John Doe

15.06 Monday
A 15:00 Brazil 2:1 Germany
A 18:00 Japan 1:1 Mexico

16.06 Tuesday
A 15:00 Brazil 2:0 Japan
B 18:00 Spain 3:0 England
...`}
          </pre>
          <p className="text-sm text-muted-foreground mt-3">
            • Participant name at the top
            <br />
            • One match per line with scores
            <br />• Handwritten scores in clear boxes work best
          </p>
        </CardContent>
      </Card>

      <PredictionsUpload />
    </div>
  );
}
