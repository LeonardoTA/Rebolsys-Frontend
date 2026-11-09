import { ClienteDatos } from '../../features/clientes/models/cliente.model';

export const nombre = (d: ClienteDatos) =>
  d.empresa
    ? d.razonSocial || ''
    : `${d.nombres || ''} ${d.apellidos || ''}`.trim();
