import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ACTIVE_F1_DRIVERS, F1Driver } from '../../core/models/f1-drivers.model';

export interface ProfileTeamOption {
  id: string;
  name: string;
  color: string;
  tag: string;
}

const PROFILE_TEAMS: ProfileTeamOption[] = [
  { id: 'mclaren', name: 'McLaren F1 Team', color: '#FF8000', tag: 'PAPAYA' },
  { id: 'ferrari', name: 'Scuderia Ferrari', color: '#E8002D', tag: 'SCUDERIA' },
  { id: 'redbull', name: 'Red Bull Racing', color: '#1E41FF', tag: 'RED BULL' },
  { id: 'mercedes', name: 'Mercedes-AMG PETRONAS', color: '#00A19C', tag: 'PETRONAS' },
  { id: 'astonmartin', name: 'Aston Martin Aramco', color: '#00594F', tag: 'AMR' },
  { id: 'alpine', name: 'BWT Alpine F1 Team', color: '#0093CC', tag: 'ALPINE' },
  { id: 'williams', name: 'Williams Racing', color: '#00A0DE', tag: 'WILLIAMS' },
  { id: 'rb', name: 'Visa Cash App RB', color: '#3858EC', tag: 'VCARB' },
  { id: 'audi', name: 'Audi F1 Team', color: '#C0C6CE', tag: 'AUDI' },
  { id: 'haas', name: 'TGR Haas F1 Team', color: '#FFFFFF', tag: 'HAAS GR' },
  { id: 'cadillac', name: 'Cadillac Formula 1 Team', color: '#FFFFFF', tag: 'CADILLAC' },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly teams = PROFILE_TEAMS;
  readonly drivers: F1Driver[] = ACTIVE_F1_DRIVERS;

  readonly isLoading = signal(true);
  readonly isSavingProfile = signal(false);
  readonly profileSuccess = signal('');
  readonly profileError = signal('');

  readonly isCheckingName = signal(false);
  readonly isDuplicateName = signal(false);
  readonly duplicateNameError = signal('');
  private nameCheckTimer: ReturnType<typeof setTimeout> | null = null;

  readonly savedDisplayName = signal('');
  readonly totalScore = signal(0);
  readonly predictionsCount = signal(0);

  displayName = '';
  firstName = '';
  lastName = '';
  email = '';
  country = '';
  bio = '';
  favoriteTeamId = 'mclaren';
  favoriteDriverId = 'norris';
  notificationsEnabled = true;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly isSavingPassword = signal(false);
  readonly passwordSuccess = signal('');
  readonly passwordError = signal('');

  readonly selectedTeam = computed(() => {
    const tid = this.favoriteTeamId === 'sauber' ? 'audi' : this.favoriteTeamId;
    return this.teams.find((t) => t.id === tid) || this.teams[0];
  });

  readonly initials = computed(() => {
    const base = (this.displayName || this.savedDisplayName() || this.auth.username() || 'AP').trim();
    const parts = base.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return base.slice(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.api.getProfile().subscribe({
      next: (profile) => {
        this.isLoading.set(false);
        this.displayName = profile.displayName || this.auth.username() || '';
        this.savedDisplayName.set(this.displayName);
        this.firstName = profile.firstName || '';
        this.lastName = profile.lastName || '';
        this.email = profile.email || '';
        this.country = profile.country || '';
        this.bio = profile.bio || '';
        this.favoriteTeamId = profile.favoriteTeamId === 'sauber' ? 'audi' : (profile.favoriteTeamId || 'mclaren');
        this.favoriteDriverId = profile.favoriteDriverId || 'norris';
        this.notificationsEnabled = profile.notificationsEnabled ?? true;
        this.totalScore.set(profile.totalScore ?? 0);
        this.predictionsCount.set(profile.predictionsCount ?? 0);
      },
      error: () => {
        this.isLoading.set(false);
        this.displayName = this.auth.username() || '';
        this.savedDisplayName.set(this.displayName);
        this.profileError.set('No pudimos cargar todos los datos de tu perfil. Intentá nuevamente.');
      },
    });
  }

  onDisplayNameInput(value: string): void {
    this.displayName = value;
    this.profileSuccess.set('');
    this.profileError.set('');
    this.duplicateNameError.set('');

    const trimmed = (value || '').trim();
    if (!trimmed) {
      this.isDuplicateName.set(false);
      return;
    }
    if (trimmed.toLowerCase() === this.savedDisplayName().trim().toLowerCase()) {
      this.isDuplicateName.set(false);
      return;
    }

    if (this.nameCheckTimer) {
      clearTimeout(this.nameCheckTimer);
    }
    this.isCheckingName.set(true);
    this.nameCheckTimer = setTimeout(() => {
      this.api.checkDisplayName(trimmed).subscribe({
        next: (res) => {
          this.isCheckingName.set(false);
          if (!res.available) {
            this.isDuplicateName.set(true);
            this.duplicateNameError.set(`El nombre público "${trimmed}" ya está en uso.`);
          } else {
            this.isDuplicateName.set(false);
          }
        },
        error: () => {
          this.isCheckingName.set(false);
        },
      });
    }, 250);
  }

  saveProfile(): void {
    const cleanDisplayName = this.displayName.trim();
    if (!cleanDisplayName) {
      this.profileError.set('El nombre público es obligatorio.');
      return;
    }
    if (this.isDuplicateName() || this.isCheckingName() || this.isSavingProfile()) {
      return;
    }
    const cleanEmail = this.email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.profileError.set('Ingresá un correo electrónico válido.');
      return;
    }

    this.isSavingProfile.set(true);
    this.profileSuccess.set('');
    this.profileError.set('');

    this.api
      .updateProfile({
        displayName: cleanDisplayName.slice(0, 40),
        email: cleanEmail || null,
        firstName: this.firstName.trim() || null,
        lastName: this.lastName.trim() || null,
        country: this.country.trim() || null,
        bio: this.bio.trim() || null,
        favoriteTeamId: this.favoriteTeamId || null,
        favoriteDriverId: this.favoriteDriverId || null,
        notificationsEnabled: this.notificationsEnabled,
      })
      .subscribe({
        next: (updated) => {
          this.isSavingProfile.set(false);
          this.displayName = updated.displayName || cleanDisplayName;
          this.savedDisplayName.set(this.displayName);
          this.email = updated.email || '';
          this.firstName = updated.firstName || '';
          this.lastName = updated.lastName || '';
          this.country = updated.country || '';
          this.bio = updated.bio || '';
          this.favoriteTeamId = updated.favoriteTeamId || this.favoriteTeamId;
          this.favoriteDriverId = updated.favoriteDriverId || this.favoriteDriverId;
          this.notificationsEnabled = updated.notificationsEnabled ?? this.notificationsEnabled;
          this.api.setCachedProfile(updated, this.auth.username());
          this.profileSuccess.set('Tus datos de perfil se actualizaron correctamente.');
        },
        error: (err) => {
          this.isSavingProfile.set(false);
          const msg = err?.error?.message || err?.error?.description || 'No se pudieron guardar los cambios del perfil.';
          this.profileError.set(msg);
        },
      });
  }

  savePassword(): void {
    this.passwordSuccess.set('');
    this.passwordError.set('');

    if (!this.currentPassword) {
      this.passwordError.set('Ingresá tu contraseña actual.');
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (this.isSavingPassword()) return;

    this.isSavingPassword.set(true);
    this.api
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: (res) => {
          this.isSavingPassword.set(false);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.passwordSuccess.set(res?.message || 'Contraseña actualizada correctamente.');
        },
        error: (err) => {
          this.isSavingPassword.set(false);
          const msg =
            err?.error?.message ||
            err?.error?.description ||
            'No se pudo actualizar la contraseña. Verificá tu contraseña actual.';
          this.passwordError.set(msg);
        },
      });
  }
}
