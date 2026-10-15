export type AppRole = 'player' | 'admin';

export interface Race {
  season: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  date: string;
  startsAt: string | null;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string | null;
}

export interface League {
  id: string;
  name: string;
  description?: string | null;
  inviteCode?: string;
  ownerId?: string;
}

export interface Finish {
  position: number;
  driverId: string;
  driverName: string;
  constructorName: string;
  status: string;
}

export interface NextSession {
  id: string;
  season: number;
  round: number;
  name: string;
  circuit: string;
  type: string;
  raceDate: string;
  startsAt: string | null;
  isLocked: boolean;
  matchupDriver1: string;
  matchupDriver2: string;
}

export interface PredictionDetail {
  predictionId: string | null;
  sessionId: string;
  sessionName: string;
  circuit: string;
  startsAt: string | null;
  isLocked: boolean;
  podium: string[];
  polePositionDriverId: string | null;
  duelDriverPick: string | null;
  safetyCarCount: number | null;
  dnfCount: number | null;
  score: number | null;
  submittedAt: string | null;
  matchupDriver1: string | null;
  matchupDriver2: string | null;
}

export interface SubmitPrediction {
  podium: string[];
  polePositionDriverId?: string | null;
  duelDriverPick?: string | null;
  safetyCarCount?: number | null;
  dnfCount?: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalScore: number;
  predictionsCount: number;
}
