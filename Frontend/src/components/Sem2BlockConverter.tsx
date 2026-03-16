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
import { toast } from "sonner";
import { ArrowLeft, FileJson, Loader2, Upload, Database } from "lucide-react";
import { Link } from "react-router-dom";

const Sem2BlockConverter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    formData.append("semester", "2"); // Hardcoded to Semester 2

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
        toast.success(
          `Successfully extracted ${result.data.length} records for preview`,
        );
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

  const handleSaveToDatabase = async () => {
    if (!file) return;

    setIsSaving(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", "2"); // Hardcoded to Semester 2

    try {
      toast.info("Saving records to database...");

      const response = await fetch(
        "http://localhost:5000/api/isolated/extract-pdf",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Failed to save to database",
        );
      }

      toast.success(result.message || "Successfully saved to database!");
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || "Database connection error");
    } finally {
      setIsSaving(false);
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
                Semester 2 Data Extractor
              </h1>
              <p className="text-muted-foreground">
                Standalone extraction tool for Sem 2 (13 Papers)
              </p>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>
              Upload the Semester 2 result PDF for processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            
            <Button
              className="w-full"
              onClick={handleProcess}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Preview...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract Preview Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {extractedData && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Extracted Results
                </CardTitle>
                <CardDescription>
                  Preview of the data mapped from the PDF
                </CardDescription>
              </div>
              <div className="flex gap-2">
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
                    a.download = `sem2_extracted.json`;
                    a.click();
                  }}
                >
                  Download JSON
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  Save to Database
                </Button>
              </div>
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

export default Sem2BlockConverter;