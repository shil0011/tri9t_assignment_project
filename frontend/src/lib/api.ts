import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const API_URL = 'http://localhost:8000/api'; // Or from env variables

export const api = axios.create({
  baseURL: API_URL,
});

// Types
export interface Version {
  id: number;
  document_id: number;
  version_num: number;
  created_at: string;
  page_count?: number;
  processing_time?: number;
  ocr_used?: boolean;
  parser_version?: string;
}

export interface Document {
  id: number;
  title: string;
  created_at: string;
  source_type?: string;
  original_filename?: string;
  versions?: Version[];
}

export interface Node {
  id: number;
  version_id: number;
  node_id: string;
  level: number;
  title: string;
  body: string;
  content_hash: string;
  parent_id: number | null;
  page_number?: number;
  node_type?: string;
}

export interface Generation {
  id: number;
  selection_id: number;
  version_id: number;
  model: string;
  is_stale: boolean;
  stale_reason?: string;
  output: any;
}

export interface StalenessDashboardData {
  summary: {
    total_requirements: number;
    modified: number;
    added: number;
    deleted: number;
    qa_generated: number;
    fresh_qa: number;
    stale_qa: number;
  };
  changed_requirements: Array<{
    requirement_id: string;
    title: string;
    section: string;
    change_type: "modified" | "added" | "deleted";
    severity: "High" | "Medium" | "Low";
    old_hash: string | null;
    new_hash: string | null;
    old_content: string;
    new_content: string;
    version_introduced: number;
  }>;
  affected_qa: Array<{
    tc_id: string;
    title: string;
    requirement: string;
    change_reason: string;
    severity: string;
    status: string;
    recommended_action: string;
    stale_reasons: any[];
    generation_id: number;
  }>;
}

// Queries
export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data } = await api.get<Document[]>('/documents');
      return data;
    },
  });
};

export const useVersionNodes = (versionId: number | null) => {
  return useQuery({
    queryKey: ['nodes', versionId],
    queryFn: async () => {
      const { data } = await api.get<Node[]>(`/versions/${versionId}/nodes`);
      return data;
    },
    enabled: !!versionId,
  });
};

// Mutations
export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileData: { title: string; file: File }) => {
      const formData = new FormData();
      formData.append('title', fileData.title);
      formData.append('file', fileData.file);
      const { data } = await api.post<Document>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/documents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};



export const useGenerateQA = () => {
  return useMutation({
    mutationFn: async (payload: { selection_id: number; version_id: number; model: string }) => {
      const { data } = await api.post<Generation>('/generate', payload);
      return data;
    },
  });
};

export const useCreateSelection = () => {
  return useMutation({
    mutationFn: async (payload: { name: string; node_ids: number[] }) => {
      const { data } = await api.post('/selections', payload);
      return data;
    },
  });
};

export const useCheckStaleness = () => {
  return useMutation({
    mutationFn: async (payload: { old_version_id: number; new_version_id: number }) => {
      const { data } = await api.post(`/staleness/check?old_version_id=${payload.old_version_id}&new_version_id=${payload.new_version_id}`);
      return data;
    },
  });
};

export const useStaleness = (genId: number | null) => {
  return useQuery({
    queryKey: ['staleness', genId],
    queryFn: async () => {
      const { data } = await api.get(`/staleness/${genId}`);
      return data;
    },
    enabled: !!genId,
  });
};

export const useStalenessDashboard = (oldId: number | null, newId: number | null) => {
  return useQuery({
    queryKey: ['stalenessDashboard', oldId, newId],
    queryFn: async () => {
      const { data } = await api.get<StalenessDashboardData>(`/staleness/dashboard/data?old_version_id=${oldId}&new_version_id=${newId}`);
      return data;
    },
    enabled: !!oldId && !!newId,
  });
};

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await api.get<Node[]>(`/search?q=${encodeURIComponent(query)}`);
      return data;
    },
    enabled: !!query && query.length > 2,
  });
};

export const useCompareVersions = (oldId: number | null, newId: number | null) => {
  return useQuery({
    queryKey: ['compare', oldId, newId],
    queryFn: async () => {
      const { data } = await api.get(`/versions/compare?old_version_id=${oldId}&new_version_id=${newId}`);
      return data;
    },
    enabled: !!oldId && !!newId,
  });
};

export interface TraceabilityGraph {
  generation_id: number;
  selection_id: number;
  version_id: number;
  document_title: string;
  document_pages?: number;
  document_created: string;
  document_parser?: string;
  nodes: Node[];
  prompt: string;
  model: string;
  output: any;
  is_stale: boolean;
  stale_reason?: string;
  generated_at: string;
  parsed_at: string;
  selection_created_at: string;
  llm_latency_ms: number;
  llm_input_tokens: number;
  llm_output_tokens: number;
  validation_duration_ms: number;
  document_ocr: boolean;
}

export const useTraceability = (genId: number | null) => {
  return useQuery({
    queryKey: ['traceability', genId],
    queryFn: async () => {
      const { data } = await api.get<TraceabilityGraph>(`/traceability/${genId}`);
      return data;
    },
    enabled: !!genId,
  });
};

export const useSelections = () => {
  return useQuery({
    queryKey: ['selections'],
    queryFn: async () => {
      const { data } = await api.get('/selections');
      return data;
    },
  });
};
