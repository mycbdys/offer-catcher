export interface Job {
  id: string;
  platform: string;
  url: string;
  title: string;
  company_name: string;
  company_size: string;
  company_industry: string;
  location_city: string;
  location_district: string;
  salary_min: number;
  salary_max: number;
  education_require: string;
  experience_require: string;
  job_type: string;
  description: string;
  skills_required: string[];
  benefits: string[];
  posted_date: string;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
}
