import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ConverterProps {
  semester: number;
  title: string;
  description?: string;
}

const SemesterConverter: React.FC<ConverterProps> = ({ semester, title, description }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("semester", semester.toString());

    try {
      const response = await fetch(`http://localhost:5000/api/students/upload-semester/${semester}`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: result.message,
        });
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="file" accept=".csv" onChange={handleFileChange} />
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? "Processing..." : "Upload & Sync to DB"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SemesterConverter;