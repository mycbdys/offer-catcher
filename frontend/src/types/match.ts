export interface MatchResultItem {
  id: string;
  job_id: string;
  total_score: number;
  hard_filter_score: number;
  skill_match_score: number;
  semantic_score: number;
  optimization: string;
  is_favorited: boolean;
  created_at: string;
}

export interface MatchResultDetail extends MatchResultItem {
  match_detail: Record<string, unknown>;
  job: {
    title: string;
    company_name: string;
    location_city: string;
    salary_min: number;
    salary_max: number;
    description: string;
    skills_required: string[];
  };
  resume: {
    parsed_data: Record<string, unknown>;
    skills: string[];
  };
}

export interface MatchSession {
  session_id: string;
  status: string;
  total_matches: number;
  results: MatchResultItem[];
}
