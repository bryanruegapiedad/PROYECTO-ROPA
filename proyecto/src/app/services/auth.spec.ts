import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allow demo admin login when the backend is unavailable', (done) => {
    service.login('admin', '1234').subscribe({
      next: response => {
        expect(response.token).toBeTruthy();
        expect(response.rol).toBe('admin');
        expect(localStorage.getItem('inventario_token')).toBeTruthy();
        done();
      },
      error: () => done.fail('Demo login should succeed without the backend')
    });
  });
});