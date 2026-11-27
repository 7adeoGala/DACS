import { Component, inject, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subscription, catchError, finalize, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  ACTIVE_F1_DRIVERS,
  F1_DRIVERS,
  F1Driver,
  League,
  NextSession,
  LeaderboardEntry,
  PredictionDetail,
  PredictionHistoryItem,
  JolpicaDriverStanding,
  JolpicaConstructorStanding,
  resolveCircuitShortName,
  getTeammateDuoForRound
} from '../../core/models/api.models';
import { PodiumPickerComponent, PodiumSelection } from './components/podium-picker/podium-picker.component';
import { DriverPickerModalComponent } from '../../shared/components/driver-picker-modal/driver-picker-modal.component';
import { PodiumSlot } from '../../core/models/f1-drivers.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, PodiumPickerComponent, DriverPickerModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  public readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private initSub: Subscription | null = null;
  private slowWakeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isInitializing = signal<boolean>(true);
  readonly loadingMessage = signal<string>('Sincronizando sesión oficial y tu panel de pronósticos...');

  readonly drivers: F1Driver[] = ACTIVE_F1_DRIVERS;
  readonly activeTab = signal<'pronostico' | 'ligas' | 'posiciones' | 'historial'>('pronostico');
  readonly leagueSubTab = signal<'list' | 'create' | 'join'>('list');
  readonly posicionesSubTab = signal<'jugadores' | 'pilotos' | 'equipos'>('jugadores');

  readonly driverStandings = signal<JolpicaDriverStanding[]>([]);
  readonly constructorStandings = signal<JolpicaConstructorStanding[]>([]);

  readonly selectedHistoryItem = signal<PredictionHistoryItem | null>(null);

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.selectedHistoryItem()) {
      this.selectedHistoryItem.set(null);
    }
    if (this.isPickerOpen()) {
      this.closeDriverPicker();
    }
  }

  readonly session = signal<NextSession | null>(null);
  readonly isLocked = computed(() => this.session()?.isLocked ?? false);
  readonly matchupDriver1 = computed(() => this.session()?.matchupDriver1 || getTeammateDuoForRound(this.session()?.round || 20).driver1);
  readonly matchupDriver2 = computed(() => this.session()?.matchupDriver2 || getTeammateDuoForRound(this.session()?.round || 20).driver2);
  readonly circuitShortName = computed<string>(() => {
    return resolveCircuitShortName(null, this.session());
  });

  readonly p1DriverId = signal<string>('');
  readonly p2DriverId = signal<string>('');
  readonly p3DriverId = signal<string>('');
  readonly poleDriverId = signal<string>('');
  readonly duelWinnerId = signal<string>('');
  readonly safetyCars = signal<number>(0);
  readonly dnfs = signal<number>(0);

  readonly isPickerOpen = signal<boolean>(false);
  readonly pickerSlot = signal<'p1' | 'p2' | 'p3' | 'pole'>('p1');
  readonly pickerSearch = signal<string>('');

  readonly filteredDrivers = computed(() => {
    const q = this.pickerSearch().trim().toLowerCase();
    if (!q) return this.drivers;
    return this.drivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.team.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.number.toString().includes(q)
    );
  });

  readonly hasExistingPrediction = signal<boolean>(false);
  readonly predictionSubmittedAt = signal<string | null>(null);
  readonly currentPredictionSessionId = signal<string | null>(null);

  readonly isPodiumComplete = computed(() => {
    return !!(this.p1DriverId() && this.p2DriverId() && this.p3DriverId());
  });

  readonly isPodiumDuplicate = computed(() => {
    const picks = [this.p1DriverId(), this.p2DriverId(), this.p3DriverId()].filter(id => !!id && id.trim().length > 0);
    return new Set(picks).size !== picks.length;
  });

  readonly canSavePrediction = computed(() => {
    return !this.isPodiumDuplicate() && !this.isSaving() && !this.isLocked();
  });

  readonly myLeagues = signal<League[]>([]);
  readonly selectedLeague = signal<League | null>(null);
  readonly leagueLeaderboard = signal<LeaderboardEntry[]>([]);
  readonly currentUserId = signal<string | null>(null);

  readonly isSelectedLeagueOwner = computed(() => {
    const league = this.selectedLeague();
    if (!league) return false;
    const uid = this.currentUserId();
    if (uid && league.ownerId) {
      return league.ownerId === uid;
    }
    const username = this.auth.username()?.trim().toLowerCase();
    return !!(username && league.ownerName && league.ownerName.trim().toLowerCase() === username);
  });

  readonly isEditingLeague = signal(false);
  readonly isSavingLeagueEdit = signal(false);
  editLeagueName = '';
  editLeagueDescription = '';
  editLeaguePassword = '';

  readonly globalLeaderboard = signal<LeaderboardEntry[]>([]);
  readonly isLoadingGlobalLeaderboard = signal<boolean>(false);
  readonly globalLeaderboardError = signal<string | null>(null);
  readonly historyItems = signal<PredictionHistoryItem[]>([]);
  readonly isLoadingHistory = signal<boolean>(false);

  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');
  readonly copySuccess = signal(false);
  readonly showLeaguePassword = signal(false);
  readonly copyPasswordSuccess = signal(false);

  readonly isCreatingLeague = signal(false);
  readonly isJoiningLeague = signal(false);
  readonly leagueSuccess = signal('');
  readonly leagueError = signal('');

  newLeagueName = '';
  newLeagueDescription = '';
  newLeaguePassword = '';
  joinCode = '';
  joinPassword = '';

  ngOnInit() {
    this.restoreLocalCache();

    this.loadNextSession();
    if (this.auth.authenticated()) {
      this.loadUserLeagues();
      this.loadGlobalLeaderboard();
      this.loadHistory();
      this.api.getProfile().subscribe({
        next: (p) => this.currentUserId.set(p?.id || null),
        error: () => {}
      });
    }

    const routeInvite = this.route.snapshot.paramMap.get('inviteCode');
    if (routeInvite) {
      this.activeTab.set('ligas');
      this.leagueSubTab.set('join');
      this.joinCode = routeInvite;
    }

    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'ligas') {
        this.activeTab.set('ligas');
      } else if (tabParam === 'posiciones' || tabParam === 'global') {
        this.activeTab.set('posiciones');
        this.posicionesSubTab.set('jugadores');
      } else if (tabParam === 'historial') {
        this.activeTab.set('historial');
        this.loadHistory();
      } else {
        this.activeTab.set('pronostico');
      }
    });
  }

  ngOnDestroy() {
    if (this.slowWakeTimer) clearTimeout(this.slowWakeTimer);
    this.initSub?.unsubscribe();
  }

  loadF1Standings() {
    this.api.jolpicaDriverStandings().subscribe({
      next: (ds) => this.driverStandings.set(ds || []),
      error: () => this.driverStandings.set([])
    });
    this.api.jolpicaConstructorStandings().subscribe({
      next: (cs) => this.constructorStandings.set(cs || []),
      error: () => this.constructorStandings.set([])
    });
  }

  private loadNextSession() {
    this.initSub?.unsubscribe();
    if (this.slowWakeTimer) clearTimeout(this.slowWakeTimer);
    this.isInitializing.set(true);
    this.loadingMessage.set('Sincronizando sesión oficial y tu panel de pronósticos...');
    this.slowWakeTimer = setTimeout(() => {
      if (this.isInitializing()) {
        this.loadingMessage.set('Despertando servidores en la nube, aguarda unos segundos...');
      }
    }, 5000);

    this.initSub = this.api.nextSession(this.auth.authenticated()).pipe(
      catchError(() => of(null)),
      switchMap((sess) => {
        if (sess && sess.id) {
          const prevSessionId = this.session()?.id;
          this.session.set(sess);

          const activePredSession = this.currentPredictionSessionId();
          if ((prevSessionId && prevSessionId !== sess.id) || (activePredSession && activePredSession !== sess.id)) {
            this.clearPredictionState();
          }
        }

        if (!this.auth.authenticated()) {
          return of({ sess, pred: null as PredictionDetail | null });
        }

        const targetSessionId = sess?.id || this.session()?.id;
        const predRequest$ = targetSessionId
          ? this.api.predictionForSession(targetSessionId, this.auth.username())
          : this.api.currentPrediction(this.auth.username());

        return predRequest$.pipe(
          catchError(() => of(this.api.getCachedPrediction?.(this.auth.username(), targetSessionId) || null)),
          switchMap((pred) => of({ sess, pred }))
        );
      }),
      finalize(() => {
        if (this.slowWakeTimer) {
          clearTimeout(this.slowWakeTimer);
          this.slowWakeTimer = null;
        }
        this.isInitializing.set(false);
        this.loadF1Standings();
      })
    ).subscribe({
      next: ({ sess, pred }) => {
        if (!this.auth.authenticated()) return;
        const targetSessionId = sess?.id || this.session()?.id;
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          if (targetSessionId && pred.sessionId && pred.sessionId !== targetSessionId) {
            this.clearPredictionState();
            return;
          }
          this.applyPredictionToState(pred);
        } else {
          this.clearPredictionState();
        }
      }
    });
  }

  clearPredictionState() {
    this.p1DriverId.set('');
    this.p2DriverId.set('');
    this.p3DriverId.set('');
    this.poleDriverId.set('');
    this.duelWinnerId.set('');
    this.safetyCars.set(0);
    this.dnfs.set(0);
    this.hasExistingPrediction.set(false);
    this.predictionSubmittedAt.set(null);
    this.currentPredictionSessionId.set(null);
    this.api.clearCachedPrediction?.(this.auth.username());
  }

  private restoreLocalCache() {
    const user = this.auth.username();
    const cachedLb = this.api.getCachedGlobalLeaderboard?.();
    if (cachedLb && cachedLb.length > 0) {
      this.globalLeaderboard.set(cachedLb);
    }
    const currentSessionId = this.session()?.id;
    const cachedPred = this.api.getCachedPrediction?.(user, currentSessionId);
    if (cachedPred && (cachedPred.predictionId || (cachedPred.podium && cachedPred.podium.length > 0))) {
      if (!currentSessionId || !cachedPred.sessionId || cachedPred.sessionId === currentSessionId) {
        this.applyPredictionToState(cachedPred);
      } else {
        this.clearPredictionState();
      }
    } else {
      this.clearPredictionState();
    }
    const cachedLeagues = this.api.getCachedLeagues?.(user);
    if (cachedLeagues && cachedLeagues.length > 0) {
      this.myLeagues.set(cachedLeagues);
      if (!this.selectedLeague()) {
        this.selectedLeague.set(cachedLeagues[0]);
      }
    }
  }

  private applyPredictionToState(pred: PredictionDetail) {
    const currentSessionId = this.session()?.id;
    if (currentSessionId && pred.sessionId && pred.sessionId !== currentSessionId) {
      this.clearPredictionState();
      return;
    }

    this.currentPredictionSessionId.set(pred.sessionId || currentSessionId || null);

    if (pred.podium && pred.podium.length >= 3) {
      this.p1DriverId.set(pred.podium[0] || '');
      this.p2DriverId.set(pred.podium[1] || '');
      this.p3DriverId.set(pred.podium[2] || '');
    } else {
      this.p1DriverId.set('');
      this.p2DriverId.set('');
      this.p3DriverId.set('');
    }

    this.poleDriverId.set(pred.polePositionDriverId || '');
    this.duelWinnerId.set(pred.duelDriverPick || '');
    this.safetyCars.set(pred.safetyCarCount != null ? pred.safetyCarCount : 0);
    this.dnfs.set(pred.dnfCount != null ? pred.dnfCount : 0);

    if (pred.predictionId || pred.submittedAt || (pred.podium && pred.podium.length > 0)) {
      this.hasExistingPrediction.set(true);
      this.predictionSubmittedAt.set(pred.submittedAt || null);
    } else {
      this.hasExistingPrediction.set(false);
      this.predictionSubmittedAt.set(null);
    }
  }

  private loadCurrentPrediction(sessionId?: string) {
    if (!this.auth.authenticated()) {
      return;
    }
    const targetSessionId = sessionId || this.session()?.id;
    const request$ = targetSessionId
      ? this.api.predictionForSession(targetSessionId, this.auth.username())
      : this.api.currentPrediction(this.auth.username());

    request$.subscribe({
      next: (pred) => {
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          if (targetSessionId && pred.sessionId && pred.sessionId !== targetSessionId) {
            this.clearPredictionState();
            return;
          }
          this.applyPredictionToState(pred);
        } else {
          this.clearPredictionState();
        }
      },
      error: () => {
        const cached = this.api.getCachedPrediction?.(this.auth.username(), targetSessionId);
        if (cached && (cached.predictionId || (cached.podium && cached.podium.length > 0))) {
          this.applyPredictionToState(cached);
        } else {
          this.clearPredictionState();
        }
      }
    });
  }

  private loadUserLeagues() {
    if (!this.auth.authenticated()) {
      return;
    }
    this.api.leagues(this.auth.username()).subscribe({
      next: (leagues) => {
        this.myLeagues.set(leagues);
        if (leagues.length > 0) {
          const current = this.selectedLeague();
          const match = current ? leagues.find(l => l.id === current.id) : null;
          this.selectLeague(match || leagues[0]);
        }
      },
      error: () => {
        if (!this.myLeagues().length) {
          this.myLeagues.set([]);
        }
      }
    });
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.showLeaguePassword.set(false);
    this.isEditingLeague.set(false);
    this.api.leagueLeaderboard(league.id).subscribe({
      next: (lb) => {
        this.leagueLeaderboard.set(lb);
      },
      error: () => {
        this.leagueLeaderboard.set([]);
      }
    });
  }

  loadGlobalLeaderboard() {
    if (!this.auth.authenticated()) {
      this.isLoadingGlobalLeaderboard.set(false);
      return;
    }
    this.isLoadingGlobalLeaderboard.set(true);
    this.globalLeaderboardError.set(null);
    this.api.globalLeaderboard().subscribe({
      next: (lb) => {
        this.globalLeaderboard.set(lb || []);
        this.isLoadingGlobalLeaderboard.set(false);
        const myName = this.auth.username()?.trim().toLowerCase();
        if (myName) {
          const list = lb || [];
          const me = list.find(u => u.displayName.trim().toLowerCase() === myName)
            || list.find(u => u.displayName.trim().toLowerCase().includes(myName));
          if (me) {
            this.auth.userPoints.set(me.totalScore);
          }
        }
      },
      error: () => {
        this.isLoadingGlobalLeaderboard.set(false);
        if (this.globalLeaderboard().length === 0) {
          this.globalLeaderboardError.set(
            'El servidor backend se encuentra reiniciándose o conectando tras la última actualización.'
          );
        }
      }
    });
  }

  private loadHistory() {
    if (!this.auth.authenticated()) {
      return;
    }
    this.isLoadingHistory.set(true);
    this.api.predictionHistory(this.auth.username()).subscribe({
      next: (items) => {
        this.historyItems.set(items || []);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  incrementSC() {
    if (this.isLocked()) return;
    if (this.safetyCars() < 10) this.safetyCars.update(v => v + 1);
  }

  decrementSC() {
    if (this.isLocked()) return;
    if (this.safetyCars() > 0) this.safetyCars.update(v => v - 1);
  }

  incrementDNFs() {
    if (this.isLocked()) return;
    if (this.dnfs() < 20) this.dnfs.update(v => v + 1);
  }

  decrementDNFs() {
    if (this.isLocked()) return;
    if (this.dnfs() > 0) this.dnfs.update(v => v - 1);
  }

  getDriver(id?: string | null): F1Driver | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return F1_DRIVERS.find(d => d.id.toLowerCase() === clean || d.code.toLowerCase() === clean);
  }

  openDriverPicker(slot: 'p1' | 'p2' | 'p3' | 'pole') {
    if (this.isLocked()) return;
    this.pickerSlot.set(slot);
    this.pickerSearch.set('');
    this.isPickerOpen.set(true);
  }

  closeDriverPicker() {
    this.isPickerOpen.set(false);
  }

  getPickerTitle(): string {
    switch (this.pickerSlot()) {
      case 'p1': return 'Seleccionar Ganador P1';
      case 'p2': return 'Seleccionar 2° Lugar P2';
      case 'p3': return 'Seleccionar 3° Lugar P3';
      case 'pole': return 'Seleccionar Pole Position';
    }
  }

  isCurrentInSlot(driverId: string): boolean {
    const slot = this.pickerSlot();
    if (slot === 'p1') return this.p1DriverId() === driverId;
    if (slot === 'p2') return this.p2DriverId() === driverId;
    if (slot === 'p3') return this.p3DriverId() === driverId;
    if (slot === 'pole') return this.poleDriverId() === driverId;
    return false;
  }

  getDriverSlotName(driverId: string): string | null {
    if (this.p1DriverId() === driverId) return 'P1 Ganador';
    if (this.p2DriverId() === driverId) return 'P2 Segundo';
    if (this.p3DriverId() === driverId) return 'P3 Tercero';
    return null;
  }

  isDriverInAnotherSlot(driverId: string): boolean {
    const slot = this.pickerSlot();
    if (slot === 'pole') return false;
    if (slot === 'p1') return this.p2DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p2') return this.p1DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p3') return this.p1DriverId() === driverId || this.p2DriverId() === driverId;
    return false;
  }

  toggleDuelWinner(driverId: string) {
    if (this.isLocked()) return;
    if (this.duelWinnerId() === driverId) {
      this.duelWinnerId.set('');
    } else {
      this.duelWinnerId.set(driverId);
    }
  }

  selectDriver(slot: 'p1' | 'p2' | 'p3' | 'pole', driverId: string) {
    if (this.isLocked()) return;

    if (!driverId) {
      if (slot === 'pole') this.poleDriverId.set('');
      else if (slot === 'p1') this.p1DriverId.set('');
      else if (slot === 'p2') this.p2DriverId.set('');
      else if (slot === 'p3') this.p3DriverId.set('');
      this.closeDriverPicker();
      return;
    }

    if (slot === 'pole') {
      this.poleDriverId.set(driverId);
      this.closeDriverPicker();
      return;
    }

    const currentP1 = this.p1DriverId();
    const currentP2 = this.p2DriverId();
    const currentP3 = this.p3DriverId();

    if (slot === 'p1') {
      if (currentP2 === driverId) {
        this.p2DriverId.set(currentP1);
      } else if (currentP3 === driverId) {
        this.p3DriverId.set(currentP1);
      }
      this.p1DriverId.set(driverId);
    } else if (slot === 'p2') {
      if (currentP1 === driverId) {
        this.p1DriverId.set(currentP2);
      } else if (currentP3 === driverId) {
        this.p3DriverId.set(currentP2);
      }
      this.p2DriverId.set(driverId);
    } else if (slot === 'p3') {
      if (currentP1 === driverId) {
        this.p1DriverId.set(currentP3);
      } else if (currentP2 === driverId) {
        this.p2DriverId.set(currentP3);
      }
      this.p3DriverId.set(driverId);
    }

    this.closeDriverPicker();
  }

  getDriverName(id?: string | null | any): string {
    if (!id) return 'Sin selección';
    if (typeof id === 'object' && id !== null) {
      id = id.id || id.name || id.code || '';
    }
    const rawId = String(id).trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') return 'Sin selección';
    const aliasMap: Record<string, string> = {
      max_verstappen: 'verstappen',
      arvid_lindblad: 'lindblad',
      sergio_perez: 'perez',
      carlos_sainz: 'sainz',
      nico_hulkenberg: 'hulkenberg',
      kimi_antonelli: 'antonelli',
    };
    const cleanId = aliasMap[rawId.toLowerCase()] || rawId;
    const found = F1_DRIVERS.find(d => d.id.toLowerCase() === cleanId.toLowerCase() || d.code.toLowerCase() === cleanId.toLowerCase());
    return found ? `${found.name} (${found.team})` : rawId;
  }

  isPodiumHit(item: PredictionHistoryItem, index: number): boolean {
    if (!item?.podium?.[index] || !item?.officialResults?.podium?.[index]) return false;
    return item.podium[index].trim().toLowerCase() === item.officialResults.podium[index].trim().toLowerCase();
  }

  isPoleHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.poleHit != null) return item.scoreBreakdown.poleHit;
    if (!item?.polePositionDriverId || !item?.officialResults?.polePositionDriverId) return false;
    return item.polePositionDriverId.trim().toLowerCase() === item.officialResults.polePositionDriverId.trim().toLowerCase();
  }

  isDuelHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.duelHit != null) return item.scoreBreakdown.duelHit;
    if (!item?.duelDriverPick || !item?.officialResults?.duelWinnerId) return false;
    return item.duelDriverPick.trim().toLowerCase() === item.officialResults.duelWinnerId.trim().toLowerCase();
  }

  isSafetyCarHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.safetyCarHit != null) return item.scoreBreakdown.safetyCarHit;
    if (item?.safetyCarCount == null || item?.officialResults?.safetyCarCount == null) return false;
    return Number(item.safetyCarCount) === Number(item.officialResults.safetyCarCount);
  }

  isDnfHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.dnfHit != null) return item.scoreBreakdown.dnfHit;
    if (item?.dnfCount == null || item?.officialResults?.dnfCount == null) return false;
    return Number(item.dnfCount) === Number(item.officialResults.dnfCount);
  }

  handleModalDriverSelected(event: { slot: PodiumSlot; driverId: string }) {
    this.selectDriver(event.slot, event.driverId);
  }

  handleSavePodium(podium: PodiumSelection) {
    this.p1DriverId.set(podium.p1);
    this.p2DriverId.set(podium.p2);
    this.p3DriverId.set(podium.p3);
    this.savePrediction();
  }

  savePrediction() {
    if (this.isPodiumDuplicate()) {
      this.saveError.set('No podés repetir pilotos en el podio.');
      return;
    }
    if (this.isSaving() || this.isLocked()) return;

    const sess = this.session();
    const sessionId = sess?.id || 'next';

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    const hasAnyPodium = !!(this.p1DriverId() || this.p2DriverId() || this.p3DriverId());
    const payload = {
      podium: hasAnyPodium
        ? [this.p1DriverId() || '', this.p2DriverId() || '', this.p3DriverId() || '']
        : [],
      polePositionDriverId: this.poleDriverId() || null,
      duelDriverPick: this.duelWinnerId() || null,
      safetyCarCount: this.safetyCars(),
      dnfCount: this.dnfs()
    };

    this.api.submitPrediction(sessionId, payload, this.auth.username()).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.hasExistingPrediction.set(true);
        this.currentPredictionSessionId.set(sessionId);
        this.predictionSubmittedAt.set(res?.submittedAt || new Date().toISOString());
        this.api.setCachedPrediction?.({
          ...res,
          sessionId,
          podium: payload.podium,
          polePositionDriverId: payload.polePositionDriverId,
          duelDriverPick: payload.duelDriverPick,
          safetyCarCount: payload.safetyCarCount,
          dnfCount: payload.dnfCount
        }, this.auth.username());
        this.loadHistory();
        this.loadGlobalLeaderboard();
        if (this.selectedLeague()) {
          this.selectLeague(this.selectedLeague()!);
        }
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        if (err.status === 502 || err.status === 504) {
          this.saveError.set('Los servidores de telemetría tardaron en responder debido al arranque inicial. Volvé a presionar "Guardar Pronóstico" ahora que el canal ya está abierto.');
        } else if (err.status === 401) {
          this.saveError.set('Tu sesión ha expirado o no estás autenticado. Por favor, iniciá sesión nuevamente para registrar tu pronóstico.');
        } else if (err.status === 403 || err.status === 423) {
          this.saveError.set(err.error?.description || 'Las predicciones para esta sesión se encuentran cerradas.');
        } else {
          this.saveError.set(err.error?.description || err.error?.message || 'Error al persistir el pronóstico en la base de datos.');
        }
      }
    });
  }

  getInviteUrl(code?: string): string {
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dacs-nine.vercel.app';
    return `${origin}/join/${code}`;
  }

  copyInviteUrl() {
    const code = this.selectedLeague()?.inviteCode;
    if (!code) return;
    const url = this.getInviteUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  toggleLeaguePasswordVisibility() {
    this.showLeaguePassword.update((v) => !v);
  }

  getLeaguePassword(league?: League | null): string {
    if (!league) return '';
    return league.password || '';
  }

  copyLeaguePassword() {
    const pwd = this.getLeaguePassword(this.selectedLeague());
    if (!pwd) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copyPasswordSuccess.set(true);
        setTimeout(() => this.copyPasswordSuccess.set(false), 2000);
      }).catch(() => { });
    }
  }

  startEditingLeague() {
    const league = this.selectedLeague();
    if (!league || !this.isSelectedLeagueOwner()) return;
    this.editLeagueName = league.name || '';
    this.editLeagueDescription = league.description || '';
    this.editLeaguePassword = '';
    this.leagueError.set('');
    this.leagueSuccess.set('');
    this.isEditingLeague.set(true);
  }

  cancelEditingLeague() {
    this.isEditingLeague.set(false);
    this.editLeaguePassword = '';
  }

  saveLeagueEdit() {
    const league = this.selectedLeague();
    const name = this.editLeagueName.trim();
    if (!league || !name || this.isSavingLeagueEdit()) return;

    this.isSavingLeagueEdit.set(true);
    this.leagueError.set('');
    this.leagueSuccess.set('');

    const desc = this.editLeagueDescription.trim() || undefined;
    const pwd = this.editLeaguePassword.trim() || undefined;

    this.api.editLeague(league.id, name, desc, pwd).subscribe({
      next: (updated) => {
        this.isSavingLeagueEdit.set(false);
        this.isEditingLeague.set(false);
        if (pwd) {
          updated.password = pwd;
        }
        this.myLeagues.update((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        this.selectedLeague.set(updated);
        this.editLeaguePassword = '';
        this.leagueSuccess.set(`Liga "${updated.name}" actualizada correctamente.`);
        setTimeout(() => this.leagueSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isSavingLeagueEdit.set(false);
        this.leagueError.set(
          err.error?.message || err.error?.description || 'No se pudo actualizar la liga.'
        );
      }
    });
  }

  createLeague() {
    const name = this.newLeagueName.trim();
    if (!name || this.isCreatingLeague()) return;

    this.isCreatingLeague.set(true);
    this.leagueError.set('');
    this.leagueSuccess.set('');

    const desc = this.newLeagueDescription.trim() || undefined;
    const pwd = this.newLeaguePassword.trim() || undefined;

    this.api.createLeague(name, desc, pwd).subscribe({
      next: (created) => {
        this.isCreatingLeague.set(false);
        if (pwd) {
          created.password = pwd;
        }
        this.myLeagues.update((prev) => [created, ...prev]);
        this.selectLeague(created);
        this.newLeagueName = '';
        this.newLeagueDescription = '';
        this.newLeaguePassword = '';
        this.leagueSuccess.set(`¡Liga "${created.name}" creada y persistida con éxito en la base de datos!`);
        this.leagueSubTab.set('list');
        setTimeout(() => this.leagueSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isCreatingLeague.set(false);
        this.leagueError.set(err.error?.message || err.error?.description || 'No se pudo crear la liga.');
      }
    });
  }

  joinLeague() {
    let raw = this.joinCode.trim();
    if (!raw || this.isJoiningLeague()) return;

    if (raw.includes('/join/')) {
      raw = raw.substring(raw.lastIndexOf('/join/') + 6);
    }
    if (raw.includes('/')) {
      raw = raw.substring(raw.lastIndexOf('/') + 1);
    }
    const inviteCode = raw.trim();
    const pwd = this.joinPassword.trim() || undefined;

    this.isJoiningLeague.set(true);
    this.leagueError.set('');
    this.leagueSuccess.set('');

    this.api.joinLeague(inviteCode, pwd).subscribe({
      next: (joined) => {
        this.isJoiningLeague.set(false);
        if (pwd) {
          joined.password = pwd;
        }
        this.loadUserLeagues();
        this.selectLeague(joined);
        this.joinCode = '';
        this.joinPassword = '';
        this.leagueSuccess.set(`¡Te uniste con éxito a la liga "${joined.name}"!`);
        this.leagueSubTab.set('list');
        setTimeout(() => this.leagueSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isJoiningLeague.set(false);
        this.leagueError.set(err.error?.message || err.error?.description || 'Código o link no válido o contraseña incorrecta.');
      }
    });
  }
}
