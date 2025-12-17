import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Remove the loader once Angular has bootstrapped
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('hidden');
      // Remove from DOM after transition completes
      setTimeout(() => loader.remove(), 300);
    }
  })
  .catch((err) => console.error(err));
