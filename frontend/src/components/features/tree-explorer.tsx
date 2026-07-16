"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, Hash, Network, Table, ImageIcon, Type, AlertTriangle } from "lucide-react";
import { Node, Document } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PdfViewer } from "./pdf-viewer";

interface TreeExplorerProps {
  nodes: Node[];
  document?: Document;
}

export function TreeExplorer({ nodes, document }: TreeExplorerProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Clear selection when version/nodes change
  useEffect(() => {
    setSelectedNode(null);
  }, [nodes]);

  const toggleNode = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree structure
  const rootNodes = nodes.filter(n => !n.parent_id);
  const getChildren = (parentId: number) => nodes.filter(n => n.parent_id === parentId);

  const renderNode = (node: Node, depth: number = 0) => {
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded[node.id];
    const isSelected = selectedNode?.id === node.id;
    
    let NodeIcon = FileText;
    if (hasChildren) NodeIcon = Folder;
    else if (node.node_type === 'table') NodeIcon = Table;
    else if (node.node_type === 'image') NodeIcon = ImageIcon;
    else if (node.node_type === 'paragraph') NodeIcon = Type;
    else if (node.node_type === 'warning' || node.node_type === 'note') NodeIcon = AlertTriangle;

    return (
      <div key={node.id}>
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors",
            isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50",
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          onClick={() => setSelectedNode(node)}
        >
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
              className="p-0.5 hover:bg-muted rounded text-muted-foreground shrink-0"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          
          {hasChildren ? (
            <Folder className="w-4 h-4 text-blue-500 shrink-0" />
          ) : (
            <NodeIcon className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          
          <span className="truncate">{node.title || "Untitled Node"}</span>
          
          {node.level && (
            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
              H{node.level}
            </Badge>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-0.5">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full divide-x divide-border">
      {/* Sidebar Tree */}
      <div className={cn("flex flex-col bg-muted/10", document?.source_type === 'pdf' ? 'w-1/4' : 'w-1/3')}>
        <div className="p-3 border-b border-border text-sm font-medium bg-muted/30">Document Structure</div>
        <ScrollArea className="flex-1 p-2">
          {rootNodes.map(node => renderNode(node))}
        </ScrollArea>
      </div>

      {/* Main Content Viewer */}
      <div className={cn("flex flex-col bg-background", document?.source_type === 'pdf' ? 'w-1/4 border-r border-border' : 'w-2/3')}>
        {selectedNode ? (
          <>
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>Level {selectedNode.level}</span>
                  {selectedNode.page_number && (
                    <>
                      <span>•</span>
                      <span>Page {selectedNode.page_number}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{selectedNode.node_id}</span>
                </div>
                <h2 className="text-2xl font-semibold">{selectedNode.title}</h2>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {selectedNode.body ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{selectedNode.body}</pre>
                ) : (
                  <p className="text-muted-foreground italic">No content in this node.</p>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-4">
              <Network className="w-12 h-12 opacity-20" />
              <p>Select a node to view its content</p>
            </div>
          </div>
        )}
      </div>
      
      {/* PDF Viewer Pane */}
      {document?.source_type === 'pdf' && (
        <div className="w-1/2 bg-background flex flex-col">
          <PdfViewer 
            docId={document.id} 
            versionId={nodes.length > 0 ? nodes[0].version_id : undefined}
            pageNumber={selectedNode?.page_number} 
          />
        </div>
      )}
    </div>
  );
}
