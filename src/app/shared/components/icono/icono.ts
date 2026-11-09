import { Component, input } from '@angular/core';
@Component({
  selector: 'app-icon',
  templateUrl: './icono.html',
  styleUrl: './icono.css',
})
export class Icon {
  name = input('bed');
  paths: Record<string, string> = {
    cart: 'M3 4h3l3 12h10l3-9H7 M10 21h.01 M18 21h.01',
    box: 'm3 7 9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9 M8 5l9 5',
    bag: 'M5 7h14l2 14H3z M9 8V5a3 3 0 0 1 6 0v3',
    home: 'M3 10 12 3l9 7v10H3z M9 20v-7h6v7',
    bed: 'M3 18V6 M21 18V9 M3 14h18 M3 9h6v5 M9 10h12',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
    arrow: 'M19 12H5 M11 6l-6 6 6 6',
    chevron: 'm9 5 7 7-7 7',
    plus: 'M12 5v14 M5 12h14',
    search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    edit: 'm15 4 5 5 M4 20l1-6L17 2l5 5L10 19z',
    close: 'm6 6 12 12 M18 6 6 18',
    check: 'm5 12 4 4L19 6',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3',
    wallet: 'M3 6h17v14H3z M3 6l14-3v3 M15 11h6v5h-6z',
    users:
      'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3c0-5 14-5 14 0v3 M17 4c5 0 5 7 0 7 M19 15c3 0 3 3 3 6',
    wifi: 'M2 8c6-6 14-6 20 0 M5 12c4-4 10-4 14 0 M9 16c2-2 4-2 6 0 M12 20h.01',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    mountain: 'm2 20 7-14 5 8 3-5 5 11z M6 12l3 1 2-3',
    print: 'M6 9V3h12v6 M6 17H3V9h18v8h-3 M6 14h12v7H6z',
    info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
  };
}
