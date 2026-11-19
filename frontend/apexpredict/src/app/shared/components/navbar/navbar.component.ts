import { Component, ElementRef, HostListener, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { F1_DRIVERS, ACTIVE_F1_DRIVERS, F1Driver } from '../../../core/models/f1-drivers.model';
import { environment } from '../../../../environments/environment';

export interface F1TeamOption {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  gradient: string;
  textColor: string;
  btnTextColor?: string;
  tag: string;
  tagColor?: string;
  switchKnobColor?: string;
}

export const F1_TEAMS_OPTIONS: F1TeamOption[] = [
  { 
    id: 'mclaren', 
    name: 'McLaren F1 Team', 
    color: '#FF8000', 
    secondaryColor: '#00A3E0',
    gradient: 'linear-gradient(135deg, #FF8000 0%, #D85600 100%)',
    textColor: '#000000',
    btnTextColor: '#000000',
    tag: 'PAPAYA' 
  },
  { 
    id: 'ferrari', 
    name: 'Scuderia Ferrari', 
    color: '#E8002D', 
    secondaryColor: '#FFE500',
    gradient: 'linear-gradient(135deg, #EF1A2D 0%, #8A000E 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'SCUDERIA' 
  },
  { 
    id: 'redbull', 
    name: 'Red Bull Racing', 
    color: '#1E41FF', 
    secondaryColor: '#EA1D2D',
    gradient: 'linear-gradient(135deg, #1E3D7B 0%, #061026 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'RED BULL' 
  },
  { 
    id: 'mercedes', 
    name: 'Mercedes-AMG PETRONAS', 
    color: '#00A19C', 
    secondaryColor: '#27F4D2',
    gradient: 'linear-gradient(135deg, #27F4D2 0%, #007A6C 100%)',
    textColor: '#031E19',
    btnTextColor: '#031E19',
    tag: 'PETRONAS' 
  },
  { 
    id: 'astonmartin', 
    name: 'Aston Martin Aramco', 
    color: '#00594F', 
    secondaryColor: '#CEDC00',
    gradient: 'linear-gradient(135deg, #00665E 0%, #002B26 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'AMR' 
  },
  { 
    id: 'alpine', 
    name: 'BWT Alpine F1 Team', 
    color: '#0093CC', 
    secondaryColor: '#FD4BC7',
    gradient: 'linear-gradient(135deg, #0093CC 0%, #FD4BC7 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'ALPINE' 
  },
  { 
    id: 'williams', 
    name: 'Williams Racing', 
    color: '#00A0DE', 
    secondaryColor: '#00F2FE',
    gradient: 'linear-gradient(135deg, #00A0DE 0%, #041E42 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'WILLIAMS' 
  },
  { 
    id: 'rb', 
    name: 'Visa Cash App RB', 
    color: '#3858EC', 
    secondaryColor: '#FF3B30',
    gradient: 'linear-gradient(135deg, #4E71FF 0%, #10217D 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'VCARB' 
  },
  { 
    id: 'audi', 
    name: 'Audi F1 Team', 
    color: '#C0C6CE', 
    secondaryColor: '#E0001B',
    gradient: 'linear-gradient(135deg, #E6E8EC 0%, #C0C6CE 50%, #7E8590 100%)',
    textColor: '#E0001B',
    btnTextColor: '#0b0f17',
    switchKnobColor: '#000000',
    tag: 'AUDI',
    tagColor: '#E0001B' 
  },
  { 
    id: 'haas', 
    name: 'TGR Haas F1 Team', 
    color: '#FFFFFF', 
    secondaryColor: '#ED1A3B',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 58%, #ED1A3B 82%, #111111 100%)',
    textColor: '#ED1A3B',
    btnTextColor: '#0b0f17',
    switchKnobColor: '#ED1A3B',
    tag: 'HAAS GR',
    tagColor: '#ED1A3B' 
  },
  { 
    id: 'cadillac', 
    name: 'Cadillac Formula 1 Team', 
    color: '#FFFFFF', 
    secondaryColor: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #3F3F46 50%, #09090B 100%)',
    textColor: '#000000',
    btnTextColor: '#000000',
    switchKnobColor: '#000000',
    tag: 'CADILLAC',
    tagColor: '#FFFFFF' 
  }
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly api = inject(ApiService);
  private readonly elementRef = inject(ElementRef);

  readonly currentUrl = signal<string>(this.router.url);

  readonly teams = F1_TEAMS_OPTIONS;
  readonly drivers: F1Driver[] = ACTIVE_F1_DRIVERS;

  readonly isProfileOpen = signal<boolean>(false);
  readonly isMobileNavOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly saveStatus = signal<'idle' | 'success' | 'error'>('idle');

  readonly isCheckingName = signal<boolean>(false);
  readonly isDuplicateName = signal<boolean>(false);
  readonly duplicateErrorMessage = signal<string | null>(null);
  private nameCheckTimeout: any = null;

  readonly isDisplayNameEmpty = computed(() => (this.formDisplayName() || '').trim().length === 0);
  readonly isSaveDisabled = computed(() => this.isSaving() || this.isCheckingName() || this.isDuplicateName() || this.isDisplayNameEmpty());

  readonly isTeamSelectOpen = signal<boolean>(false);
  readonly isDriverSelectOpen = signal<boolean>(false);

  readonly savedDisplayName = signal<string>(this.auth.username() || 'Piloto');
  readonly savedTeamId = signal<string>('mclaren');
  readonly savedDriverId = signal<string>('norris');
  readonly savedNotifications = signal<boolean>(true);

  readonly formDisplayName = signal<string>(this.auth.username() || 'Piloto');
  readonly formTeamId = signal<string>('mclaren');
  readonly formDriverId = signal<string>('norris');
  readonly formNotifications = signal<boolean>(true);

  readonly savedTeam = computed(() => {
    const tid = this.savedTeamId() === 'sauber' ? 'audi' : this.savedTeamId();
    return this.teams.find((t) => t.id === tid) || this.teams[0];
  });

  readonly savedDriver = computed(() => {
    return this.drivers.find((d) => d.id === this.savedDriverId()) || this.drivers[0];
  });

  readonly savedTeamTag = computed(() => {
    return `${this.savedTeam().tag} #${this.savedDriver().number}`;
  });

  readonly savedInitials = computed(() => {
    const name = this.savedDisplayName() || this.auth.username() || 'AP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly formTeam = computed(() => {
    const tid = this.formTeamId() === 'sauber' ? 'audi' : this.formTeamId();
    return this.teams.find((t) => t.id === tid) || this.teams[0];
  });

  readonly activeTeam = computed(() => {
    return this.isProfileOpen() ? this.formTeam() : this.savedTeam();
  });

  readonly activeDriver = computed(() => {
    if (this.isProfileOpen()) {
      return this.drivers.find((d) => d.id === this.formDriverId()) || this.savedDriver();
    }
    return this.savedDriver();
  });

  readonly activeTeamTag = computed(() => {
    return `${this.activeTeam().tag} #${this.activeDriver().number}`;
  });

  readonly changePasswordUrl = computed(() => {
    const base = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account`;
    const referrer = encodeURIComponent(environment.keycloak.clientId);
    return `${base}/?referrer=${referrer}#/account-security/signing-in`;
  });

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
        this.isMobileNavOpen.set(false);
      }
    });

    effect(() => {
      const isAuth = this.auth.authenticated();
      const user = this.auth.username();
      if (isAuth) {
        this.loadProfile();
      } else {
        const defaultName = user || 'Piloto';
        this.savedDisplayName.set(defaultName);
        this.formDisplayName.set(defaultName);
      }
    });

    effect(() => {
      const color = this.activeTeam().color;
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.setProperty('--user-team-color', color);
      }
    });
  }

  ngOnInit() {
    if (this.auth.authenticated()) {
      this.loadProfile();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (this.isProfileOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.closeProfileMenu();
      return;
    }
    if (this.isMobileNavOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.closeMobileNav();
      return;
    }
    if (!target?.closest('.custom-select-container')) {
      this.isTeamSelectOpen.set(false);
      this.isDriverSelectOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isTeamSelectOpen() || this.isDriverSelectOpen()) {
      this.isTeamSelectOpen.set(false);
      this.isDriverSelectOpen.set(false);
      return;
    }
    if (this.isProfileOpen()) {
      this.closeProfileMenu();
    }
    if (this.isMobileNavOpen()) {
      this.closeMobileNav();
    }
  }

  toggleMobileNav(event: MouseEvent) {
    event.stopPropagation();
    this.isMobileNavOpen.update((v) => !v);
    if (this.isMobileNavOpen()) {
      this.closeProfileMenu();
    }
  }

  closeMobileNav() {
    this.isMobileNavOpen.set(false);
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    if (this.isProfileOpen()) {
      this.closeProfileMenu();
    } else {
      this.openProfileMenu();
    }
  }

  onDisplayNameChange(value: string) {
    this.formDisplayName.set(value);
    this.saveStatus.set('idle');
    this.duplicateErrorMessage.set(null);

    const trimmed = (value || '').trim();
    if (trimmed.length === 0) {
      this.isDuplicateName.set(false);
      return;
    }

    const currentConfirmed = (this.savedDisplayName() || '').trim().toLowerCase();
    const currentUsername = (this.auth.username() || '').trim().toLowerCase();
    if (trimmed.toLowerCase() === currentConfirmed || trimmed.toLowerCase() === currentUsername) {
      this.isDuplicateName.set(false);
      return;
    }

    if (this.nameCheckTimeout) {
      clearTimeout(this.nameCheckTimeout);
    }

    this.isCheckingName.set(true);
    this.nameCheckTimeout = setTimeout(() => {
      this.api.checkDisplayName(trimmed).subscribe({
        next: (res) => {
          this.isCheckingName.set(false);
          if (!res.available) {
            this.isDuplicateName.set(true);
            this.duplicateErrorMessage.set(`El nombre de usuario "${trimmed}" ya está en uso por otro piloto.`);
          } else {
            this.isDuplicateName.set(false);
            this.duplicateErrorMessage.set(null);
          }
        },
        error: () => {
          this.isCheckingName.set(false);
        }
      });
    }, 250);
  }

  openProfileMenu() {
    this.closeMobileNav();
    this.isTeamSelectOpen.set(false);
    this.isDriverSelectOpen.set(false);
    this.formDisplayName.set(this.savedDisplayName());
    this.formTeamId.set(this.savedTeamId());
    this.formDriverId.set(this.savedDriverId());
    this.formNotifications.set(this.savedNotifications());
    this.saveStatus.set('idle');
    this.isDuplicateName.set(false);
    this.duplicateErrorMessage.set(null);
    this.isProfileOpen.set(true);
  }

  closeProfileMenu() {
    this.isTeamSelectOpen.set(false);
    this.isDriverSelectOpen.set(false);
    this.formDisplayName.set(this.savedDisplayName());
    this.formTeamId.set(this.savedTeamId());
    this.formDriverId.set(this.savedDriverId());
    this.formNotifications.set(this.savedNotifications());
    this.saveStatus.set('idle');
    this.isDuplicateName.set(false);
    this.duplicateErrorMessage.set(null);
    this.isProfileOpen.set(false);
  }

  toggleTeamSelect(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.isTeamSelectOpen();
    this.isTeamSelectOpen.set(next);
    if (next) {
      this.isDriverSelectOpen.set(false);
    }
  }

  toggleDriverSelect(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.isDriverSelectOpen();
    this.isDriverSelectOpen.set(next);
    if (next) {
      this.isTeamSelectOpen.set(false);
    }
  }

  selectTeam(teamId: string, event: MouseEvent) {
    event.stopPropagation();
    this.onTeamSelected(teamId);
    this.isTeamSelectOpen.set(false);
  }

  selectDriver(driverId: string, event: MouseEvent) {
    event.stopPropagation();
    this.formDriverId.set(driverId);
    this.isDriverSelectOpen.set(false);
  }

  onTeamSelected(teamId: string) {
    this.formTeamId.set(teamId);
    const teamObj = this.teams.find((t) => t.id === teamId);
    const driverOfTeam = this.drivers.find((d) => {
      if (!teamObj) return false;
      const tid = teamObj.id.toLowerCase();
      const tname = teamObj.name.toLowerCase();
      const dteam = d.team.toLowerCase();
      return dteam.includes(tid) || tname.includes(dteam) || dteam.includes(tname);
    });
    if (driverOfTeam) {
      this.formDriverId.set(driverOfTeam.id);
    }
  }

  loadProfile() {
    const username = this.auth.username();

    const cached = this.api.getCachedProfile(username);
    if (cached) {
      if (cached.displayName) {
        this.savedDisplayName.set(cached.displayName);
        this.formDisplayName.set(cached.displayName);
      }
      if (cached.favoriteTeamId) {
        const teamId = cached.favoriteTeamId === 'sauber' ? 'audi' : cached.favoriteTeamId;
        this.savedTeamId.set(teamId);
        this.formTeamId.set(teamId);
      }
      if (cached.favoriteDriverId) {
        this.savedDriverId.set(cached.favoriteDriverId);
        this.formDriverId.set(cached.favoriteDriverId);
      }
      if (cached.notificationsEnabled !== undefined) {
        this.savedNotifications.set(cached.notificationsEnabled);
        this.formNotifications.set(cached.notificationsEnabled);
      }
      if (cached.totalScore !== undefined) {
        this.auth.userPoints.set(cached.totalScore);
      }
    } else if (username) {
      this.savedDisplayName.set(username);
      this.formDisplayName.set(username);
    }

    this.api.getProfile().subscribe({
      next: (profile) => {
        const name = profile.displayName || this.auth.username() || 'Piloto';
        this.savedDisplayName.set(name);
        this.formDisplayName.set(name);

        if (profile.favoriteTeamId) {
          const teamId = profile.favoriteTeamId === 'sauber' ? 'audi' : profile.favoriteTeamId;
          this.savedTeamId.set(teamId);
          this.formTeamId.set(teamId);
        }
        if (profile.favoriteDriverId) {
          this.savedDriverId.set(profile.favoriteDriverId);
          this.formDriverId.set(profile.favoriteDriverId);
        }
        if (profile.notificationsEnabled !== undefined) {
          this.savedNotifications.set(profile.notificationsEnabled);
          this.formNotifications.set(profile.notificationsEnabled);
        }
        if (profile.totalScore !== undefined) {
          this.auth.userPoints.set(profile.totalScore);
        }
        this.api.setCachedProfile(profile, username);
      },
      error: () => {
        if (!cached) {
          const fallback = this.auth.username() || 'Piloto';
          this.savedDisplayName.set(fallback);
          this.formDisplayName.set(fallback);
        }
      }
    });
  }

  saveProfile() {
    const raw = this.formDisplayName() || '';
    const trimmed = raw.trim();
    if (trimmed.length === 0 || this.isDuplicateName() || this.isCheckingName()) {
      return;
    }

    const finalName = trimmed.slice(0, 20);
    this.formDisplayName.set(finalName);

    const teamId = this.formTeamId();
    const driverId = this.formDriverId();
    const notifications = this.formNotifications();
    const username = this.auth.username();

    this.isSaving.set(true);
    this.saveStatus.set('idle');

    this.api.updateProfile({
      displayName: finalName,
      favoriteTeamId: teamId,
      favoriteDriverId: driverId,
      notificationsEnabled: notifications
    }).subscribe({
      next: (profile) => {
        this.isSaving.set(false);
        this.saveStatus.set('success');

        const confirmedName = profile.displayName || finalName;
        this.savedDisplayName.set(confirmedName);
        this.formDisplayName.set(confirmedName);
        this.isDuplicateName.set(false);
        this.duplicateErrorMessage.set(null);

        if (profile.favoriteTeamId) {
          this.savedTeamId.set(profile.favoriteTeamId);
          this.formTeamId.set(profile.favoriteTeamId);
        }
        if (profile.favoriteDriverId) {
          this.savedDriverId.set(profile.favoriteDriverId);
          this.formDriverId.set(profile.favoriteDriverId);
        }
        if (profile.notificationsEnabled !== undefined) {
          this.savedNotifications.set(profile.notificationsEnabled);
          this.formNotifications.set(profile.notificationsEnabled);
        }
        if (profile.totalScore !== undefined) {
          this.auth.userPoints.set(profile.totalScore);
        }
        this.api.setCachedProfile(profile, username);
        setTimeout(() => this.saveStatus.set('idle'), 2500);
      },
      error: (err) => {
        this.isSaving.set(false);
        const errDetail = (err?.error?.message || err?.error?.detail || err?.message || '').toLowerCase();
        if (err.status === 409 || errDetail.includes('en uso') || errDetail.includes('conflict') || errDetail.includes('duplicad')) {
          this.isDuplicateName.set(true);
          const msg = err?.error?.message || `El nombre de usuario "${finalName}" ya está registrado por otro piloto.`;
          this.duplicateErrorMessage.set(msg);
          this.saveStatus.set('error');
        } else {
          console.warn('Backend update failed:', err);
          this.saveStatus.set('error');
          setTimeout(() => this.saveStatus.set('idle'), 3500);
        }
      }
    });
  }

  isCurrent(tab: 'inicio' | 'predicciones' | 'ligas' | 'posiciones' | 'historial'): boolean {
    const url = this.currentUrl();
    if (tab === 'inicio') {
      return url === '/' || url === '' || url.startsWith('/?');
    }
    if (!url.startsWith('/dashboard') && !url.startsWith('/join')) {
      return false;
    }
    if (tab === 'ligas') {
      return url.includes('tab=ligas') || url.startsWith('/join');
    }
    if (tab === 'posiciones') {
      return url.includes('tab=posiciones') || url.includes('tab=global');
    }
    if (tab === 'historial') {
      return url.includes('tab=historial');
    }
    if (tab === 'predicciones') {
      return (
        !url.includes('tab=ligas') &&
        !url.includes('tab=posiciones') &&
        !url.includes('tab=global') &&
        !url.includes('tab=historial') &&
        !url.startsWith('/join')
      );
    }
    return false;
  }
}
