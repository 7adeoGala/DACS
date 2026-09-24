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
}
export interface Finish {
  position: number;
  driverId: string;
  driverName: string;
  constructorName: string;
  status: string;
}
