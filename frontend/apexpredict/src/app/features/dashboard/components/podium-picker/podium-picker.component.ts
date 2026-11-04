import { Component, signal, computed, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { F1Driver, F1_DRIVERS, ACTIVE_F1_DRIVERS, PodiumSlot } from '../../../../core/models/f1-drivers.model';
import { DriverPickerModalComponent } from '../../../../shared/components/driver-picker-modal/driver-picker-modal.component';

export type { F1Driver };
export { F1_DRIVERS };

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
  // Lista de pilotos F1 activos
  readonly drivers = ACTIVE_F1_DRIVERS;

  // Estado del podio (Signals / Models para permitir binding bidireccional)
  readonly p1DriverId = model<string>('');
  readonly p2DriverId = model<string>('');
  readonly p3DriverId = model<string>('');

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
      case 'p1': return 'P1 Winner — Vencedor';
      case 'p2': return 'P2 Segundo — Segundo Puesto';
      case 'p3': return 'P3 Tercero — Tercer Puesto';
    }
  });

  getDriver(id: string): F1Driver | undefined {
    if (!id) return undefined;
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

  clearSlot(slot: 'p1' | 'p2' | 'p3') {
    if (slot === 'p1') this.p1DriverId.set('');
    else if (slot === 'p2') this.p2DriverId.set('');
    else if (slot === 'p3') this.p3DriverId.set('');
  }

  /**
   * Lógica de Auto-intercambio (auto-swap):
   * Si seleccionas a un piloto que ya estaba en otro puesto del podio,
   * automáticamente intercambia su lugar con el piloto anterior.
   */
  selectDriver(driverId: string) {
    const slot = this.activeSlot();
    if (!driverId) {
      this.clearSlot(slot);
      this.closeModal();
      return;
    }

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
    this.p1DriverId.set('');
    this.p2DriverId.set('');
    this.p3DriverId.set('');
  }

  handleModalDriverSelected(event: { slot: PodiumSlot; driverId: string }) {
    if (!event.driverId) {
      if (event.slot === 'p1' || event.slot === 'p2' || event.slot === 'p3') {
        this.clearSlot(event.slot);
      }
    } else {
      this.selectDriver(event.driverId);
    }
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
