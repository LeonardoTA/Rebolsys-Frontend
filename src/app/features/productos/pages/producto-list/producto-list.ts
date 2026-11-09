import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductoService } from '../../services/producto-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import {
  AjusteStock,
  MovimientoInventario,
  Producto,
} from '../../models/producto.model';
import { Categoria } from '../../../categorias/models/categoria.model';
import { Catalogo } from '../../../../core/models/catalogo.model';
import { Pagina } from '../../../../core/models/pagina-response';
import { mensajeError } from '../../../../core/utils/http-error';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Icon } from '../../../../shared/components/icono/icono';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import { ImagenUpload } from '../../../../shared/components/imagen-upload/imagen-upload';

@Component({
  selector: 'app-producto-list',
  imports: [
    FormsModule,
    CurrencyPipe,
    RouterLink,
    Icon,
    DialogFocus,
    ImagenUpload,
  ],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList implements OnInit {
  private productos = inject(ProductoService);
  private categoriasService = inject(CategoriaService);
  private avisos = inject(NotificacionService);

  // Estados de datos
  respuesta = signal<Pagina<Producto> | null>(null);
  categorias = signal<Categoria[]>([]);
  usuarios = signal<Catalogo[]>([]);
  error = signal('');
  cargando = signal(true);
  fallidas = signal<Set<number>>(new Set());

  // Filtros y paginación
  pagina = 0;
  tamanio = 12;
  buscar = '';
  estado = '';
  categoria: number | null = null;
  stockBajo: boolean | null = null;

  // Modal de baja / retiro
  desactivando = signal<Producto | null>(null);
  ocupado = signal(false);
  modalError = signal('');

  // Modal de detalle y movimientos
  detalleProducto = signal<Producto | null>(null);
  movimientos = signal<MovimientoInventario[]>([]);
  cargandoMovimientos = signal(false);
  errorMovimientos = signal('');

  // Modal de ajuste de existencias
  ajustandoProducto = signal<Producto | null>(null);
  ajusteStockAnterior = 0;
  ajusteStockNuevo: number | null = null;
  ajusteUsuario: number | null = null;
  ajusteObservacion = '';
  claveOperacion = '';
  ultimoPayloadEnviado: {
    idUsuario: number;
    stockAnterior: number;
    stockNuevo: number;
    observacion: string;
  } | null = null;
  ocupadoAjuste = signal(false);
  ajusteError = signal('');
  ajusteConflicto = signal('');

  ngOnInit() {
    this.cargar();
  }

  filtrar() {
    this.pagina = 0;
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      page: this.productos.listar(
        this.pagina,
        this.tamanio,
        this.buscar,
        this.estado,
        this.categoria,
        this.stockBajo,
      ),
      categorias: this.categoriasService.listar(),
      usuarios: this.productos.usuarios(),
    }).subscribe({
      next: (r) => {
        this.respuesta.set(r.page);
        this.categorias.set(r.categorias);
        this.usuarios.set(r.usuarios);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  imagen(p: Producto): string {
    return p.imagenRuta && !this.fallidas().has(p.idProducto)
      ? p.imagenRuta
      : '/imagenes/productos/sin-imagen.svg';
  }

  marcarImagenFallida(id: number) {
    this.fallidas.update((set) => {
      const next = new Set(set);
      next.add(id);
      return next;
    });
  }

  onImagenDetalleCambiada(prod: Producto, nuevaRuta: string | null) {
    const actualizado: Producto = { ...prod, imagenRuta: nuevaRuta };
    this.detalleProducto.set(actualizado);
    this.fallidas.update((set) => {
      const next = new Set(set);
      next.delete(prod.idProducto);
      return next;
    });
    this.respuesta.update((pag) => {
      if (!pag) return pag;
      return {
        ...pag,
        contenido: pag.contenido.map((p) =>
          p.idProducto === prod.idProducto
            ? { ...p, imagenRuta: nuevaRuta }
            : p,
        ),
      };
    });
  }

  esStockBajo(p: Producto): boolean {
    return p.stockBajo ?? (p.stock <= p.stockMinimo);
  }

  // Operación: Retiro de venta (Baja lógica mediante DELETE /productos/{id})
  iniciarDesactivacion(p: Producto) {
    this.modalError.set('');
    this.desactivando.set(p);
  }

  desactivar() {
    const p = this.desactivando();
    if (!p || this.ocupado()) return;

    this.ocupado.set(true);
    this.modalError.set('');

    this.productos.desactivar(p.idProducto).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.desactivando.set(null);
        this.avisos.mostrar(
          'Producto retirado de la venta. Su historial se conserva intacto.',
        );
        this.cargar();
      },
      error: (e) => {
        // En caso de error, el modal se conserva abierto para informar al usuario
        this.ocupado.set(false);
        this.modalError.set(mensajeError(e));
      },
    });
  }

  // Operación: Consultar detalle completo y movimientos
  abrirDetalle(p: Producto) {
    this.detalleProducto.set(p);
    this.cargandoMovimientos.set(true);
    this.errorMovimientos.set('');
    this.movimientos.set([]);

    this.productos.movimientos(p.idProducto).subscribe({
      next: (movs) => {
        this.movimientos.set(movs);
        this.cargandoMovimientos.set(false);
      },
      error: (e) => {
        this.errorMovimientos.set(mensajeError(e));
        this.cargandoMovimientos.set(false);
      },
    });
  }

  cerrarDetalle() {
    this.detalleProducto.set(null);
    this.movimientos.set([]);
    this.errorMovimientos.set('');
  }

  // Operación: Ajuste de existencias
  iniciarAjuste(p: Producto) {
    this.ajustandoProducto.set(p);
    this.ajusteStockAnterior = p.stock;
    this.ajusteStockNuevo = null;
    this.ajusteUsuario = null;
    this.ajusteObservacion = '';
    this.ajusteError.set('');
    this.ajusteConflicto.set('');
    this.claveOperacion = crypto.randomUUID();
    this.ultimoPayloadEnviado = null;
  }

  cerrarAjuste() {
    if (this.ocupadoAjuste()) return;
    this.ajustandoProducto.set(null);
    this.ajusteError.set('');
    this.ajusteConflicto.set('');
    this.ultimoPayloadEnviado = null;
  }

  onAjusteDataChange() {
    // Si cambian los datos respecto al intento anterior, generar una nueva clave de operación
    if (this.ultimoPayloadEnviado) {
      const cambioUsuario =
        this.ajusteUsuario !== this.ultimoPayloadEnviado.idUsuario;
      const cambioStock =
        this.ajusteStockNuevo !== this.ultimoPayloadEnviado.stockNuevo;
      const cambioObs =
        (this.ajusteObservacion || '').trim() !==
        this.ultimoPayloadEnviado.observacion;

      if (cambioUsuario || cambioStock || cambioObs) {
        this.claveOperacion = crypto.randomUUID();
        this.ultimoPayloadEnviado = null;
        this.ajusteError.set('');
        this.ajusteConflicto.set('');
      }
    }
  }

  esAjusteValido(): boolean {
    return (
      this.ajusteUsuario !== null &&
      this.ajusteUsuario > 0 &&
      this.ajusteStockNuevo !== null &&
      this.ajusteStockNuevo !== undefined &&
      Number.isInteger(this.ajusteStockNuevo) &&
      this.ajusteStockNuevo >= 0 &&
      this.ajusteStockNuevo <= 999999999 &&
      this.ajusteStockNuevo !== this.ajusteStockAnterior &&
      !!this.ajusteObservacion?.trim() &&
      this.ajusteObservacion.trim().length <= 300
    );
  }

  guardarAjuste() {
    const prod = this.ajustandoProducto();
    if (!prod || !this.esAjusteValido() || this.ocupadoAjuste()) return;

    this.ocupadoAjuste.set(true);
    this.ajusteError.set('');
    this.ajusteConflicto.set('');

    const payload: AjusteStock = {
      claveOperacion: this.claveOperacion,
      idUsuario: this.ajusteUsuario!,
      stockAnterior: this.ajusteStockAnterior,
      stockNuevo: this.ajusteStockNuevo!,
      observacion: this.ajusteObservacion.trim(),
    };

    // Guardar referencia del payload enviado para reintentos idempotentes
    this.ultimoPayloadEnviado = {
      idUsuario: payload.idUsuario,
      stockAnterior: payload.stockAnterior,
      stockNuevo: payload.stockNuevo,
      observacion: payload.observacion,
    };

    this.productos.ajustarStock(prod.idProducto, payload).subscribe({
      next: (actualizado) => {
        this.ocupadoAjuste.set(false);
        this.ajustandoProducto.set(null);
        this.ultimoPayloadEnviado = null;
        this.avisos.mostrar('Existencias ajustadas exitosamente.');

        // Si el modal de detalle estaba abierto para este producto, refrescarlo
        if (this.detalleProducto()?.idProducto === prod.idProducto) {
          this.abrirDetalle(actualizado);
        }
        this.cargar();
      },
      error: (e) => {
        this.ocupadoAjuste.set(false);
        // Si hay conflicto (por ejemplo stock concurrente modificado)
        const esConflicto =
          e.status === 409 ||
          (e.error?.message &&
            e.error.message.toLowerCase().includes('stock'));

        if (esConflicto) {
          // Refrescar saldo observado desde el backend
          this.productos.obtener(prod.idProducto).subscribe({
            next: (refrescado) => {
              this.ajusteStockAnterior = refrescado.stock;
              this.claveOperacion = crypto.randomUUID();
              this.ultimoPayloadEnviado = null;
              this.ajusteConflicto.set(
                `Las existencias en almacén cambiaron a ${refrescado.stock} unidades. Revisa el nuevo saldo antes de reenviar el ajuste.`,
              );
            },
            error: () => {
              this.ajusteError.set(mensajeError(e));
            },
          });
        } else {
          this.ajusteError.set(mensajeError(e));
        }
      },
    });
  }
}
