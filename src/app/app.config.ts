import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideHttpClient,withInterceptors } from '@angular/common/http';
import { sesionInterceptor } from './core/services/sesion-interceptor';
import { proteccionSesionInterceptor } from './core/services/proteccion-sesion-interceptor';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([sesionInterceptor, proteccionSesionInterceptor])),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: LOCALE_ID, useValue: 'es-PE' },
  ],
};
