import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, FileJson, Loader2, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const IsolatedPdfConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [semester, setSemester] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);

  const handleProcess = async () => {
    if (!file) {
      toast.error("Please select a PDF file first");
      return;
    }

    setLoading(true);
    setExtractedData(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", semester);

    try {
      const response = await fetch(
        "http://localhost:5000/api/isolated/extract-pdf",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process PDF");
      }

      const result = await response.json();

      if (result.success) {
        setExtractedData(result.data);
        toast.success(`Successfully extracted ${result.count} records`);
      } else {
        toast.error(result.error || "Extraction failed");
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Server connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                PDF Data Extractor
              </h1>
              <p className="text-muted-foreground">
                Standalone extraction tool for Sem 1 & 2
              </p>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Select the semester structure used in the PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Semester</label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1 (11 Papers)</SelectItem>
                    <SelectItem value="2">Semester 2 (13 Papers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Result PDF</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleProcess}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing PDF...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {extractedData && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Extracted Results
                </CardTitle>
                <CardDescription>
                  Raw JSON output from the extractor
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify(extractedData, null, 2)],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `sem${semester}_extracted.json`;
                  a.click();
                }}
              >
                Download JSON
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px]">
                <pre className="text-xs leading-relaxed">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default IsolatedPdfConverter;
