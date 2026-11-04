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
