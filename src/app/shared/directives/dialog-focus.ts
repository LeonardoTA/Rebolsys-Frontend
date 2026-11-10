import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
  output,
} from '@angular/core';

@Directive({ selector: '[appDialog]' })
export class DialogFocus implements AfterViewInit, OnDestroy {
  private static abiertos: DialogFocus[] = [];
  private static overflowOriginal = '';
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  dialogEscape = output<void>();
  private focusable() {
    return [
      ...this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length > 0);
  }
  ngAfterViewInit() {
    if (!DialogFocus.abiertos.length) DialogFocus.overflowOriginal = document.body.style.overflow;
    DialogFocus.abiertos.push(this);
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => {
      if (DialogFocus.abiertos.at(-1) !== this || !this.element.nativeElement.isConnected) return;
      const fields = this.focusable();
      (fields.find((el) => el.tagName === 'INPUT') || fields[0])?.focus();
    });
  }
  ngOnDestroy() {
    const indice = DialogFocus.abiertos.indexOf(this);
    if (indice < 0) return;
    const eraSuperior = DialogFocus.abiertos.at(-1) === this;
    DialogFocus.abiertos.splice(indice, 1);
    if (!DialogFocus.abiertos.length) document.body.style.overflow = DialogFocus.overflowOriginal;
    if (eraSuperior && this.previous?.isConnected) this.previous.focus();
  }
  @HostListener('document:keydown', ['$event']) key(event: KeyboardEvent) {
    if (DialogFocus.abiertos.at(-1) !== this) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dialogEscape.emit();
    }
    if (event.key === 'Tab') {
      const fields = this.focusable();
      if (!fields.length) return;
      const first = fields[0],
        last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
