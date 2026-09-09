import { HttpErrorResponse, HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { ApiError, handleApiError, toApiError } from './api-error';
import { Injectable, inject } from '@angular/core';

describe('ApiError / handleApiError', () => {
  const fakeLogger = { error: jasmine.createSpy('error') };

  beforeEach(() => {
    fakeLogger.error.calls.reset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('conserve le statut HTTP et le message backend', () => {
    const httpError = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      url: '/api/clients',
      error: { message: 'Client déjà existant' },
    });

    const apiError = toApiError(httpError);

    expect(apiError instanceof ApiError).toBeTrue();
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe('Client déjà existant');
    expect(apiError.details).toEqual({ message: 'Client déjà existant' });
  });

  it('ne transforme pas une ApiError déjà normalisée', () => {
    const original = new ApiError('déjà là', { status: 404 });
    expect(toApiError(original)).toBe(original);
  });

  it('retourne une erreur réseau identifiable (status 0)', () => {
    const err = toApiError(new HttpErrorResponse({ status: 0 }));
    expect(err.isNetworkError).toBeTrue();
  });

  it('handleApiError logge puis relance une ApiError', async () => {
    const source$ = throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Boom' } }));

    try {
      await firstValueFrom(source$.pipe(catchError((err: unknown) => handleApiError(fakeLogger as unknown as NGXLogger, 'TestService.test', err))));
      fail('devait échouer');
    } catch (e) {
      expect(e instanceof ApiError).toBeTrue();
      expect((e as ApiError).status).toBe(500);
      expect((e as ApiError).message).toBe('Boom');
      expect(fakeLogger.error).toHaveBeenCalledWith('[TestService.test]', jasmine.objectContaining({ status: 500 }));
    }
  });

  it('s\'intègre dans un service HTTP réel (pipe catchError)', async () => {
    @Injectable({ providedIn: 'root' })
    class DummyService {
      private http = inject(HttpClient);
      load() {
        return this.http.get<{ message: string }>('/api/dummy').pipe(
          catchError((err: unknown) => handleApiError(fakeLogger as unknown as NGXLogger, 'DummyService.load', err))
        );
      }
    }

    const ctrl = TestBed.inject(HttpTestingController as never) as HttpTestingController;
    const service = TestBed.inject(DummyService);
    const promise = firstValueFrom(service.load());

    const req = ctrl.expectOne('/api/dummy');
    req.flush({ message: 'Ressource introuvable' }, { status: 404, statusText: 'Not Found' });

    try {
      await promise;
      fail('devait échouer');
    } catch (e) {
      expect(e instanceof ApiError).toBeTrue();
      expect((e as ApiError).status).toBe(404);
      expect((e as ApiError).message).toBe('Ressource introuvable');
    }
    ctrl.verify();
  });

  it('retombe sur un message générique si le corps est illisible', () => {
    const err = toApiError(new HttpErrorResponse({ status: 500, error: { foo: 1 } }));
    expect(err.status).toBe(500);
    expect(err.message).toContain('500'); // message HttpErrorResponse par défaut
  });
});
