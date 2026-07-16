import { diffWords } from 'diff';
import React from 'react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
}

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
  const diffs = diffWords(oldContent || '', newContent || '');

  return (
    <div className="font-mono text-sm whitespace-pre-wrap p-4 bg-muted/50 rounded-md border leading-relaxed">
      {diffs.map((part, index) => {
        if (part.added) {
          return (
            <ins key={index} className="bg-green-500/20 text-green-700 dark:text-green-400 no-underline rounded-sm px-0.5 mx-0.5">
              {part.value}
            </ins>
          );
        }
        if (part.removed) {
          return (
            <del key={index} className="bg-red-500/20 text-red-700 dark:text-red-400 no-underline rounded-sm px-0.5 mx-0.5 opacity-80">
              {part.value}
            </del>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}
