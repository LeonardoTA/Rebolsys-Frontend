import { Huesped } from '../models/reserva.model';
import { Habitacion } from '../../habitaciones/models/habitacion.model';

export function esMenorDeSiete(
  nacimiento: string | null | undefined,
  ingreso: string,
): boolean {
  if (!nacimiento || !ingreso) return false;
  const [anio, mes, dia] = nacimiento.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return false;
  const limiteAnio = anio + 7;
  const ultimoDia = new Date(Date.UTC(limiteAnio, mes, 0)).getUTCDate();
  const cumpleSiete =
    String(limiteAnio).padStart(4, '0') +
    '-' +
    String(mes).padStart(2, '0') +
    '-' +
    String(Math.min(dia, ultimoDia)).padStart(2, '0');
  return (
    nacimiento.slice(0, 10) <= ingreso.slice(0, 10) &&
    ingreso.slice(0, 10) < cumpleSiete
  );
}

export function errorOcupacion(
  habitacion: Habitacion,
  huespedes: Huesped[],
  ingreso: string,
): string {
  if (huespedes.length > habitacion.capacidad)
    return 'El adulto y los menores superan la capacidad máxima de personas de esta habitación.';
  const sinCama = huespedes.filter((h) => h.ocupaPlazaCama === false);
  if (
    sinCama.some((h) => !esMenorDeSiete(h.persona.fechaNacimiento, ingreso))
  ) {
    return 'Solo los menores de 7 años al ingresar pueden alojarse sin plaza de cama propia.';
  }
  if (sinCama.length > (habitacion.maxMenoresSinCama ?? 0)) {
    return (
      'Esta habitación admite como máximo ' +
      (habitacion.maxMenoresSinCama ?? 0) +
      ' menores sin plaza de cama propia.'
    );
  }
  if (
    huespedes.length - sinCama.length >
    (habitacion.plazasCama ?? habitacion.capacidad)
  ) {
    return 'Los huéspedes requieren más plazas de cama de las disponibles en esta habitación.';
  }
  return '';
}
