import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, FileText, Bookmark, Copy, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TraceabilityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: any;
}

export function TraceabilityPanel({ open, onOpenChange, metadata }: TraceabilityPanelProps) {
  if (!metadata) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[450px] flex flex-col p-0">
        <SheetHeader className="p-6 border-b border-border bg-muted/20">
          <SheetTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Requirement Traceability
          </SheetTitle>
          <SheetDescription>
            Source context and metadata for the selected requirement.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Document Metadata
              </h4>
              <div className="bg-muted/30 border border-border p-3 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document ID</span>
                  <span className="font-medium">{metadata.document_id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">v{metadata.version_id || "1"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Used</span>
                  <span className="font-medium">{metadata.model || "Unknown"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                Referenced Nodes
              </h4>
              {metadata.nodes?.map((node: any, idx: number) => (
                <div key={idx} className="bg-muted/30 border border-border p-4 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{node.title || "Untitled Section"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">ID: {node.node_id}</div>
                    </div>
                    {node.page_number && (
                      <Badge variant="outline" className="text-[10px]">Page {node.page_number}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs bg-muted/50 p-1.5 rounded text-muted-foreground">
                    <Hash className="w-3 h-3" />
                    <span className="font-mono truncate">{node.hash}</span>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto" onClick={() => handleCopy(node.hash)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {!metadata.nodes?.length && (
                <p className="text-sm text-muted-foreground italic">No specific nodes linked.</p>
              )}
            </div>
            
            {/* Context/Prompt Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Internal Generation Data
              </h4>
              <div className="bg-muted/30 border border-border p-3 rounded-lg text-xs space-y-2 font-mono text-muted-foreground overflow-hidden">
                <div className="truncate">Selection ID: {metadata.selection_id}</div>
                <div className="truncate">Prompt: {metadata.prompt}</div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
