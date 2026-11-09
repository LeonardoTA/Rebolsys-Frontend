import { Component, input } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { Venta } from "../../models/venta.model";
@Component({
  selector: "app-venta-ticket",
  imports: [CurrencyPipe, DatePipe],
  templateUrl: "./venta-ticket.html",
  styleUrl: "./venta-ticket.css",
})
export class VentaTicket {
  venta = input.required<Venta>();
}
