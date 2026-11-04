export interface F1Driver {
  id: string;
  name: string;
  code: string;
  number: number;
  team: string;
  teamColor: string; // Color HEX oficial de la escudería
  isReserve?: boolean;
}

export type PodiumSlot = 'p1' | 'p2' | 'p3' | 'pole';

export const F1_DRIVERS: F1Driver[] = [
  { id: 'norris', name: 'Lando Norris', code: 'NOR', number: 1, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'verstappen', name: 'Max Verstappen', code: 'VER', number: 3, team: 'Red Bull Racing', teamColor: '#3671C6' },
  { id: 'leclerc', name: 'Charles Leclerc', code: 'LEC', number: 16, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'hamilton', name: 'Lewis Hamilton', code: 'HAM', number: 44, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'piastri', name: 'Oscar Piastri', code: 'PIA', number: 81, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'russell', name: 'George Russell', code: 'RUS', number: 63, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'antonelli', name: 'Kimi Antonelli', code: 'ANT', number: 12, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'sainz', name: 'Carlos Sainz', code: 'SAI', number: 55, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'albon', name: 'Alexander Albon', code: 'ALB', number: 23, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'alonso', name: 'Fernando Alonso', code: 'ALO', number: 14, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'stroll', name: 'Lance Stroll', code: 'STR', number: 18, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'hadjar', name: 'Isack Hadjar', code: 'HAD', number: 6, team: 'Red Bull Racing', teamColor: '#3671C6' },
  { id: 'lawson', name: 'Liam Lawson', code: 'LAW', number: 30, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'lindblad', name: 'Arvid Lindblad', code: 'LIN', number: 40, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'colapinto', name: 'Franco Colapinto', code: 'COL', number: 43, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'gasly', name: 'Pierre Gasly', code: 'GAS', number: 10, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'hulkenberg', name: 'Nico Hülkenberg', code: 'HUL', number: 27, team: 'Audi', teamColor: '#C0C6CE' },
  { id: 'bortoleto', name: 'Gabriel Bortoleto', code: 'BOR', number: 5, team: 'Audi', teamColor: '#C0C6CE' },
  { id: 'bearman', name: 'Oliver Bearman', code: 'BEA', number: 87, team: 'Haas GR', teamColor: '#FFFFFF' },
  { id: 'ocon', name: 'Esteban Ocon', code: 'OCO', number: 31, team: 'Haas GR', teamColor: '#FFFFFF' },
  { id: 'perez', name: 'Sergio Pérez', code: 'PER', number: 11, team: 'Cadillac', teamColor: '#FFFFFF' },
  { id: 'bottas', name: 'Valtteri Bottas', code: 'BOT', number: 77, team: 'Cadillac', teamColor: '#FFFFFF' },
  // Pilotos de reserva (no corren como titulares 2026)
  { id: 'tsunoda', name: 'Yuki Tsunoda', code: 'TSU', number: 22, team: 'Red Bull / RB (Reserva)', teamColor: '#6692FF', isReserve: true },
  { id: 'doohan', name: 'Jack Doohan', code: 'DOO', number: 7, team: 'Alpine (Reserva)', teamColor: '#0093CC', isReserve: true }
];

export const ACTIVE_F1_DRIVERS: F1Driver[] = F1_DRIVERS.filter(d => !d.isReserve);

export interface TeamDuo {
  team: string;
  driver1: string;
  driver2: string;
}

export interface TeamDuoOption {
  id: string;
  name: string;
  shortName: string;
  tag: string;
  color: string;
  gradient: string;
  driver1Id: string;
  driver2Id: string;
}

export interface DynamicDriverStats {
  driverId: string;
  name: string;
  code: string;
  number: number;
  team: string;
  teamColor: string;
  nationality?: string;
  // Métricas oficiales temporada 2026
  points: number;
  standingPosition: string;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  dnfs: number;
  racesCount: number;
  bestFinish: string;
  // Métricas históricas de trayectoria F1
  careerWins: number;
  careerPoles: number;
  careerStarts: number;
}

export const OFFICIAL_2026_TEAM_DUOS: TeamDuo[] = [
  { team: 'McLaren', driver1: 'norris', driver2: 'piastri' },
  { team: 'Ferrari', driver1: 'leclerc', driver2: 'hamilton' },
  { team: 'Red Bull Racing', driver1: 'verstappen', driver2: 'hadjar' },
  { team: 'Mercedes', driver1: 'russell', driver2: 'antonelli' },
  { team: 'Aston Martin', driver1: 'alonso', driver2: 'stroll' },
  { team: 'Alpine', driver1: 'gasly', driver2: 'colapinto' },
  { team: 'Williams', driver1: 'sainz', driver2: 'albon' },
  { team: 'Racing Bulls', driver1: 'lawson', driver2: 'lindblad' },
  { team: 'Audi', driver1: 'hulkenberg', driver2: 'bortoleto' },
  { team: 'Haas GR', driver1: 'bearman', driver2: 'ocon' },
  { team: 'Cadillac', driver1: 'perez', driver2: 'bottas' },
];

export const TEAM_DUOS_CATALOG: TeamDuoOption[] = [
  { id: 'mclaren', name: 'McLaren F1 Team', shortName: 'McLaren', tag: 'PAPAYA', color: '#FF8000', gradient: 'linear-gradient(135deg, #FF8000 0%, #D85600 100%)', driver1Id: 'norris', driver2Id: 'piastri' },
  { id: 'ferrari', name: 'Scuderia Ferrari', shortName: 'Ferrari', tag: 'SCUDERIA', color: '#E8002D', gradient: 'linear-gradient(135deg, #EF1A2D 0%, #8A000E 100%)', driver1Id: 'leclerc', driver2Id: 'hamilton' },
  { id: 'redbull', name: 'Red Bull Racing', shortName: 'Red Bull', tag: 'RED BULL', color: '#1E41FF', gradient: 'linear-gradient(135deg, #1E3D7B 0%, #061026 100%)', driver1Id: 'verstappen', driver2Id: 'hadjar' },
  { id: 'mercedes', name: 'Mercedes-AMG PETRONAS', shortName: 'Mercedes', tag: 'PETRONAS', color: '#00A19C', gradient: 'linear-gradient(135deg, #27F4D2 0%, #007A6C 100%)', driver1Id: 'russell', driver2Id: 'antonelli' },
  { id: 'astonmartin', name: 'Aston Martin Aramco', shortName: 'Aston Martin', tag: 'AMR', color: '#00594F', gradient: 'linear-gradient(135deg, #00665E 0%, #002B26 100%)', driver1Id: 'alonso', driver2Id: 'stroll' },
  { id: 'alpine', name: 'BWT Alpine F1 Team', shortName: 'Alpine', tag: 'ALPINE', color: '#0093CC', gradient: 'linear-gradient(135deg, #0093CC 0%, #FD4BC7 100%)', driver1Id: 'gasly', driver2Id: 'colapinto' },
  { id: 'williams', name: 'Williams Racing', shortName: 'Williams', tag: 'WILLIAMS', color: '#00A0DE', gradient: 'linear-gradient(135deg, #00A0DE 0%, #041E42 100%)', driver1Id: 'sainz', driver2Id: 'albon' },
  { id: 'rb', name: 'Visa Cash App RB', shortName: 'Racing Bulls', tag: 'VCARB', color: '#3858EC', gradient: 'linear-gradient(135deg, #4E71FF 0%, #10217D 100%)', driver1Id: 'lawson', driver2Id: 'lindblad' },
  { id: 'audi', name: 'Audi F1 Team', shortName: 'Audi', tag: 'AUDI', color: '#C0C6CE', gradient: 'linear-gradient(135deg, #E6E8EC 0%, #C0C6CE 50%, #7E8590 100%)', driver1Id: 'hulkenberg', driver2Id: 'bortoleto' },
  { id: 'haas', name: 'TGR Haas F1 Team', shortName: 'Haas GR', tag: 'HAAS GR', color: '#ED1A3B', gradient: 'linear-gradient(135deg, #FFFFFF 0%, #ED1A3B 100%)', driver1Id: 'bearman', driver2Id: 'ocon' },
  { id: 'cadillac', name: 'Cadillac Formula 1 Team', shortName: 'Cadillac', tag: 'CADILLAC', color: '#A1A1AA', gradient: 'linear-gradient(135deg, #FFFFFF 0%, #3F3F46 100%)', driver1Id: 'perez', driver2Id: 'bottas' },
];

export function getTeammateDuoForRound(round = 20, season = 2026): TeamDuo {
  const index = Math.abs((season * 1000) + round) % OFFICIAL_2026_TEAM_DUOS.length;
  return OFFICIAL_2026_TEAM_DUOS[index];
}

export function getTeamDuoById(teamId: string): TeamDuoOption | undefined {
  if (!teamId) return undefined;
  const clean = teamId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return TEAM_DUOS_CATALOG.find(t => 
    t.id.toLowerCase() === clean || 
    t.shortName.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
    clean.includes(t.id.toLowerCase())
  );
}

export function findTeamDuoByDrivers(d1: string, d2: string): TeamDuoOption | undefined {
  if (!d1 || !d2) return undefined;
  const clean1 = d1.toLowerCase().trim();
  const clean2 = d2.toLowerCase().trim();
  return TEAM_DUOS_CATALOG.find(t => 
    (t.driver1Id.toLowerCase() === clean1 && t.driver2Id.toLowerCase() === clean2) ||
    (t.driver1Id.toLowerCase() === clean2 && t.driver2Id.toLowerCase() === clean1)
  );
}
