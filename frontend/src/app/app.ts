import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';

@Component({
  standalone: true,
  imports: [RouterModule, RouterOutlet, SnackbarComponent, LoadingBarComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  title = 'web';
}
