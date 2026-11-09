import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  actual = signal<{ texto: string; error: boolean } | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  mostrar(texto: string, error = false): void {
    clearTimeout(this.timer);
    this.actual.set({ texto, error });
    this.timer = setTimeout(() => this.actual.set(null), 6000);
  }
}
