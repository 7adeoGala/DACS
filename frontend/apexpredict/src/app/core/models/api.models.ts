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
  ownerName?: string;
  memberCount?: number;
  hasPassword?: boolean;
  password?: string | null;
  isMember?: boolean;
  isPrivate?: boolean;
  userRank?: number;
  userPoints?: number;
  podium?: {
    p1?: { name: string; points: number };
    p2?: { name: string; points: number };
    p3?: { name: string; points: number };
  };
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
  circuitId?: string;
  locality?: string;
  country?: string;
  fp1?: string | null;
  fp2?: string | null;
  fp3?: string | null;
  qualifying?: string | null;
  sprint?: string | null;
  sprintQualifying?: string | null;
  lat?: string;
  long?: string;
}

export interface JolpicaDriverStanding {
  position: string;
  points: string;
  wins: string;
  driverId: string;
  code: string;
  name: string;
  nationality: string;
  team: string;
}

export interface JolpicaConstructorStanding {
  position: string;
  points: string;
  wins: string;
  constructorId: string;
  name: string;
  nationality: string;
}

export interface JolpicaRaceResult {
  position: string;
  driverId: string;
  driverName: string;
  team: string;
  status: string;
  points: string;
  grid: string;
  laps: string;
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
  officialResults?: {
    podium?: string[];
    polePositionDriverId?: string;
    duelWinnerId?: string;
    safetyCarCount?: number;
    dnfCount?: number;
  } | null;
}

export interface F1Driver {
  id: string;
  name: string;
  code: string;
  number: number;
  team: string;
  teamColor: string;
}

export type DriverOption = F1Driver;

export interface PredictionPayload {
  p1DriverId: string;
  p2DriverId: string;
  p3DriverId: string;
  poleDriverId: string;
  duelWinnerId: string;
  safetyCars: number;
  dnfs: number;
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
    svgPath: 'M 188.6 73.3 L 265.4 73.8 L 275.9 75.0 L 284.0 78.5 L 291.1 85.6 L 295.3 92.3 L 297.5 100.1 L 297.5 108.8 L 295.6 117.2 L 289.9 123.9 L 284.1 129.5 L 276.2 132.2 L 272.0 132.6 L 229.7 131.6 L 222.3 134.1 L 218.0 138.0 L 214.8 142.4 L 213.4 147.9 L 213.2 194.8 L 215.2 200.4 L 218.3 204.6 L 222.2 208.2 L 229.1 211.6 L 235.3 212.9 L 242.6 213.3 L 248.0 212.9 L 256.7 208.5 L 305.2 177.3 L 324.9 158.7 L 329.3 154.5 L 330.0 151.1 L 329.9 99.9 L 332.4 94.6 L 339.6 91.3 L 348.8 90.4 L 359.8 94.5 L 367.0 96.9 L 374.6 97.4 L 380.6 93.0 L 385.0 84.9 L 384.7 76.8 L 379.9 69.8 L 373.2 64.8 L 367.3 62.5 L 311.6 51.8 L 158.7 49.2 L 62.3 51.8 L 53.1 54.8 L 45.5 59.5 L 40.2 65.8 L 37.1 73.0 L 35.0 80.4 L 35.1 86.6 L 35.8 93.9 L 37.1 100.4 L 40.5 106.3 L 45.1 112.4 L 51.0 117.6 L 57.9 121.8 L 68.2 124.8 L 81.4 127.7 L 91.6 130.4 L 95.0 133.6 L 99.0 139.3 L 99.6 144.3 L 98.7 150.6 L 90.0 194.3 L 89.6 198.8 L 89.8 204.5 L 91.0 208.8 L 93.4 213.7 L 96.4 217.8 L 100.0 220.5 L 140.3 249.0 L 145.1 250.7 L 150.3 250.8 L 156.5 249.4 L 161.7 246.3 L 166.8 240.4 L 168.3 235.4 L 170.0 135.9 L 167.9 131.1 L 164.2 127.9 L 158.6 125.0 L 69.8 105.5 L 64.7 101.5 L 61.7 96.1 L 60.4 90.4 L 62.5 84.0 L 65.4 79.1 L 70.6 75.2 L 78.4 73.0 L 188.6 73.3 Z'
  },
  'americas': {
    name: 'Circuit of the Americas (COTA)',
    country: 'Estados Unidos',
    city: 'Austin, Texas',
    lengthKm: '5.513 km',
    laps: 56,
    lapRecord: '1:36.169',
    lapRecordHolder: 'Charles Leclerc (2019)',
    drsZones: 2,
    svgPath: 'M 105.2 204.9 L 136.8 226.7 L 145.5 232.0 L 152.3 235.5 L 154.8 236.5 L 155.8 236.8 L 156.9 236.6 L 157.8 236.1 L 158.5 235.2 L 158.8 234.4 L 158.7 233.5 L 151.9 216.4 L 148.8 208.5 L 148.3 206.0 L 148.1 204.0 L 148.3 201.5 L 148.8 199.3 L 149.8 196.4 L 151.3 194.0 L 152.9 191.8 L 155.2 189.5 L 157.7 188.0 L 161.1 186.2 L 179.5 176.3 L 187.1 172.2 L 188.7 170.8 L 190.1 169.1 L 191.3 167.8 L 192.3 165.8 L 193.0 164.2 L 195.0 159.4 L 196.3 157.9 L 198.0 156.0 L 200.1 154.8 L 201.9 154.0 L 206.2 152.6 L 209.6 151.1 L 211.6 149.8 L 212.8 148.5 L 213.9 146.7 L 214.3 144.7 L 215.0 141.1 L 215.3 138.8 L 215.9 136.3 L 216.8 134.5 L 217.9 132.8 L 219.3 131.0 L 220.9 129.5 L 223.1 127.7 L 225.8 126.1 L 228.6 124.7 L 231.6 123.6 L 234.3 123.0 L 236.4 123.0 L 238.2 123.0 L 241.0 123.7 L 259.1 130.9 L 260.9 131.5 L 262.7 131.5 L 264.1 131.0 L 267.7 129.1 L 272.0 126.2 L 275.0 123.5 L 278.1 119.9 L 280.4 117.6 L 282.4 116.2 L 284.7 115.3 L 286.5 115.0 L 289.0 115.0 L 291.8 115.7 L 294.0 116.7 L 295.7 118.2 L 296.7 119.2 L 297.7 120.5 L 298.6 122.0 L 299.9 123.2 L 301.4 123.7 L 302.9 123.7 L 335.5 117.5 L 337.6 116.9 L 338.9 116.3 L 339.9 115.5 L 359.0 95.5 L 375.7 77.9 L 382.2 70.8 L 384.8 66.6 L 385.0 65.6 L 384.7 64.6 L 383.9 64.1 L 382.9 63.5 L 381.9 63.2 L 380.7 63.3 L 379.0 63.7 L 344.1 73.3 L 319.8 79.2 L 293.0 84.8 L 261.0 90.4 L 240.9 93.3 L 222.4 95.6 L 167.8 100.8 L 161.7 101.8 L 160.9 102.2 L 160.6 103.1 L 160.7 103.8 L 161.4 104.7 L 165.0 108.2 L 177.5 123.0 L 182.9 130.6 L 183.3 131.7 L 182.9 133.4 L 182.1 134.5 L 180.7 135.4 L 179.5 135.6 L 177.2 135.9 L 167.1 135.2 L 166.1 134.8 L 165.3 134.1 L 164.4 133.2 L 163.6 132.0 L 161.6 127.1 L 160.7 125.2 L 159.3 123.5 L 152.6 117.6 L 151.6 116.9 L 150.4 116.4 L 149.2 116.3 L 142.7 115.8 L 141.4 115.8 L 140.6 116.3 L 139.9 117.1 L 139.5 118.1 L 140.0 119.3 L 152.6 138.2 L 157.7 146.5 L 158.2 148.7 L 158.1 151.0 L 157.6 152.8 L 157.1 154.6 L 155.7 158.0 L 153.7 161.8 L 152.4 163.2 L 150.2 164.6 L 147.7 165.7 L 137.4 169.7 L 135.3 170.2 L 133.2 170.3 L 129.4 170.0 L 125.8 169.6 L 122.3 168.6 L 118.5 167.3 L 115.1 165.6 L 112.8 164.1 L 111.3 161.9 L 99.4 147.4 L 90.2 137.4 L 89.0 136.3 L 87.5 135.8 L 85.7 135.5 L 84.0 135.5 L 81.8 136.1 L 79.0 136.9 L 76.7 137.6 L 38.5 152.1 L 36.3 153.4 L 35.4 154.6 L 35.0 155.9 L 35.4 156.9 L 36.3 157.8 L 37.4 158.6 L 57.4 172.6 L 105.2 204.9 Z'
  },
  'rodriguez': {
    name: 'Autódromo Hermanos Rodríguez',
    country: 'México',
    city: 'Ciudad de México',
    lengthKm: '4.304 km',
    laps: 71,
    lapRecord: '1:17.774',
    lapRecordHolder: 'Valtteri Bottas (2021)',
    drsZones: 3,
    svgPath: 'M 102.8 39.5 L 186.6 50.5 L 213.8 53.9 L 242.4 56.3 L 256.2 57.9 L 291.8 62.7 L 353.9 71.3 L 366.7 73.8 L 368.9 74.6 L 370.0 75.5 L 370.6 77.0 L 370.8 78.4 L 368.4 92.9 L 368.7 94.2 L 369.5 95.3 L 376.0 98.7 L 377.9 99.6 L 378.9 101.1 L 378.9 102.5 L 377.6 111.5 L 375.6 119.6 L 372.4 127.5 L 368.7 134.6 L 340.2 180.2 L 306.1 230.7 L 303.9 234.2 L 303.6 236.3 L 304.0 238.0 L 305.1 239.3 L 315.2 245.2 L 316.2 246.1 L 316.4 247.6 L 315.7 248.9 L 313.9 250.4 L 294.9 264.0 L 293.0 264.8 L 291.4 265.0 L 289.9 264.5 L 286.5 262.4 L 285.9 261.1 L 285.9 258.3 L 294.6 194.2 L 294.5 192.2 L 293.6 190.3 L 292.3 188.8 L 290.2 187.4 L 280.1 181.5 L 276.4 178.4 L 274.3 176.3 L 272.1 172.4 L 269.7 166.6 L 267.4 163.1 L 264.8 160.7 L 261.9 159.0 L 258.0 157.3 L 226.6 152.8 L 223.1 151.8 L 220.9 150.0 L 219.9 148.9 L 219.0 147.3 L 214.9 135.4 L 213.6 133.0 L 211.6 130.8 L 206.5 127.9 L 183.3 116.1 L 176.6 113.5 L 166.8 111.3 L 88.9 100.6 L 87.3 100.1 L 86.5 99.1 L 85.7 97.6 L 85.6 95.7 L 84.3 76.8 L 82.7 63.7 L 82.1 62.2 L 80.9 61.2 L 79.3 60.5 L 77.3 60.7 L 75.1 62.6 L 72.3 66.5 L 70.8 67.6 L 68.9 68.3 L 66.7 68.2 L 64.2 67.2 L 61.3 65.9 L 58.5 65.1 L 45.3 63.7 L 43.1 63.0 L 42.1 62.2 L 41.3 60.7 L 41.1 59.2 L 42.0 55.6 L 43.9 50.9 L 46.3 46.9 L 50.0 42.2 L 54.2 38.9 L 59.6 36.4 L 64.5 35.1 L 69.3 35.0 L 76.3 35.8 L 102.8 39.5 Z'
  },
  'vegas': {
    name: 'Las Vegas Strip Circuit',
    country: 'Estados Unidos',
    city: 'Las Vegas, Nevada',
    lengthKm: '6.201 km',
    laps: 50,
    lapRecord: '1:35.490',
    lapRecordHolder: 'Oscar Piastri (2023)',
    drsZones: 2,
    svgPath: 'M 281.1 239.2 L 289.1 231.9 L 290.8 230.4 L 292.0 228.7 L 292.4 226.8 L 291.4 225.0 L 289.7 223.9 L 286.6 222.9 L 283.8 222.5 L 281.0 222.7 L 278.4 223.3 L 272.7 226.1 L 267.4 230.3 L 265.4 231.4 L 261.0 232.2 L 258.6 232.1 L 254.3 231.0 L 251.9 229.9 L 249.6 228.4 L 246.0 224.3 L 244.5 220.9 L 243.5 120.0 L 244.2 118.4 L 245.7 117.7 L 271.5 118.0 L 279.2 118.0 L 283.3 117.2 L 284.9 116.1 L 289.5 112.5 L 291.5 110.2 L 293.1 107.7 L 294.2 105.5 L 294.9 102.6 L 295.4 99.2 L 295.2 97.1 L 293.8 96.4 L 290.1 96.1 L 288.8 95.4 L 287.7 94.0 L 287.2 91.8 L 287.4 90.3 L 291.0 85.2 L 291.7 83.9 L 293.2 81.5 L 292.6 79.1 L 289.7 77.5 L 284.2 77.0 L 243.4 76.2 L 228.3 74.4 L 223.3 72.5 L 217.8 67.9 L 213.0 60.2 L 205.8 46.5 L 201.2 42.5 L 196.3 39.9 L 191.4 38.4 L 183.8 36.4 L 175.1 35.0 L 173.9 35.2 L 172.8 35.9 L 171.9 38.3 L 171.0 40.0 L 161.9 54.2 L 156.3 62.7 L 153.4 67.0 L 150.4 71.1 L 145.2 78.4 L 139.9 88.2 L 137.1 95.6 L 134.0 104.1 L 131.9 110.2 L 130.3 116.2 L 129.1 122.4 L 127.8 131.4 L 127.5 136.6 L 127.1 142.9 L 127.3 159.8 L 127.3 169.5 L 127.4 176.8 L 125.6 215.2 L 125.1 234.9 L 125.1 244.7 L 124.6 256.5 L 125.5 257.5 L 126.6 257.8 L 129.3 257.8 L 131.3 258.4 L 135.7 262.0 L 139.6 263.8 L 144.8 264.6 L 167.5 265.0 L 197.1 264.7 L 221.4 264.8 L 233.3 264.7 L 243.1 263.6 L 253.2 262.0 L 255.9 261.1 L 258.0 260.0 L 259.7 258.7 L 281.1 239.2 Z'
  },
  'losail': {
    name: 'Lusail International Circuit',
    country: 'Catar',
    city: 'Lusail',
    lengthKm: '5.419 km',
    laps: 57,
    lapRecord: '1:24.319',
    lapRecordHolder: 'Max Verstappen (2023)',
    drsZones: 1,
    svgPath: 'M 140.0 174.2 L 113.3 130.1 L 102.8 113.0 L 102.1 109.7 L 102.5 106.4 L 103.9 103.8 L 106.0 102.0 L 109.2 100.2 L 112.9 99.7 L 116.4 100.3 L 143.0 114.9 L 145.6 115.5 L 148.9 115.6 L 152.8 114.6 L 155.9 112.0 L 157.7 109.1 L 158.1 106.2 L 157.5 85.2 L 157.9 82.4 L 158.8 79.9 L 160.1 77.6 L 162.0 75.6 L 200.0 37.6 L 202.1 36.0 L 205.3 35.2 L 208.4 35.0 L 211.6 35.7 L 214.1 37.1 L 225.4 46.8 L 226.6 48.9 L 227.2 51.7 L 227.1 54.1 L 226.3 56.5 L 224.7 58.7 L 200.0 83.2 L 198.9 85.0 L 198.8 86.9 L 199.4 88.6 L 200.6 89.9 L 202.4 90.9 L 204.9 91.2 L 206.6 90.8 L 208.8 89.9 L 251.9 74.3 L 254.8 74.0 L 258.3 74.4 L 261.2 75.6 L 263.5 77.7 L 264.9 80.3 L 265.4 82.9 L 265.4 85.2 L 264.5 87.4 L 262.8 89.9 L 261.3 91.2 L 257.9 93.7 L 254.2 97.5 L 251.1 101.4 L 248.5 105.6 L 246.4 110.5 L 245.2 113.8 L 243.9 119.6 L 242.8 122.1 L 241.0 124.2 L 239.0 125.6 L 236.4 126.6 L 211.9 132.0 L 209.7 133.2 L 208.1 134.5 L 207.1 136.7 L 206.7 138.8 L 207.2 142.0 L 209.8 145.1 L 214.4 149.3 L 221.4 154.1 L 228.8 157.9 L 236.3 160.3 L 243.8 161.8 L 251.1 162.3 L 259.1 161.6 L 295.7 158.0 L 299.1 158.6 L 303.0 160.3 L 305.9 162.3 L 308.7 165.8 L 317.2 180.0 L 317.9 182.5 L 317.9 184.7 L 317.5 187.1 L 315.8 190.0 L 302.6 209.3 L 300.9 210.7 L 298.4 211.7 L 295.9 212.4 L 292.5 212.3 L 250.3 204.6 L 247.3 204.6 L 244.4 205.4 L 241.8 207.0 L 240.0 209.0 L 210.7 260.5 L 208.4 262.9 L 205.7 264.4 L 201.8 265.0 L 198.9 264.7 L 196.0 263.6 L 193.1 261.3 L 140.0 174.2 Z'
  },
  'yas_marina': {
    name: 'Yas Marina Circuit',
    country: 'Emiratos Árabes Unidos',
    city: 'Abu Dabi',
    lengthKm: '5.281 km',
    laps: 58,
    lapRecord: '1:26.103',
    lapRecordHolder: 'Max Verstappen (2021)',
    drsZones: 2,
    svgPath: 'M 208.5 163.9 L 243.7 159.5 L 245.5 159.0 L 246.9 157.6 L 247.9 155.8 L 248.1 154.0 L 247.6 152.1 L 241.9 130.3 L 241.0 128.0 L 239.6 126.2 L 237.4 124.5 L 235.6 123.7 L 225.6 120.9 L 222.3 119.3 L 219.9 117.8 L 217.6 115.9 L 216.0 114.1 L 214.7 112.6 L 213.2 109.3 L 212.6 106.8 L 212.6 104.1 L 213.2 100.8 L 214.3 97.4 L 216.8 88.8 L 217.7 82.4 L 217.8 77.8 L 217.3 73.8 L 214.6 53.5 L 212.8 40.7 L 212.4 39.2 L 212.1 38.0 L 211.0 36.8 L 209.2 35.5 L 208.1 35.1 L 206.9 35.0 L 205.7 35.2 L 204.4 35.6 L 203.5 36.5 L 202.9 37.3 L 202.2 38.7 L 200.0 44.6 L 197.9 53.2 L 180.3 100.9 L 173.5 119.3 L 169.7 129.6 L 166.8 137.6 L 163.8 147.6 L 157.6 165.8 L 151.6 182.3 L 150.9 183.9 L 150.7 185.1 L 150.9 185.8 L 151.5 186.5 L 153.1 186.5 L 158.7 185.9 L 159.9 185.9 L 160.9 187.0 L 164.1 198.0 L 164.7 200.0 L 166.7 204.6 L 168.5 207.9 L 172.5 213.1 L 177.0 217.8 L 182.6 222.2 L 206.5 239.4 L 212.0 243.4 L 216.3 246.2 L 222.0 249.6 L 226.9 252.2 L 234.9 255.7 L 242.1 258.6 L 252.9 263.3 L 257.5 265.0 L 260.1 265.0 L 262.9 264.5 L 265.4 263.2 L 266.7 262.0 L 267.6 260.8 L 268.5 259.1 L 269.0 257.5 L 269.3 255.9 L 269.1 253.4 L 268.5 251.5 L 267.7 249.7 L 266.5 248.1 L 264.9 246.7 L 262.8 245.4 L 260.6 244.5 L 257.4 244.1 L 232.3 242.3 L 229.2 241.9 L 227.8 241.6 L 226.4 241.2 L 212.9 233.5 L 211.5 232.5 L 210.6 231.5 L 209.6 229.2 L 206.5 215.8 L 206.7 214.7 L 207.4 214.0 L 208.5 213.7 L 219.7 212.2 L 221.0 211.7 L 221.9 211.3 L 222.8 210.5 L 223.7 208.9 L 223.9 207.0 L 223.9 197.8 L 223.1 196.2 L 222.1 195.2 L 220.6 194.7 L 218.5 194.3 L 216.6 194.1 L 214.2 194.0 L 211.8 194.1 L 188.4 197.4 L 186.3 197.6 L 183.8 197.5 L 181.3 197.1 L 179.5 196.5 L 178.4 195.6 L 177.2 194.4 L 170.8 183.8 L 167.5 178.9 L 166.8 177.5 L 166.3 175.6 L 166.1 173.9 L 166.1 172.0 L 166.4 170.6 L 167.3 169.7 L 168.4 169.2 L 170.8 168.8 L 208.5 163.9 Z'
  },
  'baku': {
    name: 'Baku City Circuit',
    country: 'Azerbaiyán',
    city: 'Bakú',
    lengthKm: '6.003 km',
    laps: 51,
    lapRecord: '1:43.009',
    lapRecordHolder: 'Charles Leclerc (2019)',
    drsZones: 2,
    svgPath: 'M 90 240 L 80 80 L 240 70 L 330 110 L 340 220 L 230 250 Z'
  },
  'hungaroring': {
    name: 'Hungaroring',
    country: 'Hungría',
    city: 'Budapest',
    lengthKm: '4.381 km',
    laps: 70,
    lapRecord: '1:16.627',
    lapRecordHolder: 'Lewis Hamilton (2020)',
    drsZones: 2,
    svgPath: 'M 110 240 L 90 120 L 170 80 L 270 70 L 330 130 L 300 210 L 200 240 Z'
  },
  'zandvoort': {
    name: 'Circuit Zandvoort',
    country: 'Países Bajos',
    city: 'Zandvoort',
    lengthKm: '4.259 km',
    laps: 72,
    lapRecord: '1:11.097',
    lapRecordHolder: 'Lewis Hamilton (2021)',
    drsZones: 2,
    svgPath: 'M 100 240 L 80 130 L 150 70 L 290 80 L 330 170 L 250 230 Z'
  },
  'red_bull_ring': {
    name: 'Red Bull Ring',
    country: 'Austria',
    city: 'Spielberg',
    lengthKm: '4.318 km',
    laps: 71,
    lapRecord: '1:05.619',
    lapRecordHolder: 'Carlos Sainz (2020)',
    drsZones: 3,
    svgPath: 'M 90 230 L 80 90 L 210 60 L 330 80 L 340 180 L 240 230 Z'
  },
  'catalunya': {
    name: 'Circuit de Barcelona-Catalunya',
    country: 'España',
    city: 'Montmeló',
    lengthKm: '4.657 km',
    laps: 66,
    lapRecord: '1:16.330',
    lapRecordHolder: 'Max Verstappen (2023)',
    drsZones: 2,
    svgPath: 'M 100 240 L 70 120 L 160 70 L 300 60 L 350 140 L 300 220 L 180 250 Z'
  },
  'villeneuve': {
    name: 'Circuit Gilles-Villeneuve',
    country: 'Canadá',
    city: 'Montreal',
    lengthKm: '4.361 km',
    laps: 70,
    lapRecord: '1:13.078',
    lapRecordHolder: 'Valtteri Bottas (2019)',
    drsZones: 2,
    svgPath: 'M 120 260 L 100 60 L 180 50 L 250 120 L 230 260 Z'
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
