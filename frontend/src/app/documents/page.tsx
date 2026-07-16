"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useUploadDocument } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const uploadDoc = useUploadDocument();
  const router = useRouter();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      if (!title) setTitle(e.dataTransfer.files[0].name.replace(/\.(md|pdf|docx)$/i, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    try {
      const res = await uploadDoc.mutateAsync({ title, file });
      toast.success("Document uploaded successfully!");
      router.push(`/tree?doc=${res.id}`);
    } catch (error) {
      toast.error("Failed to upload document");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-2">Upload markdown, PDF, or DOCX documentation to trace and verify.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. System Requirements Specification v1" 
                className="bg-muted/50"
              />
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${file ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                accept=".md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.length) {
                    setFile(e.target.files[0]);
                    if (!title) setTitle(e.target.files[0].name.replace(/\.(md|pdf|docx)$/i, ''));
                  }
                }} 
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-lg font-medium">{file.name}</div>
                  <div className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-medium">Click or drag Markdown, PDF, or DOCX file here</div>
                  <div className="text-sm text-muted-foreground">Supports .md, .pdf, .docx files up to 10MB</div>
                </div>
              )}
            </div>

            <Button 
              className="w-full h-12 text-base" 
              disabled={!file || !title || uploadDoc.isPending}
              onClick={handleUpload}
            >
              {uploadDoc.isPending 
                ? (file?.name.toLowerCase().endsWith('.pdf') ? "Uploading & Parsing PDF (may take a minute for OCR)..." : "Uploading...") 
                : "Upload Document"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
