import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ImagenUpload } from './imagen-upload';

describe('Fotos de registros guardados', () => {
  let fixture: ComponentFixture<ImagenUpload>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImagenUpload], providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(ImagenUpload);
    fixture.componentRef.setInput('tipo', 'habitaciones'); fixture.componentRef.setInput('id', 12);
    fixture.componentRef.setInput('ruta', '/foto-anterior.png');
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); fixture.destroy(); });

  function elegir(archivo: File) {
    const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('sube el archivo como multipart al registro y comunica la ruta resultante', () => {
    let recibida: string | null | undefined;
    fixture.componentInstance.cambiada.subscribe(r => recibida = r);
    elegir(new File(['contenido'], 'foto.png', { type: 'image/png' }));
    const req = http.expectOne('/api/v1/imagenes/habitaciones/12');
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('archivo')).toBeInstanceOf(File);
    expect(fixture.componentInstance.ocupado()).toBe(true);
    req.flush({ ruta: '/api/v1/imagenes/habitaciones/12.png' });
    fixture.detectChanges();
    expect(recibida).toBe('/api/v1/imagenes/habitaciones/12.png');
    expect(fixture.nativeElement.querySelector('img').src).toContain('/api/v1/imagenes/habitaciones/12.png');
  });

  it('mantiene la foto anterior y permite reintentar cuando el servidor rechaza el archivo', () => {
    elegir(new File(['contenido'], 'foto.png', { type: 'image/png' }));
    http.expectOne('/api/v1/imagenes/habitaciones/12').flush({ message: 'La imagen excede el tamaño permitido' }, { status: 413, statusText: 'Payload Too Large' });
    fixture.detectChanges();
    expect(fixture.componentInstance.ocupado()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('tamaño permitido');
    expect(fixture.nativeElement.querySelector('img').src).toContain('/foto-anterior.png');
    expect(fixture.nativeElement.querySelector('input').disabled).toBe(false);
  });

  it('pide confirmar y elimina solo la foto, conservando la habitación', () => {
    (fixture.nativeElement.querySelector('.text-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¿Quitar la fotografía');
    (fixture.nativeElement.querySelector('.danger') as HTMLButtonElement).click();
    const req = http.expectOne('/api/v1/imagenes/habitaciones/12');
    expect(req.request.method).toBe('DELETE');
    req.flush(null); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });
});
