import type { PaginatedResponse, WrappedResponse } from "./api";

export interface LogEntry {
  id: number;
  action: string;
  model: string;
  object_id: number | null;
  details: string;
  user: string;
  date: string;
}

export interface LogChoices {
  actions: Array<{ value: string; label: string }>;
  models?: Array<{ value: string; label: string }>;
}

export interface LogFilters {
  search?: string;
  action?: string;
  model?: string;
  user?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface LogListResponse extends PaginatedResponse<LogEntry> {}

export type WrappedLogListResponse = WrappedResponse<LogListResponse>;
