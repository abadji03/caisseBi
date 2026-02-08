import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideCharts } from 'ng2-charts';

import { importProvidersFrom } from '@angular/core';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

import { provideToastr } from 'ngx-toastr';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AuthService } from './services/auth.service';

export function initAuthFactory(auth: AuthService) {
  return () => auth.initAuth(); // renvoie une Promise
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Fait remonter en haut à chaque navigation
        anchorScrolling: 'enabled', // Optionnel : permet le scroll vers les ancres
      }),
    ),
    provideHttpClient(
      withInterceptors([AuthInterceptor])
    ),

   /*  {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
 */
    //INITIALISATION AUTH AVANT LE ROUTER
    {
      provide: APP_INITIALIZER,
      useFactory: initAuthFactory,
      deps: [AuthService],
      multi: true,
    },

    provideAnimationsAsync(),
    provideToastr(),
    provideCharts(),

    { provide: JWT_OPTIONS, useValue: {} },
    JwtHelperService,

    importProvidersFrom(
      LoggerModule.forRoot({
        level: NgxLoggerLevel.DEBUG,
        serverLogLevel: NgxLoggerLevel.ERROR,
        serverLoggingUrl: 'http://localhost:5000/api/logs',
        disableConsoleLogging: false,
      })
    ),
  ],
};
