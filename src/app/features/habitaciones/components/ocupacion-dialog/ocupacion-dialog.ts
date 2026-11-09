import {
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Habitacion } from '../../models/habitacion.model';
import { HabitacionService } from '../../services/habitacion-service';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import { Icon } from '../../../../shared/components/icono/icono';
import { mensajeError } from '../../../../core/utils/http-error';

@Component({
  selector: 'app-ocupacion-dialog',
  imports: [ReactiveFormsModule, DialogFocus, Icon],
  templateUrl: './ocupacion-dialog.html',
  styleUrl: './ocupacion-dialog.css',
})
export class OcupacionDialog implements OnInit {
  habitacion = input.required<Habitacion>();
  cerrar = output<void>();
  guardado = output<void>();
  private servicio = inject(HabitacionService);
  private fb = inject(FormBuilder);
  guardando = signal(false);
  error = signal('');
  form = this.fb.nonNullable.group({
    capacidadPersonas: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(99),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    plazasCama: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(99),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    maxMenoresSinCama: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(98),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
  });
  ngOnInit() {
    const h = this.habitacion();
    this.form.patchValue({
      capacidadPersonas: h.capacidad,
      plazasCama: h.plazasCama ?? h.capacidad,
      maxMenoresSinCama: h.maxMenoresSinCama ?? 0,
    });
  }
  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.guardando()) {
      this.error.set('Completa los límites con números enteros válidos.');
      return;
    }
    const datos = this.form.getRawValue();
    if (datos.plazasCama > datos.capacidadPersonas) {
      this.error.set(
        'Las plazas de cama no pueden superar la capacidad máxima de personas.',
      );
      return;
    }
    if (datos.maxMenoresSinCama >= datos.capacidadPersonas) {
      this.error.set(
        'El límite de menores sin plaza propia debe dejar espacio para al menos un adulto.',
      );
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.servicio
      .actualizarOcupacion(this.habitacion().idHabitacion, datos)
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardado.emit();
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}
