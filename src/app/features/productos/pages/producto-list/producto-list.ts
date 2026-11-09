import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductoService } from '../../services/producto-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { Producto } from '../../models/producto.model';
import { Categoria } from '../../../categorias/models/categoria.model';
import { Pagina } from '../../../../core/models/pagina-response';
import { mensajeError } from '../../../../core/utils/http-error';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Icon } from '../../../../shared/components/icono/icono';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';
@Component({
  selector: 'app-producto-list',
  imports: [FormsModule, CurrencyPipe, RouterLink, Icon, DialogFocus],
  templateUrl: './producto-list.html',
  styleUrl: './producto-list.css',
})
export class ProductoList {
  private productos = inject(ProductoService);
  private categoriasService = inject(CategoriaService);
  private avisos = inject(NotificacionService);
  respuesta = signal<Pagina<Producto> | null>(null);
  categorias = signal<Categoria[]>([]);
  error = signal('');
  cargando = signal(true);
  desactivando = signal<Producto | null>(null);
  ocupado = signal(false);
  modalError = signal('');
  pagina = 0;
  tamanio = 10;
  buscar = '';
  estado = '';
  categoria: number | null = null;
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
      ),
      categorias: this.categoriasService.listar(),
    }).subscribe({
      next: (r) => {
        this.respuesta.set(r.page);
        this.categorias.set(r.categorias);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  desactivar() {
    const p = this.desactivando();
    if (!p || this.ocupado()) return;
    this.ocupado.set(true);
    this.productos.desactivar(p.idProducto).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.desactivando.set(null);
        this.avisos.mostrar('Producto desactivado. Su historial se conserva.');
        this.cargar();
      },
      error: (e) => {
        this.ocupado.set(false);
        this.modalError.set(mensajeError(e));
      },
    });
  }
}
