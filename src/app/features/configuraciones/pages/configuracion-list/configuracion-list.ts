import { PermisosUi } from "../../../../core/services/permisos-ui";
import {
  Component,
  inject,
  input,
  signal,
  computed,
  OnInit,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { forkJoin, Observable, of } from "rxjs";
import { ConfiguracionService } from "../../services/configuracion-service";
import {
  HabitacionConfig,
  ItemConfig,
  CatalogosConfig,
} from "../../models/configuracion.model";
import { CatalogoService } from "../../../../core/services/catalogo-service";
import { Catalogos } from "../../../../core/models/catalogo.model";
import { mensajeError } from "../../../../core/utils/http-error";
import { NotificacionService } from "../../../../core/services/notificacion.service";
import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { Icon } from "../../../../shared/components/icono/icono";

@Component({
  selector: "app-configuracion-list",
  imports: [FormsModule, CurrencyPipe, DialogFocus, Icon],
  templateUrl: "./configuracion-list.html",
  styleUrl: "./configuracion-list.css",
})
export class ConfiguracionList implements OnInit {
  readonly acceso = inject(PermisosUi);
  readonly modulo = computed(() => this.modo() === "habitaciones" ? "HABITACIONES" : "MOBILIARIO");
  modo = input<"habitaciones" | "mobiliario">("habitaciones");
  private servicio = inject(ConfiguracionService);
  private recepcion = inject(CatalogoService);
  private avisos = inject(NotificacionService);
  habitaciones = signal<HabitacionConfig[]>([]);
  items = signal<ItemConfig[]>([]);
  catalogos = signal<CatalogosConfig | null>(null);
  operadores = signal<Catalogos | null>(null);
  cargando = signal(true);
  ocupado = signal(false);
  error = signal("");
  errorModal = signal("");
  buscar = signal("");
  estado = signal("");
  editando = signal<
    | "habitacion"
    | "item"
    | "asignacion"
    | "conservacion"
    | "tipoHabitacion"
    | "tipoItem"
    | "baja"
    | null
  >(null);
  id: number | null = null;
  habitacion = {
    numeroCuarto: "",
    idTipoHabitacion: null as number | null,
    estadoHabitacion: "DISPONIBLE",
    capacidadPersonas: 1,
    plazasCama: 1,
    maxMenoresSinCama: 0,
    precioPorNoche: null as number | null,
  };
  item = {
    nombreItem: "",
    idTipoItem: null as number | null,
    estadoItem: "Activo",
  };
  asignacion = {
    idUsuario: null as number | null,
    idHabitacion: null as number | null,
    estadoActualItem: "BUENO",
    observacion: "",
  };
  tipo = { nombre: "", capacidadMax: 2, precioBase: 0 };
  private clave = crypto.randomUUID();
  private asignacionEnviada: any = null;
  operacionFijada = signal(false);
  habitacionesFiltradas = computed(() =>
    this.habitaciones().filter(
      (h) =>
        (!this.estado() || h.estadoHabitacion === this.estado()) &&
        `${h.numeroCuarto} ${h.nombreTipo}`
          .toLocaleLowerCase("es")
          .includes(this.buscar().trim().toLocaleLowerCase("es")),
    ),
  );
  itemsFiltrados = computed(() =>
    this.items().filter(
      (i) =>
        (!this.estado() || i.estadoItem === this.estado()) &&
        `${i.nombreItem} ${i.nombreTipo} ${i.numeroCuarto ?? ""}`
          .toLocaleLowerCase("es")
          .includes(this.buscar().trim().toLocaleLowerCase("es")),
    ),
  );
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set("");
    forkJoin({
      h: this.modo() === "habitaciones" || this.acceso.permite("MOBILIARIO:ASIGNAR")
        ? this.servicio.habitaciones() : of([] as HabitacionConfig[]),
      i: this.modo() === "mobiliario" ? this.servicio.mobiliario() : of([] as ItemConfig[]),
      c: this.servicio.catalogos(),
      o: this.recepcion.listar(),
    }).subscribe({
      next: ({ h, i, c, o }) => {
        this.habitaciones.set(
          h.sort((a, b) =>
            a.numeroCuarto.localeCompare(b.numeroCuarto, "es", {
              numeric: true,
            }),
          ),
        );
        this.items.set(i);
        this.catalogos.set(c);
        this.operadores.set(o);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
  abrirHabitacion(h?: HabitacionConfig) {
    this.id = h?.idHabitacion ?? null;
    this.habitacion = h
      ? {
          numeroCuarto: h.numeroCuarto,
          idTipoHabitacion: h.idTipoHabitacion,
          estadoHabitacion: h.estadoHabitacion,
          capacidadPersonas: h.capacidadPersonas,
          plazasCama: h.plazasCama,
          maxMenoresSinCama: h.maxMenoresSinCama,
          precioPorNoche: h.precioPorNoche,
        }
      : {
          numeroCuarto: "",
          idTipoHabitacion:
            this.catalogos()?.tiposHabitacion[0]?.idTipoHabitacion ?? null,
          estadoHabitacion: "DISPONIBLE",
          capacidadPersonas: 1,
          plazasCama: 1,
          maxMenoresSinCama: 0,
          precioPorNoche: null,
        };
    this.abrir("habitacion");
  }
  abrirItem(i?: ItemConfig) {
    this.id = i?.idItem ?? null;
    this.item = i
      ? {
          nombreItem: i.nombreItem,
          idTipoItem: i.idTipoItem,
          estadoItem: i.estadoItem,
        }
      : {
          nombreItem: "",
          idTipoItem: this.catalogos()?.tiposItem[0]?.idTipoItem ?? null,
          estadoItem: "Activo",
        };
    this.abrir("item");
  }
  abrir(accion: NonNullable<ReturnType<typeof this.editando>>) {
    this.errorModal.set("");
    this.operacionFijada.set(false);
    this.asignacionEnviada = null;
    this.clave = crypto.randomUUID();
    this.editando.set(accion);
  }
  abrirAsignacion(i: ItemConfig, conservacion = false) {
    this.id = i.idItem;
    this.item = {
      nombreItem: i.nombreItem,
      idTipoItem: i.idTipoItem,
      estadoItem: i.estadoItem,
    };
    this.asignacion = {
      idUsuario: this.operadores()?.usuarios?.[0]?.id ?? null,
      idHabitacion: i.idHabitacion,
      estadoActualItem: i.estadoActualItem ?? "BUENO",
      observacion: "",
    };
    this.abrir(conservacion ? "conservacion" : "asignacion");
  }
  abrirTipo() {
    this.tipo = { nombre: "", capacidadMax: 2, precioBase: 0 };
    this.abrir(this.modo() === "habitaciones" ? "tipoHabitacion" : "tipoItem");
  }
  baja(i: ItemConfig) {
    this.id = i.idItem;
    this.item = {
      nombreItem: i.nombreItem,
      idTipoItem: i.idTipoItem,
      estadoItem: i.estadoItem,
    };
    this.abrir("baja");
  }
  cerrar() {
    if (this.ocupado()) return;
    if (this.operacionFijada()) {
      this.errorModal.set(
        "Recupera la confirmación con el mismo movimiento antes de cerrar.",
      );
      return;
    }
    this.editando.set(null);
  }
  guardar() {
    if (this.ocupado()) return;
    this.errorModal.set("");
    const modo = this.editando();
    let obs: Observable<unknown>;
    if (modo === "habitacion") {
      const h = this.habitacion;
      if (
        !h.numeroCuarto.trim() ||
        !h.idTipoHabitacion ||
        ![h.capacidadPersonas, h.plazasCama, h.maxMenoresSinCama].every(
          Number.isInteger,
        ) ||
        h.capacidadPersonas < 1 ||
        h.plazasCama < 1 ||
        h.plazasCama > h.capacidadPersonas ||
        h.maxMenoresSinCama < 0 || h.maxMenoresSinCama > 1 ||
        h.maxMenoresSinCama >= h.capacidadPersonas
      ) {
        this.errorModal.set("Revisa número, tipo y límites de ocupación.");
        return;
      }
      if (
        h.precioPorNoche !== null &&
        (!Number.isFinite(h.precioPorNoche) ||
          h.precioPorNoche < 0 ||
          Math.abs(
            h.precioPorNoche * 100 - Math.round(h.precioPorNoche * 100),
          ) > 1e-6)
      ) {
        this.errorModal.set(
          "El precio debe ser positivo o cero, con hasta dos decimales.",
        );
        return;
      }
      obs = this.servicio.guardarHabitacion(this.id, {
        ...h,
        numeroCuarto: h.numeroCuarto.trim(),
        idTipoHabitacion: h.idTipoHabitacion,
      });
    } else if (modo === "item") {
      if (!this.item.nombreItem.trim() || !this.item.idTipoItem) {
        this.errorModal.set("Completa el nombre y tipo del mueble.");
        return;
      }
      obs = this.servicio.guardarItem(this.id, {
        ...this.item,
        nombreItem: this.item.nombreItem.trim(),
        idTipoItem: this.item.idTipoItem,
      });
    } else if (modo === "asignacion" || modo === "conservacion") {
      if (!this.asignacion.idUsuario || !this.asignacion.observacion.trim()) {
        this.errorModal.set("Selecciona el operador y escribe el motivo.");
        return;
      }
      this.asignacionEnviada ??= {
        ...this.asignacion,
        idUsuario: this.asignacion.idUsuario,
        observacion: this.asignacion.observacion.trim(),
        claveOperacion: this.clave,
      };
      this.operacionFijada.set(true);
      obs =
        modo === "asignacion"
          ? this.servicio.asignar(this.id!, this.asignacionEnviada)
          : this.servicio.conservacion(this.id!, this.asignacionEnviada);
    } else if (modo === "tipoHabitacion") {
      if (
        !this.tipo.nombre.trim() ||
        !Number.isInteger(this.tipo.capacidadMax) ||
        this.tipo.capacidadMax < 1
      ) {
        this.errorModal.set(
          "Completa el nombre y la capacidad máxima del tipo.",
        );
        return;
      }
      obs = this.servicio.crearTipoHabitacion({
        nombreTipo: this.tipo.nombre.trim(),
        capacidadMax: this.tipo.capacidadMax,
        precioBase: this.tipo.precioBase,
      });
    } else if (modo === "tipoItem") {
      if (!this.tipo.nombre.trim()) {
        this.errorModal.set("Completa el nombre del tipo.");
        return;
      }
      obs = this.servicio.crearTipoItem(this.tipo.nombre.trim());
    } else if (modo === "baja") obs = this.servicio.desactivarItem(this.id!);
    else return;
    this.ocupado.set(true);
    obs.subscribe({
      next: () => {
        this.ocupado.set(false);
        this.editando.set(null);
        this.avisos.mostrar("Configuración guardada.");
        this.cargar();
      },
      error: (e) => {
        this.ocupado.set(false);
        if (e.status >= 400 && e.status < 500) {
          this.asignacionEnviada = null;
          this.operacionFijada.set(false);
          this.clave = crypto.randomUUID();
        }
        this.errorModal.set(mensajeError(e));
      },
    });
  }
}
