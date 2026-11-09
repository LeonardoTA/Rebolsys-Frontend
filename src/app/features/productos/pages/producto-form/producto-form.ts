import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ProductoService } from '../../services/producto-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { Categoria } from '../../../categorias/models/categoria.model';
import { ProductoRequest } from '../../models/producto.model';
import { mensajeError } from '../../../../core/utils/http-error';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Icon } from '../../../../shared/components/icono/icono';
import { ImagenUpload } from '../../../../shared/components/imagen-upload/imagen-upload';

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, RouterLink, Icon, CurrencyPipe, ImagenUpload],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
})
export class ProductoForm implements OnInit {
  id = input<string>();
  numeroId = computed(() => (this.id() ? Number(this.id()) : 0));

  private productos = inject(ProductoService);
  private categoriasService = inject(CategoriaService);
  private fb = inject(UntypedFormBuilder);
  private router = inject(Router);
  private avisos = inject(NotificacionService);

  categorias = signal<Categoria[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  nuevaCategoria = signal('');
  creandoCategoria = signal(false);
  imagenFallida = signal(false);

  form = this.fb.group({
    nombreProducto: ['', [Validators.required, Validators.maxLength(100)]],
    precioActual: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(99999999.99),
        Validators.pattern(/^[0-9]+([.][0-9]{1,2})?$/),
      ],
    ],
    stock: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(999999999),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    stockMinimo: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(999999999),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    idCategoria: [null, Validators.required],
    estadoProducto: ['ACTIVO', Validators.required],
    imagenRuta: [
      '',
      [
        Validators.maxLength(300),
        Validators.pattern(
          /^$|^\/(?!\/)[^\s\\<>]*\.(png|jpe?g|webp|avif|gif)$/i,
        ),
      ],
    ],
    stockAnterior: [null],
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.error.set('');
    this.cargando.set(true);

    this.categoriasService.listar().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        if (this.id()) {
          this.productos.obtener(this.id()!).subscribe({
            next: (p) => {
              this.form.patchValue({
                nombreProducto: p.nombreProducto,
                precioActual: p.precioActual,
                stock: p.stock,
                stockMinimo: p.stockMinimo,
                idCategoria: p.idCategoria,
                estadoProducto: p.estadoProducto,
                imagenRuta: p.imagenRuta || '',
                stockAnterior: p.stock,
              });
              this.cargando.set(false);
            },
            error: (e) => this.fallo(e),
          });
        } else {
          // Creación: la API exige stock = 0 al crear
          this.form.patchValue({
            stock: 0,
            stockAnterior: null,
          });
          this.cargando.set(false);
        }
      },
      error: (e) => this.fallo(e),
    });
  }

  private fallo(e: any) {
    this.cargando.set(false);
    this.error.set(mensajeError(e));
  }

  crearCategoria() {
    const nombre = this.nuevaCategoria().trim();
    if (!nombre || nombre.length > 30 || this.creandoCategoria()) return;

    this.creandoCategoria.set(true);
    this.categoriasService.crear(nombre).subscribe({
      next: (c) => {
        this.categorias.update((list) => [...list, c]);
        this.form.get('idCategoria')!.setValue(c.idCategoria);
        this.nuevaCategoria.set('');
        this.creandoCategoria.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.creandoCategoria.set(false);
      },
    });
  }

  onImagenCambiada(nuevaRuta: string | null) {
    this.form.patchValue({ imagenRuta: nuevaRuta || '' });
    this.imagenFallida.set(false);
  }

  vistaImagen(): string {
    const ruta = this.form.get('imagenRuta')?.value;
    const valida = this.form.get('imagenRuta')?.valid;
    return ruta && valida && !this.imagenFallida()
      ? ruta
      : '/imagenes/productos/sin-imagen.svg';
  }

  guardar() {
    this.form.markAllAsTouched();
    this.error.set('');

    const raw = this.form.getRawValue();
    const nombreLimpio = (raw.nombreProducto || '').trim();

    if (this.form.invalid || !nombreLimpio) {
      this.error.set(
        'Revisa el nombre, la categoría, el precio y el stock mínimo.',
      );
      return;
    }

    if (this.guardando()) return;

    // Contrato con backend:
    // Al crear: API exige stock=0
    // Al editar: PUT conserva existencias enviando stock y stockAnterior observados
    const esEdicion = !!this.id();
    const datos: ProductoRequest = {
      nombreProducto: nombreLimpio,
      idCategoria: Number(raw.idCategoria),
      precioActual: Number(raw.precioActual),
      stock: esEdicion ? Number(raw.stock) : 0,
      stockMinimo: Number(raw.stockMinimo),
      estadoProducto: raw.estadoProducto,
      imagenRuta: raw.imagenRuta?.trim() || null,
      stockAnterior: esEdicion ? Number(raw.stockAnterior ?? raw.stock) : null,
    };

    this.guardando.set(true);
    (esEdicion
      ? this.productos.actualizar(this.id()!, datos)
      : this.productos.crear(datos)
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.mostrar(
          esEdicion ? 'Producto actualizado.' : 'Producto registrado.',
        );
        void this.router.navigate(['/mantenimiento/productos']);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
