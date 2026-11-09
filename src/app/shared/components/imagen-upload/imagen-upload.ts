import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { mensajeError } from '../../../core/utils/http-error';
import { Icon } from '../icono/icono';

@Component({
  selector: 'app-imagen-upload',
  imports: [Icon],
  template: `
    <section class="image-editor" aria-label="Fotografía">
      @if (vista(); as url) {
        <img [src]="url" alt="Fotografía del registro" (error)="fallida.set(true)" />
      } @else {
        <span class="image-placeholder"><app-icon [name]="tipo() === 'habitaciones' ? 'bed' : 'box'" /></span>
      }
      <div class="image-controls">
        <label class="field" [for]="campoId()">Fotografía (opcional)
          <input [id]="campoId()" type="file" accept="image/png,image/jpeg" [disabled]="ocupado() || bloqueado()" (change)="seleccionar($event)" />
        </label>
        <p class="muted">PNG o JPG, hasta 5 MB y 4096 píxeles por lado.</p>
        @if (ocupado()) { <p role="status">Guardando fotografía…</p> }
        @if (error()) { <p class="image-error" role="alert">{{ error() }}</p> }
        @if (actual() && !confirmando()) {
          <button type="button" class="text-button" [disabled]="ocupado() || bloqueado()" (click)="confirmando.set(true)">Quitar fotografía</button>
        }
        @if (confirmando()) {
          <div class="remove-confirmation">
            <p>¿Quitar la fotografía de este registro?</p>
            <button type="button" class="button small" [disabled]="ocupado()" (click)="confirmando.set(false)">Cancelar</button>
            <button type="button" class="button small danger" [disabled]="ocupado()" (click)="quitar()">Quitar fotografía</button>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .image-editor { display:flex; gap:16px; align-items:center; padding:16px; border:1px solid var(--line); border-radius:10px; margin-top:18px; }
    img,.image-placeholder { width:120px; height:95px; border-radius:8px; object-fit:cover; flex-shrink:0; }
    .image-placeholder { display:grid; place-items:center; background:var(--canvas); color:var(--azul); }
    .image-controls { flex:1; min-width:0; } input { max-width:100%; } .muted { font-size:12px; margin:8px 0; }
    .image-error { color:var(--rojo); font-size:13px; } .remove-confirmation { display:flex; gap:8px; flex-wrap:wrap; align-items:center; } .remove-confirmation p { width:100%; }
    @media(max-width:550px) { .image-editor { align-items:stretch; flex-direction:column; } }
  `,
})
export class ImagenUpload {
  tipo = input.required<'habitaciones' | 'productos'>();
  id = input.required<number>();
  ruta = input<string | null | undefined>(null);
  bloqueado = input(false);
  cambiada = output<string | null>();
  private readonly http = inject(HttpClient);
  private local = signal<string | null | undefined>(undefined);
  ocupado = signal(false);
  error = signal('');
  confirmando = signal(false);
  fallida = signal(false);
  private version = signal(Date.now());
  actual = computed(() => this.local() === undefined ? this.ruta() : this.local());
  campoId = computed(() => `imagen-${this.tipo()}-${this.id()}`);
  vista = computed(() => {
    const ruta = this.actual();
    return ruta && !this.fallida() ? `${ruta}${ruta.includes('?') ? '&' : '?'}v=${this.version()}` : null;
  });

  constructor() {
    effect(() => {
      this.id(); this.tipo();
      this.local.set(undefined); this.fallida.set(false); this.confirmando.set(false);
    });
  }

  seleccionar(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || this.ocupado() || this.bloqueado()) return;
    this.error.set('');
    if (!['image/png', 'image/jpeg'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      this.error.set('Selecciona una imagen PNG o JPG de hasta 5 MB.');
      input.value = '';
      return;
    }
    const datos = new FormData();
    datos.append('archivo', archivo);
    this.ocupado.set(true);
    this.http.post<{ ruta: string }>(`${environment.apiUrl}/imagenes/${this.tipo()}/${this.id()}`, datos).subscribe({
      next: r => {
        this.local.set(r.ruta); this.version.set(Date.now()); this.fallida.set(false);
        this.ocupado.set(false); input.value = ''; this.cambiada.emit(r.ruta);
      },
      error: e => { this.error.set(mensajeError(e)); this.ocupado.set(false); input.value = ''; },
    });
  }

  quitar() {
    if (this.ocupado() || this.bloqueado()) return;
    this.error.set(''); this.ocupado.set(true);
    this.http.delete<void>(`${environment.apiUrl}/imagenes/${this.tipo()}/${this.id()}`).subscribe({
      next: () => {
        this.local.set(null); this.fallida.set(false); this.confirmando.set(false);
        this.ocupado.set(false); this.cambiada.emit(null);
      },
      error: e => { this.error.set(mensajeError(e)); this.ocupado.set(false); },
    });
  }
}
