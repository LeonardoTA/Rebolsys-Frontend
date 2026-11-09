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
import { of } from 'rxjs';
import { ProductoForm } from './producto-form';
import { ProductoService } from '../../services/producto-service';
import { CategoriaService } from '../../../categorias/services/categoria-service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Producto } from '../../models/producto.model';

describe('Pruebas funcionales de ProductoForm (CU_23)', () => {
  let component: ProductoForm;
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
      obtener: (id: string | number) =>
        of({
          idProducto: Number(id),
          nombreProducto: 'Galletas de avena',
          precioActual: 2.2,
          stock: 45,
          stockMinimo: 10,
          idCategoria: 2,
          categoriaNombre: 'Snacks',
          estadoProducto: 'ACTIVO',
          imagenRuta: '/imagenes/productos/galleta.webp',
        } as Producto),
      crear: (datos: any) => of({ idProducto: 11, ...datos }),
      actualizar: (id: any, datos: any) => of({ idProducto: Number(id), ...datos }),
    };

    categoriaServiceMock = {
      listar: () => of([
        { idCategoria: 1, nombreCategoria: 'Bebidas' },
        { idCategoria: 2, nombreCategoria: 'Snacks' },
      ]),
      crear: (nombre: string) => of({ idCategoria: 3, nombreCategoria: nombre }),
    };

    notificacionServiceMock = {
      mostrar: () => {},
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'mantenimiento/productos', component: class DummyComponent {} }]),
        { provide: ProductoService, useValue: productoServiceMock },
        { provide: CategoriaService, useValue: categoriaServiceMock },
        { provide: NotificacionService, useValue: notificacionServiceMock },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ProductoForm());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('en creación inicializa stock en cero y envía stock cero al registrar', () => {
    component.ngOnInit();

    expect(component.form.get('stock')?.value).toBe(0);
    expect(component.id()).toBeUndefined();

    // Completar datos válidos de alta
    component.form.patchValue({
      nombreProducto: '  Jugo de naranja 1 L  ',
      precioActual: 6.5,
      stockMinimo: 4,
      idCategoria: 1,
      estadoProducto: 'ACTIVO',
      imagenRuta: '/imagenes/productos/jugo.webp',
    });

    let payloadEnviado: any = null;
    productoServiceMock.crear = (d: any) => {
      payloadEnviado = d;
      return of({ idProducto: 20, ...d });
    };

    component.guardar();

    expect(payloadEnviado).not.toBeNull();
    expect(payloadEnviado.stock).toBe(0);
    expect(payloadEnviado.nombreProducto).toBe('Jugo de naranja 1 L');
    expect(payloadEnviado.precioActual).toBe(6.5);
    expect(payloadEnviado.stockAnterior).toBeNull();
  });

  it('en edición conserva las existencias y pasa stockAnterior para no modificar stock', () => {
    // Simular que el input signal 'id' tiene el valor '5'
    (component as any).id = () => '5';
    component.ngOnInit();

    expect(component.form.get('stock')?.value).toBe(45);
    expect(component.form.get('stockAnterior')?.value).toBe(45);

    component.form.patchValue({
      nombreProducto: 'Galletas de avena integral',
      precioActual: 2.8,
    });

    let payloadActualizado: any = null;
    productoServiceMock.actualizar = (id: any, d: any) => {
      payloadActualizado = d;
      return of({ idProducto: Number(id), ...d });
    };

    component.guardar();

    expect(payloadActualizado).not.toBeNull();
    expect(payloadActualizado.stock).toBe(45);
    expect(payloadActualizado.stockAnterior).toBe(45);
    expect(payloadActualizado.nombreProducto).toBe('Galletas de avena integral');
    expect(payloadActualizado.precioActual).toBe(2.8);
  });

  it('vista previa de imagen maneja rutas válidas, rutas inválidas y errores', () => {
    component.form.get('imagenRuta')?.setValue('/imagenes/productos/test.png');
    expect(component.vistaImagen()).toBe('/imagenes/productos/test.png');

    // Error de carga
    component.imagenFallida.set(true);
    expect(component.vistaImagen()).toBe('/imagenes/productos/sin-imagen.svg');

    // Sin ruta
    component.imagenFallida.set(false);
    component.form.get('imagenRuta')?.setValue('');
    expect(component.vistaImagen()).toBe('/imagenes/productos/sin-imagen.svg');
  });

  it('crea nueva categoría inline y actualiza la selección en el formulario', () => {
    component.ngOnInit();
    component.nuevaCategoria.set('Postres');

    component.crearCategoria();

    expect(component.categorias().some((c) => c.nombreCategoria === 'Postres')).toBe(true);
    expect(component.form.get('idCategoria')?.value).toBe(3);
    expect(component.nuevaCategoria()).toBe('');
  });

  it('actualiza la ruta de imagen y restablece el estado fallido al emitir onImagenCambiada', () => {
    component.imagenFallida.set(true);
    component.onImagenCambiada('/api/v1/imagenes/productos/5.png');

    expect(component.form.get('imagenRuta')?.value).toBe('/api/v1/imagenes/productos/5.png');
    expect(component.imagenFallida()).toBe(false);

    // Cuando se remueve la imagen
    component.onImagenCambiada(null);
    expect(component.form.get('imagenRuta')?.value).toBe('');
  });
});
