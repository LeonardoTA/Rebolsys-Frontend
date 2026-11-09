import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { of, throwError } from 'rxjs';
import { ProductoList } from './producto-list';
import { ProductoService } from '../../services/producto-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Producto } from '../../models/producto.model';

describe('Pruebas funcionales de ProductoList (CU_23)', () => {
  let component: ProductoList;
  let productoServiceMock: any;
  let categoriaServiceMock: any;
  let notificacionServiceMock: any;

  beforeAll(() => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Ignorar si ya fue inicializado
    }
  });

  beforeEach(() => {
    productoServiceMock = {
      listar: () =>
        of({
          contenido: [
            {
              idProducto: 1,
              nombreProducto: 'Agua mineral 500 ml',
              precioActual: 2.5,
              stock: 3,
              stockMinimo: 5,
              idCategoria: 1,
              categoriaNombre: 'Bebidas',
              estadoProducto: 'ACTIVO',
              imagenRuta: '/imagenes/productos/agua.png',
              stockBajo: true,
            },
            {
              idProducto: 2,
              nombreProducto: 'Galletas de chocolate',
              precioActual: 1.8,
              stock: 20,
              stockMinimo: 10,
              idCategoria: 2,
              categoriaNombre: 'Snacks',
              estadoProducto: 'INACTIVO',
              imagenRuta: null,
            },
          ],
          pagina: 0,
          tamanio: 12,
          totalElementos: 2,
          totalPaginas: 1,
          ultima: true,
        }),
      movimientos: () => of([]),
      usuarios: () => of([{ id: 1, nombre: 'Admin' }]),
      obtener: () => of({ idProducto: 1, stock: 15 }),
      desactivar: () => of(void 0),
      ajustarStock: () => of({ idProducto: 1, stock: 10 }),
    };

    categoriaServiceMock = {
      listar: () => of([{ idCategoria: 1, nombreCategoria: 'Bebidas' }]),
    };

    notificacionServiceMock = {
      mostrar: () => {},
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ProductoService, useValue: productoServiceMock },
        { provide: CategoriaService, useValue: categoriaServiceMock },
        { provide: NotificacionService, useValue: notificacionServiceMock },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ProductoList());
    component.ngOnInit();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('determina imagen fallback correctamente ante ruta nula o error de carga', () => {
    const prodConImagen: Producto = {
      idProducto: 1,
      nombreProducto: 'Agua',
      precioActual: 2.5,
      stock: 5,
      stockMinimo: 2,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua.png',
    };

    const prodSinImagen: Producto = {
      idProducto: 2,
      nombreProducto: 'Snack',
      precioActual: 1.5,
      stock: 10,
      stockMinimo: 5,
      idCategoria: 2,
      categoriaNombre: 'Snacks',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    // Caso 1: Ruta válida
    expect(component.imagen(prodConImagen)).toBe('/imagenes/productos/agua.png');

    // Caso 2: Ruta nula usa fallback predeterminado
    expect(component.imagen(prodSinImagen)).toBe('/imagenes/productos/sin-imagen.svg');

    // Caso 3: Error de carga en imagen dinámica conmuta al fallback
    component.marcarImagenFallida(1);
    expect(component.imagen(prodConImagen)).toBe('/imagenes/productos/sin-imagen.svg');
  });

  it('calcula stock bajo considerando respuesta de la API o stock <= stockMinimo', () => {
    const prodConStockBajoApi: Producto = {
      idProducto: 1,
      nombreProducto: 'A',
      precioActual: 1,
      stock: 10,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'B',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
      stockBajo: true,
    };

    const prodCalculadoBajo: Producto = {
      idProducto: 2,
      nombreProducto: 'B',
      precioActual: 1,
      stock: 4,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'B',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    const prodNormal: Producto = {
      idProducto: 3,
      nombreProducto: 'C',
      precioActual: 1,
      stock: 20,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'B',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    expect(component.esStockBajo(prodConStockBajoApi)).toBe(true);
    expect(component.esStockBajo(prodCalculadoBajo)).toBe(true);
    expect(component.esStockBajo(prodNormal)).toBe(false);
  });

  it('inicia ajuste generando clave de operación única e inicializando saldo observado', () => {
    const prod: Producto = {
      idProducto: 5,
      nombreProducto: 'Chocolate',
      precioActual: 4,
      stock: 12,
      stockMinimo: 6,
      idCategoria: 1,
      categoriaNombre: 'Snacks',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    component.iniciarAjuste(prod);

    expect(component.ajustandoProducto()).toEqual(prod);
    expect(component.ajusteStockAnterior).toBe(12);
    expect(component.claveOperacion).toBeTruthy();
    expect(component.esAjusteValido()).toBe(false);

    // Completar datos válidos
    component.ajusteUsuario = 1;
    component.ajusteStockNuevo = 18;
    component.ajusteObservacion = 'Ingreso de reposición';

    expect(component.esAjusteValido()).toBe(true);
  });

  it('si cambian datos tras un intento genera nueva claveOperacion para no colisionar', () => {
    const prod: Producto = {
      idProducto: 5,
      nombreProducto: 'Chocolate',
      precioActual: 4,
      stock: 12,
      stockMinimo: 6,
      idCategoria: 1,
      categoriaNombre: 'Snacks',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    component.iniciarAjuste(prod);
    const claveInicial = component.claveOperacion;

    component.ajusteUsuario = 1;
    component.ajusteStockNuevo = 15;
    component.ajusteObservacion = 'Ajuste inicial';
    component.ultimoPayloadEnviado = {
      idUsuario: 1,
      stockAnterior: 12,
      stockNuevo: 15,
      observacion: 'Ajuste inicial',
    };

    // El usuario modifica el nuevo stock
    component.ajusteStockNuevo = 20;
    component.onAjusteDataChange();

    expect(component.claveOperacion).not.toBe(claveInicial);
  });

  it('ante conflicto de existencias refresca saldo observado y mantiene abierto el modal', () => {
    const prod: Producto = {
      idProducto: 5,
      nombreProducto: 'Chocolate',
      precioActual: 4,
      stock: 12,
      stockMinimo: 6,
      idCategoria: 1,
      categoriaNombre: 'Snacks',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    component.iniciarAjuste(prod);
    component.ajusteUsuario = 1;
    component.ajusteStockNuevo = 20;
    component.ajusteObservacion = 'Ajuste con saldo desfasado';

    productoServiceMock.ajustarStock = () =>
      throwError(() => ({
        status: 409,
        error: { message: 'El stock cambió; consulta el producto antes de ajustar sus existencias' },
      }));

    productoServiceMock.obtener = () => of({ ...prod, stock: 15 });

    component.guardarAjuste();

    expect(component.ajustandoProducto()).toBeTruthy();
    expect(component.ajusteStockAnterior).toBe(15);
    expect(component.ajusteConflicto()).toContain('Las existencias en almacén cambiaron a 15 unidades');
  });

  it('retiro conserva modal abierto si el servidor responde con error', () => {
    const prod: Producto = {
      idProducto: 9,
      nombreProducto: 'Gaseosa',
      precioActual: 3,
      stock: 2,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
    };

    component.iniciarDesactivacion(prod);
    expect(component.desactivando()).toEqual(prod);

    productoServiceMock.desactivar = () =>
      throwError(() => ({
        status: 500,
        error: { message: 'Fallo al desactivar producto' },
      }));

    component.desactivar();

    expect(component.desactivando()).toEqual(prod);
    expect(component.modalError()).toContain('Fallo al desactivar producto');
    expect(component.ocupado()).toBe(false);
  });

  it('actualiza la fotografía del producto en el detalle y catálogo al emitir onImagenDetalleCambiada', () => {
    const prod: Producto = {
      idProducto: 1,
      nombreProducto: 'Agua mineral 500 ml',
      precioActual: 2.5,
      stock: 3,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua.png',
    };

    component.abrirDetalle(prod);
    component.marcarImagenFallida(1);
    expect(component.fallidas().has(1)).toBe(true);

    // Se sube nueva imagen mediante ImagenUpload
    component.onImagenDetalleCambiada(prod, '/api/v1/imagenes/productos/1.png');

    expect(component.detalleProducto()?.imagenRuta).toBe('/api/v1/imagenes/productos/1.png');
    expect(component.fallidas().has(1)).toBe(false);

    const enCatalogo = component.respuesta()?.contenido.find((p) => p.idProducto === 1);
    expect(enCatalogo?.imagenRuta).toBe('/api/v1/imagenes/productos/1.png');
  });
});
