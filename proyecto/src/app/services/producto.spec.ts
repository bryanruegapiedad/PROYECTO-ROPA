import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ProductoService } from './producto';

describe('ProductoService', () => {
  let service: ProductoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ProductoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return demo products when the backend is unavailable', (done) => {
    service.listar().subscribe({
      next: productos => {
        expect(productos.length).toBeGreaterThan(0);
        expect(productos[0].imagen).toContain('https://');
        done();
      },
      error: () => done.fail('Fallback demo products should be returned without backend')
    });
  });
});