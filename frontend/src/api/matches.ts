import { api } from "./client";
import type { MatchResultItem, MatchResultDetail, MatchSession } from "../types/match";

export const matchesApi = {
  start: (resume_id: string) =>
    api.post<{ session_id: string; status: string }>("/matches", { resume_id }),
  getStatus: (session_id: string) =>
    api.get<MatchSession>(`/matches/${session_id}`),
  getResults: (session_id: string, page = 1, page_size = 20) =>
    api.get<MatchResultItem[]>(`/matches/${session_id}/results?page=${page}&page_size=${page_size}`),
  getDetail: (match_id: string) =>
    api.get<MatchResultDetail>(`/matches/result/${match_id}`),
  toggleFavorite: (match_id: string) =>
    api.post<{ is_favorited: boolean }>(`/matches/result/${match_id}/favorite`),
};
