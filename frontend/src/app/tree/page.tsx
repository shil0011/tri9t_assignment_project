"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDocuments, useVersionNodes } from "@/lib/api";
import { TreeExplorer } from "@/components/features/tree-explorer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

function TreeContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc");
  
  const { data: documents } = useDocuments();
  const document = documents?.find(d => d.id === Number(docId));
  
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");

  // Default to the highest version number
  useEffect(() => {
    if (document?.versions && document.versions.length > 0 && !selectedVersionId) {
      const highestVersion = [...document.versions].sort((a, b) => b.version_num - a.version_num)[0];
      setSelectedVersionId(highestVersion.id.toString());
    }
  }, [document, selectedVersionId]);

  const version = document?.versions?.find(v => v.id.toString() === selectedVersionId);
  
  const { data: nodes, isLoading } = useVersionNodes(version?.id || null);

  if (!docId) {
    return <div className="p-8">Please select a document from the Dashboard.</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tree Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Viewing structure for <span className="font-medium text-foreground">{document?.title || "..."}</span>
          </p>
        </div>
        {document?.versions && document.versions.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-medium">Version:</span>
            <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {[...document.versions].sort((a, b) => b.version_num - a.version_num).map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    Version {v.version_num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <Card className="h-full border-border/50 shadow-sm flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 flex min-h-0">
            {isLoading ? (
              <div className="p-8">Loading nodes...</div>
            ) : nodes && nodes.length > 0 ? (
              <TreeExplorer nodes={nodes} document={document} />
            ) : (
              <div className="p-8 text-muted-foreground">No nodes found or document has no content.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TreePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TreeContent />
    </Suspense>
  );
}
