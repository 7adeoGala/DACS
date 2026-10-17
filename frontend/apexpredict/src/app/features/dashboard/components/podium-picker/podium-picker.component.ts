import { Component, signal, computed, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface F1Driver {
  id: string;
  name: string;
  code: string;
  number: number;
  team: string;
  teamColor: string;
}

export const F1_DRIVERS: F1Driver[] = [
  { id: 'verstappen', name: 'Max Verstappen', code: 'VER', number: 1, team: 'Red Bull Racing', teamColor: '#3671C6' },
  { id: 'norris', name: 'Lando Norris', code: 'NOR', number: 4, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'leclerc', name: 'Charles Leclerc', code: 'LEC', number: 16, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'hamilton', name: 'Lewis Hamilton', code: 'HAM', number: 44, team: 'Ferrari', teamColor: '#E80020' },
  { id: 'piastri', name: 'Oscar Piastri', code: 'PIA', number: 81, team: 'McLaren', teamColor: '#FF8000' },
  { id: 'russell', name: 'George Russell', code: 'RUS', number: 63, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'antonelli', name: 'Kimi Antonelli', code: 'ANT', number: 12, team: 'Mercedes', teamColor: '#27F4D2' },
  { id: 'sainz', name: 'Carlos Sainz', code: 'SAI', number: 55, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'albon', name: 'Alexander Albon', code: 'ALB', number: 23, team: 'Williams', teamColor: '#64C4FF' },
  { id: 'alonso', name: 'Fernando Alonso', code: 'ALO', number: 14, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'stroll', name: 'Lance Stroll', code: 'STR', number: 18, team: 'Aston Martin', teamColor: '#229971' },
  { id: 'colapinto', name: 'Franco Colapinto', code: 'COL', number: 43, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'gasly', name: 'Pierre Gasly', code: 'GAS', number: 10, team: 'Alpine', teamColor: '#0093CC' },
  { id: 'tsunoda', name: 'Yuki Tsunoda', code: 'TSU', number: 22, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'hadjar', name: 'Isack Hadjar', code: 'HAD', number: 6, team: 'Racing Bulls', teamColor: '#6692FF' },
  { id: 'hulkenberg', name: 'Nico Hülkenberg', code: 'HUL', number: 27, team: 'Stake Sauber', teamColor: '#52E252' },
  { id: 'bortoleto', name: 'Gabriel Bortoleto', code: 'BOR', number: 5, team: 'Stake Sauber', teamColor: '#52E252' },
  { id: 'bearman', name: 'Oliver Bearman', code: 'BEA', number: 87, team: 'Haas', teamColor: '#B6BABD' },
  { id: 'ocon', name: 'Esteban Ocon', code: 'OCO', number: 31, team: 'Haas', teamColor: '#B6BABD' }
];

import { DriverPickerModalComponent } from '../../../../shared/components/driver-picker-modal/driver-picker-modal.component';
import { PodiumSlot } from '../../../../core/models/f1-drivers.model';

export interface PodiumSelection {
  p1: string;
  p2: string;
  p3: string;
  totalPoints: number;
}

@Component({
  selector: 'app-podium-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, DriverPickerModalComponent],
  templateUrl: './podium-picker.component.html',
  styleUrls: ['./podium-picker.component.css']
})
export class PodiumPickerComponent {
  // Lista de pilotos F1
  readonly drivers = F1_DRIVERS;

  // Estado del podio (Signals / Models para permitir binding bidireccional)
  readonly p1DriverId = model<string>('verstappen');
  readonly p2DriverId = model<string>('norris');
  readonly p3DriverId = model<string>('leclerc');

  // Estado del modal de selección
  readonly isModalOpen = signal<boolean>(false);
  readonly activeSlot = signal<'p1' | 'p2' | 'p3'>('p1');
  readonly searchFilter = signal<string>('');

  // Evento emisor al guardar
  readonly onSavePodium = output<PodiumSelection>();

  // Puntos calculados
  readonly totalEstimatedPoints = computed(() => 25 + 18 + 15); // 58 pts

  // Pilotos filtrados en el modal
  readonly filteredDrivers = computed(() => {
    const query = this.searchFilter().trim().toLowerCase();
    if (!query) return this.drivers;
    return this.drivers.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.code.toLowerCase().includes(query) ||
      d.team.toLowerCase().includes(query) ||
      d.number.toString().includes(query)
    );
  });

  // Título legible del slot activo en el modal
  readonly activeSlotTitle = computed(() => {
    switch (this.activeSlot()) {
      case 'p1': return '🥇 P1 Winner — Vencedor (+25 PTS)';
      case 'p2': return '🥈 P2 Segundo — Segundo Puesto (+18 PTS)';
      case 'p3': return '🥉 P3 Tercero — Tercer Puesto (+15 PTS)';
    }
  });

  getDriver(id: string): F1Driver | undefined {
    return this.drivers.find(d => d.id === id);
  }

  openDriverPicker(slot: 'p1' | 'p2' | 'p3') {
    this.activeSlot.set(slot);
    this.searchFilter.set('');
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  /**
   * Lógica de Auto-intercambio (auto-swap):
   * Si seleccionas a un piloto que ya estaba en otro puesto del podio,
   * automáticamente intercambia su lugar con el piloto anterior.
   */
  selectDriver(driverId: string) {
    const slot = this.activeSlot();
    const currentP1 = this.p1DriverId();
    const currentP2 = this.p2DriverId();
    const currentP3 = this.p3DriverId();

    if (slot === 'p1') {
      if (currentP2 === driverId) this.p2DriverId.set(currentP1);
      else if (currentP3 === driverId) this.p3DriverId.set(currentP1);
      this.p1DriverId.set(driverId);
    } else if (slot === 'p2') {
      if (currentP1 === driverId) this.p1DriverId.set(currentP2);
      else if (currentP3 === driverId) this.p3DriverId.set(currentP2);
      this.p2DriverId.set(driverId);
    } else if (slot === 'p3') {
      if (currentP1 === driverId) this.p1DriverId.set(currentP3);
      else if (currentP2 === driverId) this.p2DriverId.set(currentP3);
      this.p3DriverId.set(driverId);
    }

    this.closeModal();
  }

  resetPodium() {
    this.p1DriverId.set('verstappen');
    this.p2DriverId.set('norris');
    this.p3DriverId.set('leclerc');
  }

  handleModalDriverSelected(event: { slot: PodiumSlot; driverId: string }) {
    this.selectDriver(event.driverId);
  }

  save() {
    this.onSavePodium.emit({
      p1: this.p1DriverId(),
      p2: this.p2DriverId(),
      p3: this.p3DriverId(),
      totalPoints: this.totalEstimatedPoints()
    });
  }
}
