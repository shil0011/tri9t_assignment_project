"use client";

import { useState, useEffect } from "react";
import { useSearch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, FileText, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearch(debouncedQuery);

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-2">Search across all document nodes and content.</p>
      </div>

      <div className="relative mb-6 shrink-0">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword, node ID, or title..." 
          className="pl-10 h-12 text-base bg-muted/50 border-border/50"
        />
      </div>

      <div className="flex-1 min-h-0 bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Searching...</p>
          </div>
        ) : !debouncedQuery || debouncedQuery.length <= 2 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <SearchIcon className="w-12 h-12 opacity-20" />
            <p>Type at least 3 characters to search</p>
          </div>
        ) : results && results.length > 0 ? (
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Found {results.length} results for "{debouncedQuery}"
              </h3>
              {results.map((node) => (
                <Card key={node.id} className="border-border/50 shadow-sm hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-lg">{node.title}</h4>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs gap-1">
                        <Hash className="w-3 h-3" />
                        {node.content_hash.substring(0, 8)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 bg-muted/30 p-3 rounded-md">
                      {node.body || "No content."}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4 text-xs">
                      <div className="flex items-center gap-4 text-muted-foreground font-medium">
                        <span>Node ID: {node.node_id}</span>
                        <span>Level: H{node.level}</span>
                      </div>
                      {/* We could add a link to the document tree, but we need doc id. Let's just mock it or assume version contains doc */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <SearchIcon className="w-12 h-12 opacity-20" />
            <p>No results found for "{debouncedQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
