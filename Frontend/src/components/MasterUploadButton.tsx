import React, { useState } from "react";
import { Button } from "./ui/button"; // Adjust path if needed
import { Input } from "./ui/input"; // Adjust path if needed
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "./ui/use-toast"; // Assuming you use shadcn toasts

const MasterUploadButton = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Error", description: "Please select an Excel/CSV file first", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/students/upload-master", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        toast({ title: "Success!", description: data.message });
        setFile(null); // Clear file after success
      } else {
        toast({ title: "Upload Failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Server connection failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-xl shadow-sm flex flex-col gap-4 w-full max-w-md">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">1. Upload Master Student List</h3>
        <p className="text-sm text-gray-500">Upload a CSV containing student 'Name' and 'PRN' to establish the database baseline.</p>
      </div>
      
      <Input 
        type="file" 
        accept=".csv" 
        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
      />
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || loading}
        className="w-full"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
        ) : (
          <><UploadCloud className="mr-2 h-4 w-4" /> Save to Database</>
        )}
      </Button>
    </div>
  );
};

export default MasterUploadButton;