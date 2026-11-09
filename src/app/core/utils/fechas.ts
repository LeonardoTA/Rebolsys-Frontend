export function fechaLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function noches(ingreso: string, salida: string): number {
  const diferencia = new Date(salida).getTime() - new Date(ingreso).getTime();
  return diferencia > 0 ? Math.max(1, Math.ceil(diferencia / 86400000)) : 0;
}
