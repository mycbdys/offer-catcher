export interface Resume {
  id: string;
  file_name: string;
  raw_text: string;
  parsed_data: Record<string, unknown>;
  skills: string[];
  job_preferences: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}
