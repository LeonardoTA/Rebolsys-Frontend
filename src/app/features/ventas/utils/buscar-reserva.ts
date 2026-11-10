import { ReservaVenta } from "../models/venta.model";

export function coincideReserva(
  reserva: ReservaVenta,
  busqueda: string,
): boolean {
  const normalizar = (valor: string) =>
    valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim()
      .replace(/\s+/g, " ");
  const texto = normalizar(
    [
      reserva.referencia,
      reserva.numero,
      reserva.habitacion,
      reserva.clienteNombre,
      ...reserva.huespedes,
    ].join(" "),
  );
  return normalizar(busqueda)
    .split(" ")
    .every((palabra) => texto.includes(palabra));
}
