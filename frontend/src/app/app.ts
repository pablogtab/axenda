import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/components/snackbar.component';
import { LoadingBarComponent } from './shared/components/loading-bar.component';

@Component({
  standalone: true,
  imports: [RouterModule, RouterOutlet, SnackbarComponent, LoadingBarComponent],
  selector: 'app-root',
  template: `
    <app-loading-bar></app-loading-bar>
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `,
})
export class AppComponent {
  title = 'web';
}
