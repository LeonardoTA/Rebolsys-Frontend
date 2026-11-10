import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DialogFocus } from './dialog-focus';

@Component({
  imports: [DialogFocus],
  template: `
    @if (principal()) {
      <section appDialog (dialogEscape)="principal.set(false)">
        <button>Registrar artículo</button>
      </section>
    }
    @if (tipo()) {
      <section appDialog (dialogEscape)="tipo.set(false)">
        <input aria-label="Nuevo tipo" />
      </section>
    }
  `,
})
class DialogosPrueba {
  principal = signal(false);
  tipo = signal(false);
}

describe('Diálogos anidados de mantenimiento', () => {
  let fixture: ComponentFixture<DialogosPrueba>;
  beforeEach(() => {
    document.body.style.overflow = 'auto';
    TestBed.configureTestingModule({ imports: [DialogosPrueba] });
    fixture = TestBed.createComponent(DialogosPrueba);
    fixture.detectChanges();
    fixture.componentInstance.principal.set(true);
    fixture.detectChanges();
    fixture.componentInstance.tipo.set(true);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    document.body.style.overflow = '';
  });

  it('Escape cierra solo el tipo y conserva el formulario del artículo', () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.tipo()).toBe(false);
    expect(fixture.componentInstance.principal()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.principal()).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restaura el desplazamiento al desmontar los diálogos en distinto orden', () => {
    fixture.componentInstance.principal.set(false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.componentInstance.tipo.set(false);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('auto');
  });
});
