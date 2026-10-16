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

export interface ScoreBreakdown {
  podiumHits: number;
  podiumPoints: number;
  poleHit: boolean;
  polePoints: number;
  duelHit: boolean;
  duelPoints: number;
  safetyCarHit: boolean;
  safetyCarPoints: number;
  dnfHit: boolean;
  dnfPoints: number;
  totalPoints: number;
}

export interface PredictionHistoryItem {
  predictionId: string | null;
  sessionId: string;
  sessionName: string;
  circuit: string;
  raceDate: string | null;
  startsAt: string | null;
  podium: string[];
  polePositionDriverId: string | null;
  duelDriverPick: string | null;
  safetyCarCount: number | null;
  dnfCount: number | null;
  score: number | null;
  submittedAt: string | null;
  matchupDriver1: string | null;
  matchupDriver2: string | null;
  scoreBreakdown?: ScoreBreakdown | null;
}

export interface DriverOption {
  id: string;
  name: string;
  code: string;
  number: number;
  team: string;
  teamColor: string;
}

export const F1_DRIVERS: DriverOption[] = [
  { id: 'verstappen', name: 'Max Verstappen', code: 'VER', number: 1, team: 'Red Bull Racing', teamColor: '#3671C6' },
  { id: 'norris', name: 'Lando Norris', code: 'NOR', number: 4, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'leclerc', name: 'Charles Leclerc', code: 'LEC', number: 16, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'hamilton', name: 'Lewis Hamilton', code: 'HAM', number: 44, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'piastri', name: 'Oscar Piastri', code: 'PIA', number: 81, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'russell', name: 'George Russell', code: 'RUS', number: 63, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'antonelli', name: 'Kimi Antonelli', code: 'ANT', number: 12, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'sainz', name: 'Carlos Sainz', code: 'SAI', number: 55, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'alonso', name: 'Fernando Alonso', code: 'ALO', number: 14, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'stroll', name: 'Lance Stroll', code: 'STR', number: 18, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'lawson', name: 'Liam Lawson', code: 'LAW', number: 30, team: 'Red Bull Racing', teamColor: '#3671C6' },
  { id: 'albon', name: 'Alexander Albon', code: 'ALB', number: 23, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'gasly', name: 'Pierre Gasly', code: 'GAS', number: 10, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'doohan', name: 'Jack Doohan', code: 'DOO', number: 7, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'colapinto', name: 'Franco Colapinto', code: 'COL', number: 43, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'tsunoda', name: 'Yuki Tsunoda', code: 'TSU', number: 22, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'hadjar', name: 'Isack Hadjar', code: 'HAD', number: 6, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'hulkenberg', name: 'Nico Hülkenberg', code: 'HUL', number: 27, team: 'Stake Sauber', teamColor: '#52E252' },
  { id: 'bortoleto', name: 'Gabriel Bortoleto', code: 'BOR', number: 5, team: 'Stake Sauber', teamColor: '#52E252' },
  { id: 'ocon', name: 'Esteban Ocon', code: 'OCO', number: 31, team: 'Haas', teamColor: '#B6BABD' },
  { id: 'bearman', name: 'Oliver Bearman', code: 'BEA', number: 87, team: 'Haas', teamColor: '#B6BABD' },
];

export interface CircuitInfo {
  name: string;
  country: string;
  city: string;
  lengthKm: string;
  laps: number;
  lapRecord: string;
  lapRecordHolder: string;
  drsZones: number;
  svgPath: string;
}

export const F1_CIRCUITS: Record<string, CircuitInfo> = {
  'albert_park': {
    name: 'Albert Park Circuit',
    country: 'Australia',
    city: 'Melbourne',
    lengthKm: '5.278 km',
    laps: 58,
    lapRecord: '1:19.813',
    lapRecordHolder: 'Charles Leclerc (2024)',
    drsZones: 4,
    svgPath: 'M 70 230 C 50 180 60 100 90 70 C 130 30 200 40 260 55 C 310 65 350 100 340 150 C 330 190 270 180 250 200 C 230 220 250 250 210 260 C 150 270 90 260 70 230 Z'
  },
  'bahrain': {
    name: 'Bahrain International Circuit',
    country: 'Baréin',
    city: 'Sakhir',
    lengthKm: '5.412 km',
    laps: 57,
    lapRecord: '1:31.447',
    lapRecordHolder: 'Pedro de la Rosa (2005)',
    drsZones: 3,
    svgPath: 'M 100 240 L 70 140 L 130 90 L 220 70 L 310 80 L 350 130 L 320 180 L 250 170 L 200 220 L 140 250 Z'
  },
  'jeddah': {
    name: 'Jeddah Corniche Circuit',
    country: 'Arabia Saudita',
    city: 'Yeda',
    lengthKm: '6.174 km',
    laps: 50,
    lapRecord: '1:30.734',
    lapRecordHolder: 'Lewis Hamilton (2021)',
    drsZones: 3,
    svgPath: 'M 190 280 C 170 220 170 120 190 50 C 210 50 220 120 220 220 C 220 260 210 280 190 280 Z'
  },
  'suzuka': {
    name: 'Suzuka International Racing Course',
    country: 'Japón',
    city: 'Suzuka',
    lengthKm: '5.807 km',
    laps: 53,
    lapRecord: '1:30.983',
    lapRecordHolder: 'Lewis Hamilton (2019)',
    drsZones: 1,
    svgPath: 'M 100 220 C 80 140 150 100 200 130 C 250 160 320 100 340 70 C 360 120 280 170 230 190 C 170 210 130 250 100 220 Z'
  },
  'shanghai': {
    name: 'Shanghai International Circuit',
    country: 'China',
    city: 'Shanghái',
    lengthKm: '5.451 km',
    laps: 56,
    lapRecord: '1:32.238',
    lapRecordHolder: 'Michael Schumacher (2004)',
    drsZones: 2,
    svgPath: 'M 90 230 L 60 120 C 70 60 180 50 240 80 L 340 90 L 330 160 L 220 180 L 180 240 Z'
  },
  'miami': {
    name: 'Miami International Autodrome',
    country: 'Estados Unidos',
    city: 'Miami',
    lengthKm: '5.412 km',
    laps: 57,
    lapRecord: '1:29.708',
    lapRecordHolder: 'Max Verstappen (2023)',
    drsZones: 3,
    svgPath: 'M 80 220 L 70 100 L 180 70 L 310 90 L 340 180 L 270 240 L 160 230 Z'
  },
  'monaco': {
    name: 'Circuit de Monaco',
    country: 'Mónaco',
    city: 'Monte Carlo',
    lengthKm: '3.337 km',
    laps: 78,
    lapRecord: '1:12.909',
    lapRecordHolder: 'Lewis Hamilton (2021)',
    drsZones: 1,
    svgPath: 'M 110 240 L 90 140 C 100 80 170 70 230 90 L 310 120 L 290 180 L 220 200 L 180 250 Z'
  },
  'silverstone': {
    name: 'Silverstone Circuit',
    country: 'Reino Unido',
    city: 'Silverstone',
    lengthKm: '5.891 km',
    laps: 52,
    lapRecord: '1:27.097',
    lapRecordHolder: 'Max Verstappen (2020)',
    drsZones: 2,
    svgPath: 'M 100 240 L 80 120 L 180 70 L 290 60 L 350 110 L 310 200 L 220 220 L 170 260 Z'
  },
  'spa': {
    name: 'Circuit de Spa-Francorchamps',
    country: 'Bélgica',
    city: 'Stavelot',
    lengthKm: '7.004 km',
    laps: 44,
    lapRecord: '1:46.286',
    lapRecordHolder: 'Valtteri Bottas (2018)',
    drsZones: 2,
    svgPath: 'M 90 250 L 70 140 L 120 80 L 240 50 L 350 100 L 320 210 L 220 230 L 140 270 Z'
  },
  'monza': {
    name: 'Autodromo Nazionale Monza',
    country: 'Italia',
    city: 'Monza',
    lengthKm: '5.793 km',
    laps: 53,
    lapRecord: '1:21.046',
    lapRecordHolder: 'Rubens Barrichello (2004)',
    drsZones: 2,
    svgPath: 'M 100 250 L 90 80 L 170 60 L 310 90 L 340 180 L 260 210 L 170 260 Z'
  },
  'interlagos': {
    name: 'Autódromo José Carlos Pace (Interlagos)',
    country: 'Brasil',
    city: 'São Paulo',
    lengthKm: '4.309 km',
    laps: 71,
    lapRecord: '1:10.540',
    lapRecordHolder: 'Valtteri Bottas (2018)',
    drsZones: 2,
    svgPath: 'M 120 240 C 80 180 90 100 150 70 C 230 40 310 90 320 160 C 330 220 250 250 180 230 Z'
  }
};

export const DEFAULT_CIRCUIT: CircuitInfo = {
  name: 'Circuito Internacional de Fórmula 1',
  country: 'Circuito Oficial',
  city: 'Gran Premio',
  lengthKm: '5.412 km',
  laps: 57,
  lapRecord: '1:29.840',
  lapRecordHolder: 'Récord de Pista Oficial',
  drsZones: 3,
  svgPath: 'M90 220 L56 122 Q45 72 110 62 L284 45 Q353 39 377 82 Q405 126 357 147 L271 164 Q242 170 251 192 L273 241 Q280 262 250 265 L152 272 Q108 273 90 220Z'
};
