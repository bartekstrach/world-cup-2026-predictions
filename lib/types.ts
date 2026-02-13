export interface LeaderboardEntry {
  id: number;
  rank: string;
  name: string;
  email?: string | null;
  total_points: string | number;
  predictions_count: string | number;
  exact_scores: string | number;
  correct_outcomes: string | number;
  nextPredictions: Array<{
    matchId: number;
    homeScore: number | null;
    awayScore: number | null;
  }>;
  nextMatches: Array<{
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamCode: string;
    awayTeamCode: string;
    matchNumber: number;
    status: string;
  }>;
}

export interface Team {
  id: number;
  name: string;
  code: string;
  group: string | null;
}

export interface Match {
  id: number;
  matchNumber: number;
  matchDate: Date;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
  stage: string;
  homeTeam: Team;
  awayTeam: Team;
}

export interface Participant {
  id: number;
  name: string;
  email: string | null;
}

export interface Prediction {
  participantId: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  points: number;
}

export interface PredictionsGridData {
  matches: Match[];
  participants: Participant[];
  predictions: Record<string, Prediction>;
}
