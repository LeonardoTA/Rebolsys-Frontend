import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProductoService } from './producto-service';
import {
  AjusteStock,
  MovimientoInventario,
  Producto,
  ProductoRequest,
} from '../models/producto.model';

describe('Contratos del módulo de productos con la API de iteración 1 (CU_23)', () => {
  let service: ProductoService;
  let http: HttpTestingController;

  beforeAll(() => {
    try {
      TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch {
      // Ignorar si ya fue inicializado por el runner
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('alta de producto exige stock inicial cero en el contrato con la API', () => {
    const nuevoProducto: ProductoRequest = {
      nombreProducto: 'Agua mineral con gas 500 ml',
      precioActual: 3.5,
      stock: 0,
      stockMinimo: 5,
      idCategoria: 1,
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua-gas.webp',
      stockAnterior: null,
    };

    let respuesta: Producto | undefined;
    service.crear(nuevoProducto).subscribe((r) => (respuesta = r));

    const req = http.expectOne('/api/v1/productos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.stock).toBe(0);
    expect(req.request.body.nombreProducto).toBe('Agua mineral con gas 500 ml');
    expect(req.request.body.precioActual).toBe(3.5);

    const mockResponse: Producto = {
      idProducto: 10,
      nombreProducto: 'Agua mineral con gas 500 ml',
      precioActual: 3.5,
      stock: 0,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua-gas.webp',
      stockBajo: true,
    };
    req.flush(mockResponse);
    expect(respuesta).toEqual(mockResponse);
  });

  it('edición no ajusta stock: conserva las existencias y pasa stockAnterior', () => {
    const edicion: ProductoRequest = {
      nombreProducto: 'Agua mineral con gas 500 ml (Premium)',
      precioActual: 4.0,
      stock: 25,
      stockMinimo: 8,
      idCategoria: 1,
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua-gas.webp',
      stockAnterior: 25,
    };

    let respuesta: Producto | undefined;
    service.actualizar(10, edicion).subscribe((r) => (respuesta = r));

    const req = http.expectOne('/api/v1/productos/10');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.stock).toBe(25);
    expect(req.request.body.stockAnterior).toBe(25);
    expect(req.request.body.precioActual).toBe(4.0);

    const mockResponse: Producto = {
      idProducto: 10,
      nombreProducto: 'Agua mineral con gas 500 ml (Premium)',
      precioActual: 4.0,
      stock: 25,
      stockMinimo: 8,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/agua-gas.webp',
      stockBajo: false,
    };
    req.flush(mockResponse);
    expect(respuesta).toEqual(mockResponse);
  });

  it('ajuste de existencias independiente envía claveOperacion, idUsuario, saldo observado y nuevo stock', () => {
    const ajuste: AjusteStock = {
      claveOperacion: 'op-ajuste-uuid-12345',
      idUsuario: 2,
      stockAnterior: 0,
      stockNuevo: 30,
      observacion: 'Carga inicial de inventario para apertura de tienda',
    };

    let respuesta: Producto | undefined;
    service.ajustarStock(10, ajuste).subscribe((r) => (respuesta = r));

    const req = http.expectOne('/api/v1/productos/10/ajustes-stock');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(ajuste);
    expect(req.request.body.claveOperacion).toBe('op-ajuste-uuid-12345');
    expect(req.request.body.idUsuario).toBe(2);
    expect(req.request.body.stockNuevo).toBe(30);

    const mockResponse: Producto = {
      idProducto: 10,
      nombreProducto: 'Agua mineral con gas 500 ml',
      precioActual: 3.5,
      stock: 30,
      stockMinimo: 5,
      idCategoria: 1,
      categoriaNombre: 'Bebidas',
      estadoProducto: 'ACTIVO',
      imagenRuta: null,
      stockBajo: false,
    };
    req.flush(mockResponse);
    expect(respuesta).toEqual(mockResponse);
  });

  it('reintento de ajuste con misma clave e idéntico payload respeta idempotencia', () => {
    const ajuste: AjusteStock = {
      claveOperacion: 'reintento-idempotente-67890',
      idUsuario: 3,
      stockAnterior: 30,
      stockNuevo: 25,
      observacion: 'Merma por producto dañado en traslado',
    };

    // Primer intento
    service.ajustarStock(10, ajuste).subscribe();
    const req1 = http.expectOne('/api/v1/productos/10/ajustes-stock');
    expect(req1.request.body.claveOperacion).toBe('reintento-idempotente-67890');
    req1.flush({ idProducto: 10, stock: 25 });

    // Segundo intento (reintento del mismo payload)
    service.ajustarStock(10, ajuste).subscribe();
    const req2 = http.expectOne('/api/v1/productos/10/ajustes-stock');
    expect(req2.request.body.claveOperacion).toBe('reintento-idempotente-67890');
    expect(req2.request.body).toEqual(ajuste);
    req2.flush({ idProducto: 10, stock: 25 });
  });

  it('retiro de venta realiza baja lógica mediante DELETE /productos/{id} conservando historial', () => {
    service.desactivar(10).subscribe();
    const req = http.expectOne('/api/v1/productos/10');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('consulta detalle y movimientos de inventario conservados', () => {
    let detalle: Producto | undefined;
    service.obtener(10).subscribe((p) => (detalle = p));
    const reqDetalle = http.expectOne('/api/v1/productos/10');
    expect(reqDetalle.request.method).toBe('GET');
    reqDetalle.flush({
      idProducto: 10,
      nombreProducto: 'Agua mineral',
      stock: 12,
      estadoProducto: 'INACTIVO',
    });
    expect(detalle?.idProducto).toBe(10);

    let movimientos: MovimientoInventario[] | undefined;
    service.movimientos(10).subscribe((m) => (movimientos = m));
    const reqMovs = http.expectOne('/api/v1/productos/10/movimientos');
    expect(reqMovs.request.method).toBe('GET');

    const mockMovs: MovimientoInventario[] = [
      {
        idMovimiento: 1,
        claveOperacion: 'clave-1',
        idUsuario: 2,
        tipo: 'AJ_ENT',
        signo: 1,
        cantidad: 20,
        stockResultante: 20,
        fechaMovimiento: '2026-11-08T18:00:00',
        observacion: 'Ingreso inicial',
      },
    ];
    reqMovs.flush(mockMovs);
    expect(movimientos).toEqual(mockMovs);
  });

  it('lista productos aplicando paginación, filtros de búsqueda, categoría, estado y stockBajo', () => {
    service.listar(1, 12, 'gaseosa', 'ACTIVO', 3, true).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/productos');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamanio')).toBe('12');
    expect(req.request.params.get('buscar')).toBe('gaseosa');
    expect(req.request.params.get('estado')).toBe('ACTIVO');
    expect(req.request.params.get('idCategoria')).toBe('3');
    expect(req.request.params.get('stockBajo')).toBe('true');
    req.flush({
      contenido: [],
      pagina: 1,
      tamanio: 12,
      totalElementos: 0,
      totalPaginas: 0,
      ultima: true,
    });
  });

  it('consulta catálogo de usuarios operadores reales desde /recepcion/catalogos', () => {
    let usuarios: any[] = [];
    service.usuarios().subscribe((u) => (usuarios = u));

    const req = http.expectOne('/api/v1/recepcion/catalogos');
    expect(req.request.method).toBe('GET');
    req.flush({
      usuarios: [
        { id: 1, nombre: 'Administrador' },
        { id: 2, nombre: 'Recepcionista Turno Tarde' },
      ],
    });

    expect(usuarios.length).toBe(2);
    expect(usuarios[0].nombre).toBe('Administrador');
    expect(usuarios[1].id).toBe(2);
  });
});
