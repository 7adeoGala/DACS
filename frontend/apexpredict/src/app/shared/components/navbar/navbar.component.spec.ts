import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationItem } from '../../../core/models/api.models';

describe('NavbarComponent (notificaciones)', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;

  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      type: 'RACE_REMINDER',
      channel: 'PUSH',
      title: 'Recordatorio GP Qatar',
      message: 'Falta poco para el Lock Time.',
      status: 'SENT',
      sentAt: '2026-11-24T18:00:00Z',
      read: false,
      readAt: null
    },
    {
      id: 'notif-2',
      type: 'RACE_REMINDER',
      channel: 'PUSH',
      title: 'Recordatorio GP Las Vegas',
      message: 'Ya fue leído.',
      status: 'SENT',
      sentAt: '2026-11-21T18:00:00Z',
      read: true,
      readAt: '2026-11-21T19:00:00Z'
    }
  ];

  const apiMock = {
    profileUpdated: signal(null),
    getCachedProfile: vi.fn(() => null),
    setCachedProfile: vi.fn(),
    getProfile: vi.fn(() => of({ id: 'u1', displayName: 'Piloto', email: 'p@test.com', notificationsEnabled: true })),
    notifications: vi.fn(() => of(sampleNotifications)),
    markNotificationAsRead: vi.fn((id: string) =>
      of({ ...sampleNotifications[0], id, read: true, readAt: '2026-11-24T18:30:00Z' })
    ),
    markAllNotificationsAsRead: vi.fn(() => of({ updated: 1, status: 'SUCCESS' })),
    dismissNotification: vi.fn(() => of(undefined)),
    dismissAllNotifications: vi.fn(() => of({ dismissed: 2, status: 'SUCCESS' }))
  };

  const authMock = {
    authenticated: signal(true),
    username: signal('Piloto'),
    userPoints: signal(15),
    isAuthenticated: () => true,
    hasRole: () => false,
    logout: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cuenta solo las notificaciones no leidas en el badge y permite marcar como leida', () => {
    expect(component.notificationsList().length).toBe(2);
    expect(component.unreadNotificationsCount()).toBe(1);

    component.markNotificationAsRead(component.notificationsList()[0]);

    expect(apiMock.markNotificationAsRead).toHaveBeenCalledWith('notif-1');
    expect(component.unreadNotificationsCount()).toBe(0);
    expect(component.notificationsList()[0].read).toBe(true);
  });

  it('permite marcar todas como leidas y eliminar notificaciones de la vista', () => {
    component.markAllNotificationsAsRead();
    expect(apiMock.markAllNotificationsAsRead).toHaveBeenCalled();
    expect(component.unreadNotificationsCount()).toBe(0);

    component.dismissNotification(component.notificationsList()[0]);
    expect(apiMock.dismissNotification).toHaveBeenCalledWith('notif-1');
    expect(component.notificationsList().length).toBe(1);

    component.dismissAllNotifications();
    expect(apiMock.dismissAllNotifications).toHaveBeenCalled();
    expect(component.notificationsList().length).toBe(0);
  });
});
