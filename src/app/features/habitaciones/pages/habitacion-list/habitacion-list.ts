import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import { Habitacion, Bloque } from '../../models/habitacion.model';
import { fechaLocal } from '../../../../core/utils/fechas';
import { mensajeError } from '../../../../core/utils/http-error';
import { Icon } from '../../../../shared/components/icono/icono';
import { HabitacionService } from '../../services/habitacion-service';
import { OcupacionDialog } from '../../components/ocupacion-dialog/ocupacion-dialog';

import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-habitaciones',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    Icon,
    DialogFocus,
    OcupacionDialog,
  ],
  templateUrl: './habitacion-list.html',
  styleUrl: './habitacion-list.css',
})
export class HabitacionList {
  private readonly habitacionService = inject(HabitacionService);
  rooms = signal<Habitacion[]>([]);
  desde = signal(fechaLocal(new Date()));
  piso = signal('todos');
  cargando = signal(true);
  error = signal('');
  detalle = signal<Habitacion | null>(null);
  configurando = signal<Habitacion | null>(null);
  abrirOcupacion(room: Habitacion) {
    this.detalle.set(null);
    this.configurando.set(room);
  }
  ocupacionGuardada() {
    this.configurando.set(null);
    this.cargar();
  }
  inicio = computed(() => new Date(this.desde() + 'T00:00:00'));
  dias = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.inicio());
      d.setDate(d.getDate() + i);
      return d;
    }),
  );
  pisos = computed(() =>
    [...new Set(this.rooms().map((r) => this.roomFloor(r.numero)))].sort(),
  );
  filtradas = computed(() =>
    this.rooms().filter(
      (r) =>
        this.piso() === 'todos' || this.roomFloor(r.numero) === this.piso(),
    ),
  );
  disponibles = computed(() => this.rooms().filter((r) => r.disponible).length);
  conReservas = computed(
    () => this.rooms().filter((r) => r.reservas.length).length,
  );
  bloqueadas = computed(
    () =>
      this.rooms().filter((r) =>
        ['MANTENIMIENTO', 'LIMPIEZA'].includes(r.estado),
      ).length,
  );
  constructor() {
    this.cargar();
  }
  cargar() {
    this.error.set('');
    this.cargando.set(true);
    const end = new Date(this.inicio());
    end.setDate(end.getDate() + 7);
    this.habitacionService.listar(this.desde(), fechaLocal(end)).subscribe({
      next: (r) => {
        this.rooms.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  cambiar(date: string) {
    if (date) {
      this.desde.set(date);
      this.cargar();
    }
  }
  mover(n: number) {
    const d = new Date(this.inicio());
    d.setDate(d.getDate() + n);
    this.cambiar(fechaLocal(d));
  }
  hoy() {
    this.cambiar(fechaLocal(new Date()));
  }
  esHoy(d: Date) {
    return fechaLocal(d) === fechaLocal(new Date());
  }
  cantidadPiso(piso: string) {
    return this.rooms().filter((room) => this.roomFloor(room.numero) === piso)
      .length;
  }
  roomFloor(number: string) {
    return /^\d{3,}$/.test(number) ? number.slice(0, -2) : '—';
  }
  estadoTexto(s: string) {
    return (
      (
        {
          DISPONIBLE: 'Disponible',
          OCUPADO: 'Ocupado',
          MANTENIMIENTO: 'Mantenimiento',
          LIMPIEZA: 'Limpieza',
        } as Record<string, string>
      )[s] || s
    );
  }
  posicion(b: Bloque) {
    const start = this.inicio().getTime(),
      end = start + 7 * 86400000;
    const a = Math.max(start, new Date(b.ingreso).getTime()),
      z = Math.min(end, new Date(b.salida).getTime());
    return {
      left: ((a - start) / (end - start)) * 100,
      width: Math.max(0, ((z - a) / (end - start)) * 100),
    };
  }
}
