import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideCharts } from 'ng2-charts';

import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Fait remonter en haut à chaque navigation
        anchorScrolling: 'enabled', // Optionnel : permet le scroll vers les ancres
      }),
    ),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideToastr(),
    provideCharts(),
  ],
};
