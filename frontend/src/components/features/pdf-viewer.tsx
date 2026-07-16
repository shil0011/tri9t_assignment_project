import { API_URL } from "@/lib/api";

interface PdfViewerProps {
  docId: number;
  versionId?: number;
  pageNumber?: number | null;
}

export function PdfViewer({ docId, versionId, pageNumber }: PdfViewerProps) {
  // Construct the URL to fetch the file from the backend
  // If versionId is provided, use the version-specific endpoint
  const baseUrl = versionId 
    ? `${API_URL}/versions/${versionId}/file`
    : `${API_URL}/documents/${docId}/file`;
    
  const fileUrl = `${baseUrl}${pageNumber ? `#page=${pageNumber}` : ''}`;

  return (
    <div className="w-full h-full bg-muted/20 flex flex-col">
      <div className="p-3 border-b border-border text-sm font-medium bg-muted/30 flex justify-between items-center">
        <span>Source Document</span>
        {pageNumber && <span className="text-muted-foreground text-xs">Page {pageNumber}</span>}
      </div>
      <div className="flex-1 w-full relative">
        <iframe 
          src={fileUrl} 
          className="absolute inset-0 w-full h-full border-none"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
}
