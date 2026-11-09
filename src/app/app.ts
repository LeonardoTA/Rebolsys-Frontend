import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificacionService } from './core/services/notificacion.service';
import { Icon } from './shared/components/icono/icono';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly avisos = inject(NotificacionService);
}
