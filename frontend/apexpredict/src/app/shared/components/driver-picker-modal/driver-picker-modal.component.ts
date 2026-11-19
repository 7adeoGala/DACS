import { Component, signal, computed, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { F1Driver, F1_DRIVERS, ACTIVE_F1_DRIVERS, PodiumSlot } from '../../../core/models/f1-drivers.model';

@Component({
  selector: 'app-driver-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-picker-modal.component.html',
  styleUrls: ['./driver-picker-modal.component.css']
})
export class DriverPickerModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly currentSlot = input<PodiumSlot>('p1');
  readonly p1DriverId = input<string>('');
  readonly p2DriverId = input<string>('');
  readonly p3DriverId = input<string>('');
  readonly poleDriverId = input<string>('');

  readonly onClose = output<void>();
  readonly onDriverSelected = output<{ slot: PodiumSlot; driverId: string }>();

  readonly drivers: F1Driver[] = ACTIVE_F1_DRIVERS;

  readonly searchQuery = signal<string>('');
  readonly selectedTeam = signal<string>('ALL');

  readonly teamList: Array<{ name: string; color: string; gradient?: string }> = [
    { name: 'McLaren', color: '#ff8000' },
    { name: 'Red Bull', color: '#3671c6' },
    { name: 'Ferrari', color: '#e80020' },
    { name: 'Mercedes', color: '#27f4d2' },
    { name: 'Aston Martin', color: '#229971' },
    { name: 'Williams', color: '#64c4ff' },
    { name: 'Alpine', color: '#0093cc' },
    { name: 'Racing Bulls', color: '#6692ff' },
    { name: 'Audi', color: '#c0c6ce' },
    { name: 'Haas GR', color: '#ffffff', gradient: 'linear-gradient(135deg, #ffffff 50%, #ed1a3b 100%)' },
    { name: 'Cadillac', color: '#ffffff', gradient: 'linear-gradient(135deg, #ffffff 50%, #111111 100%)' }
  ];

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      this.close();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const inputEl = document.querySelector<HTMLInputElement>('.picker-search-input');
      inputEl?.focus();
    }
  }

  readonly filteredDrivers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const team = this.selectedTeam();

    return this.drivers.filter(d => {
      const matchesSearch = !q || (
        d.name.toLowerCase().includes(q) ||
        d.team.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.number.toString().includes(q)
      );

      const matchesTeam = team === 'ALL' || d.team.toLowerCase().includes(team.toLowerCase());

      return matchesSearch && matchesTeam;
    });
  });

  getSlotIcon(): string {
    switch (this.currentSlot()) {
      case 'p1': return 'P1';
      case 'p2': return 'P2';
      case 'p3': return 'P3';
      case 'pole': return 'POLE';
    }
  }

  getSlotTitle(): string {
    switch (this.currentSlot()) {
      case 'p1': return 'Seleccionar Ganador P1';
      case 'p2': return 'Seleccionar 2° Puesto P2';
      case 'p3': return 'Seleccionar 3° Puesto P3';
      case 'pole': return 'Seleccionar Pole Position';
    }
  }

  getSlotPoints(): string {
    switch (this.currentSlot()) {
      case 'p1': return '+25 PTS';
      case 'p2': return '+18 PTS';
      case 'p3': return '+15 PTS';
      case 'pole': return '+20 PTS';
    }
  }

  getSlotShortName(): string {
    switch (this.currentSlot()) {
      case 'p1': return 'P1';
      case 'p2': return 'P2';
      case 'p3': return 'P3';
      case 'pole': return 'Pole';
    }
  }

  isCurrentInSlot(driverId: string): boolean {
    const slot = this.currentSlot();
    if (slot === 'p1') return this.p1DriverId() === driverId;
    if (slot === 'p2') return this.p2DriverId() === driverId;
    if (slot === 'p3') return this.p3DriverId() === driverId;
    if (slot === 'pole') return this.poleDriverId() === driverId;
    return false;
  }

  isDriverInAnotherSlot(driverId: string): boolean {
    const slot = this.currentSlot();
    if (slot === 'pole') return false;

    if (slot === 'p1') return this.p2DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p2') return this.p1DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p3') return this.p1DriverId() === driverId || this.p2DriverId() === driverId;
    return false;
  }

  getDriverSlotName(driverId: string): string | null {
    if (this.p1DriverId() === driverId) return 'P1 Ganador';
    if (this.p2DriverId() === driverId) return 'P2 Segundo';
    if (this.p3DriverId() === driverId) return 'P3 Tercero';
    return null;
  }

  isCurrentSlotFilled(): boolean {
    const slot = this.currentSlot();
    if (slot === 'p1') return !!this.p1DriverId();
    if (slot === 'p2') return !!this.p2DriverId();
    if (slot === 'p3') return !!this.p3DriverId();
    if (slot === 'pole') return !!this.poleDriverId();
    return false;
  }

  clearCurrentSlot() {
    this.onDriverSelected.emit({ slot: this.currentSlot(), driverId: '' });
    this.close();
  }

  selectDriver(driverId: string) {
    if (this.isCurrentInSlot(driverId)) {
      this.clearCurrentSlot();
      return;
    }
    this.onDriverSelected.emit({ slot: this.currentSlot(), driverId });
    this.close();
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTeam.set('ALL');
  }

  close() {
    this.searchQuery.set('');
    this.selectedTeam.set('ALL');
    this.onClose.emit();
  }
}
