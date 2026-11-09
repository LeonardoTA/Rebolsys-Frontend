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
  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private overflow = document.body.style.overflow;
  dialogEscape = output<void>();
  private focusable() {
    return [
      ...this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length > 0);
  }
  ngAfterViewInit() {
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => {
      const fields = this.focusable();
      (fields.find((el) => el.tagName === 'INPUT') || fields[0])?.focus();
    });
  }
  ngOnDestroy() {
    document.body.style.overflow = this.overflow;
    this.previous?.focus();
  }
  @HostListener('document:keydown', ['$event']) key(event: KeyboardEvent) {
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
