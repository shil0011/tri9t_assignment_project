"use client";

import { useState } from "react";
import { useDocuments, useCompareVersions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GitCompare, PlusCircle, MinusCircle, Edit3, CircleDashed } from "lucide-react";
import { DiffViewer } from "@/components/features/diff-viewer";

export default function ComparePage() {
  const { data: documents } = useDocuments();
  const [docId, setDocId] = useState<string>("");
  const [oldV, setOldV] = useState<string>("");
  const [newV, setNewV] = useState<string>("");
  
  const selectedDoc = documents?.find(d => d.id.toString() === docId);
  const { data: compareResult, isLoading } = useCompareVersions(Number(oldV), Number(newV));

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight">Version Comparison</h1>
        <p className="text-muted-foreground mt-2">Generate lightweight diffs between document versions.</p>
      </div>

      <Card className="border-border/50 shrink-0 mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document</label>
              <Select value={docId} onValueChange={setDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  {documents?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Baseline Version</label>
              <Select value={oldV} onValueChange={setOldV} disabled={!selectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Old version" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDoc?.versions?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>Version {v.version_num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Version</label>
              <Select value={newV} onValueChange={setNewV} disabled={!selectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="New version" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDoc?.versions?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>Version {v.version_num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0 bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {!oldV || !newV ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <GitCompare className="w-12 h-12 opacity-20" />
            <p>Select two versions to compare</p>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Comparing versions...</p>
          </div>
        ) : compareResult ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex gap-6 shrink-0">
              <div className="flex items-center gap-2 text-green-600">
                <PlusCircle className="w-4 h-4" />
                <span className="font-medium">{compareResult.summary.added} Added</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <MinusCircle className="w-4 h-4" />
                <span className="font-medium">{compareResult.summary.deleted} Deleted</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Edit3 className="w-4 h-4" />
                <span className="font-medium">{compareResult.summary.modified} Modified</span>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {compareResult.diffs.map((diff: any, idx: number) => {
                  let bgColor = "bg-muted/10 border-border/50";
                  let icon = <CircleDashed className="w-5 h-5 text-muted-foreground" />;
                  let StatusBadge = null;
                  
                  if (diff.status === "added") {
                    bgColor = "bg-green-500/5 border-green-500/30";
                    icon = <PlusCircle className="w-5 h-5 text-green-600" />;
                    StatusBadge = <Badge className="bg-green-600 hover:bg-green-700">Added</Badge>;
                  } else if (diff.status === "deleted") {
                    bgColor = "bg-red-500/5 border-red-500/30";
                    icon = <MinusCircle className="w-5 h-5 text-red-600" />;
                    StatusBadge = <Badge variant="destructive">Deleted</Badge>;
                  } else if (diff.status === "modified") {
                    bgColor = "bg-blue-500/5 border-blue-500/30";
                    icon = <Edit3 className="w-5 h-5 text-blue-600" />;
                    StatusBadge = <Badge className="bg-blue-600 hover:bg-blue-700">Modified</Badge>;
                  }

                  if (diff.status === "unchanged") return null;

                  return (
                    <div key={idx} className={`p-5 rounded-lg border ${bgColor}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {icon}
                          <h4 className="font-semibold text-lg">{diff.title} <span className="text-sm font-normal text-muted-foreground ml-2">({diff.node_id})</span></h4>
                        </div>
                        {StatusBadge}
                      </div>

                      {diff.status === "modified" ? (
                        <div className="flex flex-col gap-4">
                          {diff.old_title && diff.old_title !== diff.title && (
                            <div className="p-4 rounded-md bg-orange-500/10 border border-orange-500/20">
                              <p className="text-xs font-semibold text-orange-700 mb-1 uppercase">Title Changed</p>
                              <div className="flex items-center gap-4 text-sm font-medium">
                                <span className="line-through opacity-70">{diff.old_title}</span>
                                <span>→</span>
                                <span>{diff.title}</span>
                              </div>
                            </div>
                          )}
                          
                          {(diff.old_content || diff.new_content) ? (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Content Changes</p>
                              <DiffViewer oldContent={diff.old_content} newContent={diff.new_content} />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="p-4 rounded-md bg-background border border-border/50">
                          <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                            {diff.new_content || diff.old_content}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {compareResult.summary.added === 0 && compareResult.summary.deleted === 0 && compareResult.summary.modified === 0 && (
                  <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                    No differences found between these versions.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </div>
    </div>
  );
}
