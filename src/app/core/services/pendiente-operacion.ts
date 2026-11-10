import { computed, signal } from "@angular/core";
import { SesionService } from "./sesion-service";

export function pendienteOperacion<T>(sesion: SesionService, nombre: string, defecto: T) {
  const memoria = signal<{ clave: string; valor: T } | null>(null);
  const clave = () => {
    const actual = sesion.actual();
    return actual?.modo === "ACTIVA" ? `rebolsys.cuenta.${actual.idUsuario}.${nombre}` : `rebolsys.${nombre}`;
  };
  const valor = computed(() => {
    const k = clave();
    const version = sesion.versionPendientes();
    const guardado = memoria();
    if (guardado?.clave === `${version}:${k}`) return guardado.valor;
    try {
      return (JSON.parse(sessionStorage.getItem(k) ?? "null") ?? defecto) as T;
    } catch {
      return defecto;
    }
  });

  const set = (datos: T) => {
    const k = clave();
    memoria.set({ clave: `${sesion.versionPendientes()}:${k}`, valor: datos });
    try {
      if (datos === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, JSON.stringify(datos));
    } catch {
      // La recuperación sigue disponible en memoria.
    }
  };
  return Object.assign(valor, { set, update: (actualizar: (datos: T) => T) => set(actualizar(valor())) });
}
