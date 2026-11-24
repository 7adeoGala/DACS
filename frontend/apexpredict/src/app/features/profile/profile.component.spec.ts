import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProfileComponent } from './profile.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';

describe('ProfileComponent', () => {
  function createSetup() {
    const apiStub = {
      getProfile: vi.fn(() =>
        of({
          id: 'u1',
          displayName: 'LauuGrego',
          email: 'lauu@example.com',
          firstName: 'Lautaro',
          lastName: 'Grego',
          country: 'Argentina',
          bio: 'Prode F1',
          favoriteTeamId: 'alpine',
          favoriteDriverId: 'colapinto',
          notificationsEnabled: true,
          totalScore: 25,
          predictionsCount: 2,
        })
      ),
      updateProfile: vi.fn((payload: any) => of({ id: 'u1', ...payload })),
      changePassword: vi.fn(() => of({ status: 'SUCCESS', message: 'Contraseña actualizada correctamente.' })),
      checkDisplayName: vi.fn(() => of({ available: true, name: 'NuevoAlias' })),
      setCachedProfile: vi.fn(),
    };
    const authStub = {
      username: signal('LauuGrego'),
      authenticated: signal(true),
    };

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiStub },
        { provide: AuthService, useValue: authStub },
      ],
    });

    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return { fixture, comp: fixture.componentInstance, apiStub };
  }

  it('carga todos los campos del usuario y permite actualizarlos desde la app', () => {
    const { comp, apiStub } = createSetup();

    expect(comp.displayName).toBe('LauuGrego');
    expect(comp.firstName).toBe('Lautaro');
    expect(comp.email).toBe('lauu@example.com');

    comp.firstName = 'Lauta';
    comp.lastName = 'G.';
    comp.country = 'Argentina';
    comp.bio = 'Fanatico de F1';
    comp.email = 'nuevo@example.com';
    comp.saveProfile();

    expect(apiStub.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'LauuGrego',
        firstName: 'Lauta',
        lastName: 'G.',
        email: 'nuevo@example.com',
        country: 'Argentina',
        bio: 'Fanatico de F1',
      })
    );
    expect(comp.profileSuccess()).toContain('actualizaron correctamente');
  });

  it('valida coincidencia de contrasenas y envia cambio sin salir a Keycloak', () => {
    const { comp, apiStub } = createSetup();

    comp.currentPassword = 'oldpass';
    comp.newPassword = 'newpass123';
    comp.confirmPassword = 'otra';
    comp.savePassword();
    expect(apiStub.changePassword).not.toHaveBeenCalled();
    expect(comp.passwordError()).toContain('no coinciden');

    comp.confirmPassword = 'newpass123';
    comp.savePassword();
    expect(apiStub.changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldpass',
      newPassword: 'newpass123',
    });
    expect(comp.passwordSuccess()).toContain('actualizada correctamente');
  });

  it('muestra el error del servidor cuando la contrasena actual es incorrecta', () => {
    const { comp, apiStub } = createSetup();
    apiStub.changePassword.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'La contraseña actual es incorrecta.' } }))
    );

    comp.currentPassword = 'wrong';
    comp.newPassword = 'newpass123';
    comp.confirmPassword = 'newpass123';
    comp.savePassword();

    expect(comp.passwordError()).toContain('incorrecta');
  });
});
