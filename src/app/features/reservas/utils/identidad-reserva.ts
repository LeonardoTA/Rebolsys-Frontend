import { ClienteDatos } from '../../clientes/models/cliente.model';

export function claveDocumento(persona: Pick<ClienteDatos, 'idTipoDocumento' | 'numeroDocumento'>) {
  return `${persona.idTipoDocumento}:${persona.numeroDocumento.trim().toUpperCase()}`;
}

function claveTelefono(telefono: string | null) {
  const numero = telefono?.replace(/\D/g, '') ?? '';
  return numero.replace(/^(?:00)?51(?=9\d{8}$)/, '');
}

function normalizarNombre(valor: string | null) {
  return valor?.trim().toUpperCase() ?? '';
}

export function errorIdentidadesReserva(titular: ClienteDatos, huespedes: ClienteDatos[]): string {
  const documentoTitular = claveDocumento(titular);
  const documentos = new Set<string>();
  const telefonos = new Map<string, string>();
  const telefonoTitular = claveTelefono(titular.telefono);
  if (telefonoTitular) telefonos.set(telefonoTitular, documentoTitular);

  for (const huesped of huespedes) {
    const documento = claveDocumento(huesped);
    if (documentos.has(documento)) return 'Este documento ya está registrado para un huésped de la reserva.';
    documentos.add(documento);

    if (documento === documentoTitular &&
        (titular.empresa !== huesped.empresa ||
         titular.fechaNacimiento !== huesped.fechaNacimiento ||
         normalizarNombre(titular.nombres) !== normalizarNombre(huesped.nombres) ||
         normalizarNombre(titular.apellidos) !== normalizarNombre(huesped.apellidos))) {
      return 'El titular y un huésped tienen el mismo documento con datos distintos. Revisa su identidad.';
    }

    const telefono = claveTelefono(huesped.telefono);
    if (!telefono) continue;
    const anterior = telefonos.get(telefono);
    if (anterior && anterior !== documento) return 'Este número de celular ya está asociado a otra persona de la reserva.';
    telefonos.set(telefono, documento);
  }
  return '';
}
