import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  standalone: true,
  imports: [RouterModule, RouterOutlet, SnackbarComponent, ConfirmDialogComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  title = 'web';
}
