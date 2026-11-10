import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { NotificacionService } from "../../../../core/services/notificacion.service";
import { Catalogos } from "../../../../core/models/catalogo.model";
import { ClienteDatos } from "../../../clientes/models/cliente.model";
import { Habitacion } from "../../../habitaciones/models/habitacion.model";
import { Huesped, Registro, Estancia } from "../../models/reserva.model";
import { fechaLocal, noches } from "../../../../core/utils/fechas";
import { nombre } from "../../../../core/utils/texto";
import { mensajeError } from "../../../../core/utils/http-error";
import { Icon } from "../../../../shared/components/icono/icono";
import { PagoModal } from "../../../../shared/components/pago-modal/pago-modal";
import { CatalogoService } from "../../../../core/services/catalogo-service";
import { ClienteService } from "../../../clientes/services/cliente-service";
import { HabitacionService } from "../../../habitaciones/services/habitacion-service";
import { ReservaService } from "../../services/reserva-service";
import { esMenorDeSiete, errorOcupacion } from "../../utils/ocupacion";
import { claveDocumento, errorIdentidadesReserva } from "../../utils/identidad-reserva";
import {
  ConfirmacionPago,
  RegistroReservaApi,
  ReservaApi,
} from "../../models/reserva-api.model";

import { Component, inject, signal, computed, DestroyRef } from "@angular/core";
import {
  ReactiveFormsModule,
  FormsModule,
  UntypedFormBuilder,
  FormArray,
  FormGroup,
  Validators,
} from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  forkJoin,
  catchError,
  map,
  throwError,
  concatMap,
  of,
  debounceTime,
} from "rxjs";
import { DocumentoConsultaService } from "../../../clientes/services/documento-consulta-service";
import {
  tipoDocumento,
  fechaNacimientoValida,
  titularAdulto,
  esAdulto,
} from "../../../clientes/utils/persona-validacion";

@Component({
  selector: "app-reserva-form",
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CurrencyPipe,
    RouterLink,
    Icon,
    PagoModal,
    DialogFocus,
  ],
  templateUrl: "./reserva-form.html",
  styleUrl: "./reserva-form.css",
})
export class ReservaForm {
  private readonly catalogoService = inject(CatalogoService);
  private readonly clienteService = inject(ClienteService);
  private readonly documentoConsultaService = inject(DocumentoConsultaService);
  private readonly habitacionService = inject(HabitacionService);
  private readonly reservaService = inject(ReservaService);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);
  private avisos = inject(NotificacionService);
  private fb = inject(UntypedFormBuilder);
  private destroy = inject(DestroyRef);
  catalogos = signal<Catalogos | null>(null);
  rooms = signal<Habitacion[]>([]);
  cargando = signal(true);
  errorCarga = signal("");
  guardando = signal(false);
  editandoHuesped = signal<number | null>(null);
  private clienteClave = "";
  buscando = signal(false);
  clienteMensaje = signal("");
  pagoAbierto = signal(false);
  huespedEn = signal<number | null>(null);
  guestMensaje = signal("");
  buscandoHuesped = signal(false);
  private consultaClienteId = 0;
  private consultaHuespedId = 0;
  tick = signal(0);
  hoy = fechaLocal(new Date());
  nombre = nombre;
  private clave = crypto.randomUUID();
  private solicitud: Registro | null = null;
  idUsuario = signal<number | null>(null);
  reservaRegistrada = signal<ReservaApi | null>(null);
  registroIniciado = signal(false);
  pagoFijado = signal(false);
  comprobando = signal(false);
  errorDisponibilidad = signal("");
  private consultaDisponibilidad = 0;
  private solicitudApi: RegistroReservaApi | null = null;
  private clavePago = crypto.randomUUID();
  private pagoEnviado: ConfirmacionPago | null = null;
  form = this.fb.group({
    cliente: this.fb.group({
      idTipoDocumento: [null, Validators.required],
      numeroDocumento: ["", [Validators.required, Validators.maxLength(50)]],
      empresa: [false],
      nombres: [""],
      apellidos: [""],
      fechaNacimiento: [""],
      razonSocial: [""],
      direccionFiscal: [""],
      correo: ["", [Validators.email, Validators.maxLength(100)]],
      telefono: ["", Validators.maxLength(15)],
    }),
    habitaciones: this.fb.array([]),
  });
  guestForm = this.fb.group({
    ocupaPlazaCama: [true],
    idTipoDocumento: [null, Validators.required],
    numeroDocumento: ["", [Validators.required, Validators.maxLength(50)]],
    nombres: ["", [Validators.required, Validators.maxLength(100)]],
    apellidos: ["", [Validators.required, Validators.maxLength(100)]],
    telefono: ["", Validators.maxLength(15)],
    fechaNacimiento: ["", [Validators.required, fechaNacimientoValida]],
    idTipoOcupante: [null],
  });
  anadirMenores = signal(false);
  menores = this.fb.array([]);
  private menoresOriginales: Huesped[] = [];
  consultasMenor = new WeakMap<FormGroup, number>();
  documentosPersonales() {
    return (
      this.catalogos()?.documentos.filter((d) => tipoDocumento(d) !== "RUC") ||
      []
    );
  }
  grupoMenor(i: number) {
    return this.menores.at(i) as FormGroup;
  }
  cambiarMenores(activado: boolean) {
    this.anadirMenores.set(activado);
    if (!activado) this.menores.clear();
    else if (!this.menores.length) {
      if (this.menoresOriginales.length)
        this.menoresOriginales.forEach((m) => this.agregarMenor(m));
      else this.agregarMenor();
    }
  }
  agregarMenor(actual?: Huesped) {
    const grupo = this.fb.group({
      idTipoDocumento: [
        this.documentosPersonales()[0]?.id || null,
        Validators.required,
      ],
      numeroDocumento: ["", Validators.required],
      nombres: ["", [Validators.required, Validators.maxLength(100)]],
      apellidos: ["", [Validators.required, Validators.maxLength(100)]],
      telefono: ["", Validators.maxLength(15)],
      fechaNacimiento: ["", [Validators.required, fechaNacimientoValida]],
      idTipoOcupante: [
        this.catalogos()?.ocupantes.find(
          (t) => t.nombre.toLocaleLowerCase("es") === "acompañante",
        )?.id ||
          this.catalogos()?.ocupantes[0]?.id ||
          null,
      ],
      parentesco: [null, Validators.required],
      ocupaPlazaCama: [true],
      idHuesped: [actual?.idHuesped ?? null],
      personaAnterior: [actual?.persona ?? null],
    });
    grupo
      .get("idTipoDocumento")!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.validarDocumento(grupo));
    this.validarDocumento(grupo);
    grupo
      .get("fechaNacimiento")!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.actualizarCasillaCama(grupo));
    this.actualizarCasillaCama(grupo);
    this.menores.push(grupo);
    if (actual)
      grupo.patchValue({
        ...actual.persona,
        idTipoOcupante: actual.idTipoOcupante,
        parentesco: actual.responsable?.parentesco ?? null,
        ocupaPlazaCama: actual.ocupaPlazaCama !== false,
      });
  }
  buscarMenor(i: number) {
    const grupo = this.grupoMenor(i);
    this.validarDocumento(grupo);
    if (grupo.get("idTipoDocumento")!.invalid || grupo.get("numeroDocumento")!.invalid) {
      this.alertar(this.mensajeDocumento(grupo) || "Selecciona el tipo de documento.");
      return;
    }
    const { idTipoDocumento, numeroDocumento } = grupo.getRawValue();
    const numero = numeroDocumento.trim();
    const id = (this.consultasMenor.get(grupo) || 0) + 1;
    this.consultasMenor.set(grupo, id);
    this.guestMensaje.set("Consultando documento del menor…");
    this.consultarPersona(idTipoDocumento, numero)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (resultado) => {
          if (
            !this.menores.controls.includes(grupo) ||
            this.consultasMenor.get(grupo) !== id
          )
            return;
          const actual = grupo.getRawValue();
          if (
            actual.idTipoDocumento !== idTipoDocumento ||
            actual.numeroDocumento.trim() !== numero
          )
            return;
          grupo.patchValue(resultado.datos);
          this.guestMensaje.set(
            "Revisa los nombres y completa la fecha de nacimiento del menor.",
          );
        },
        error: (error) => {
          if (
            this.menores.controls.includes(grupo) &&
            this.consultasMenor.get(grupo) === id
          ) {
            this.guestMensaje.set("");
            this.alertar(mensajeError(error));
          }
        },
      });
  }
  esMenor(g: Huesped, i: number) {
    return !esAdulto(
      g.persona.fechaNacimiento,
      this.habitaciones.at(i).get("fechaIngreso")!.value.slice(0, 10),
    );
  }
  adultos(i: number) {
    return this.guests(i).filter((g) => !this.esMenor(g, i));
  }
  clavePersona(g: Huesped) {
    return claveDocumento(g.persona);
  }
  responsableSeleccionado(g: Huesped) {
    return g.responsable
      ? claveDocumento(g.responsable)
      : "";
  }
  asignarResponsable(
    i: number,
    gi: number,
    clave: string,
    parentesco?: string,
  ) {
    const lista = this.guests(i);
    const g = lista[gi];
    const adulto = this.adultos(i).find((a) => this.clavePersona(a) === clave);
    this.habitaciones
      .at(i)
      .get("huespedes")!
      .setValue(
        lista.map((h, j) =>
          j !== gi
            ? h
            : {
                ...h,
                responsable: adulto
                  ? {
                      idTipoDocumento: adulto.persona.idTipoDocumento,
                      numeroDocumento: adulto.persona.numeroDocumento,
                      parentesco: (parentesco ||
                        g.responsable?.parentesco ||
                        null) as "PADRE" | "MADRE" | "TUTOR",
                    }
                  : null,
              },
        ),
      );
  }
  total = computed(() => {
    this.tick();
    return this.habitaciones.controls.reduce(
      (n, _, i) => n + this.costoLinea(i),
      0,
    );
  });
  get cliente() {
    return this.form.get("cliente") as FormGroup;
  }
  get habitaciones() {
    return this.form.get("habitaciones") as FormArray;
  }
  constructor() {
    this.guestForm
      .get("fechaNacimiento")!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.actualizarCasillaCama(this.guestForm));
    this.cliente
      .get("idTipoDocumento")!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        {
          const tipo = this.tipoDocumentoGrupo(this.cliente);
          if (tipo === "DNI")
            this.cliente.get("empresa")!.setValue(false, { emitEvent: false });
        }
        this.validarCliente();
      });
    this.guestForm
      .get("idTipoDocumento")!
      .valueChanges.pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.validarDocumento(this.guestForm));
    this.cliente.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (
          !this.clienteClave ||
          this.esEmpresa() ||
          this.claveClienteActual() !== this.clienteClave
        )
          return;
        const datos = this.datosCliente();
        const huespedes = this.habitaciones.controls.flatMap((_, i) =>
          this.guests(i).map((g) => this.clavePersona(g) === this.clienteClave ? datos : g.persona),
        );
        if (!errorIdentidadesReserva(datos, huespedes)) this.sincronizarPersona(this.clienteClave, datos);
      });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.tick.update((n) => n + 1));
    this.habitaciones.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.actualizarDisponibilidad());
  }
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.errorCarga.set("");
    let end = new Date();
    end.setDate(end.getDate() + 7);
    forkJoin({
      catalogos: this.catalogoService.listar(),
      rooms: this.habitacionService.listar(this.hoy, fechaLocal(end)),
    }).subscribe({
      next: ({ catalogos, rooms }) => {
        this.catalogos.set(catalogos);
        this.rooms.set(rooms);
        {
          this.idUsuario.set(
            this.idUsuario() ?? catalogos.usuarios?.[0]?.id ?? null,
          );
          if (!this.habitaciones.length) {
            this.agregarHabitacion();
            const id = Number(
              this.ruta.snapshot.queryParamMap.get("habitacion"),
            );
            const desde = this.ruta.snapshot.queryParamMap.get("desde");
            if (rooms.some((r) => r.idHabitacion === id))
              this.habitaciones.at(0).patchValue({ idHabitacion: id });
            if (
              desde &&
              /^\d{4}-\d{2}-\d{2}$/.test(desde) &&
              Number.isFinite(new Date(desde + "T00:00:00").getTime())
            ) {
              const salida = new Date(desde + "T00:00:00");
              salida.setDate(salida.getDate() + 1);
              this.habitaciones
                .at(0)
                .patchValue({
                  fechaIngreso: desde + "T14:00",
                  fechaSalida: fechaLocal(salida) + "T12:00",
                });
            }
          }
          this.cliente.patchValue({
            idTipoDocumento: catalogos.documentos[0]?.id || null,
          });
          this.validarCliente();
          this.cargando.set(false);
        }
      },
      error: (e) => {
        this.cargando.set(false);
        this.errorCarga.set(mensajeError(e));
        this.alertar(this.errorCarga());
      },
    });
  }
  esEmpresa() {
    return !!this.cliente.get("empresa")?.value;
  }
  actualizarDisponibilidad() {
    if (this.registroIniciado()) return;
    const fechas = this.habitaciones.getRawValue() as Estancia[];
    if (
      !fechas.length ||
      fechas.some(
        (h) =>
          !h.fechaIngreso ||
          !h.fechaSalida ||
          !noches(h.fechaIngreso, h.fechaSalida),
      )
    )
      return;
    const desde = fechas.map((h) => h.fechaIngreso.slice(0, 10)).sort()[0];
    const final = fechas
      .map((h) => h.fechaSalida.slice(0, 10))
      .sort()
      .at(-1)!;
    const hasta = new Date(final + "T00:00:00");
    hasta.setDate(hasta.getDate() + 1);
    const id = ++this.consultaDisponibilidad;
    this.comprobando.set(true);
    this.errorDisponibilidad.set("");
    this.habitacionService
      .listar(desde, fechaLocal(hasta))
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rooms) => {
          if (id === this.consultaDisponibilidad) {
            this.rooms.set(rooms);
            this.comprobando.set(false);
          }
        },
        error: (e) => {
          if (id === this.consultaDisponibilidad) {
            this.comprobando.set(false);
            this.errorDisponibilidad.set(mensajeError(e));
            this.alertar(this.errorDisponibilidad());
          }
        },
      });
  }
  validarCliente() {
    if (this.esEmpresa() && this.tipoDocumentoGrupo(this.cliente) === "DNI") {
      const ruc = this.catalogos()?.documentos.find(
        (documento) => tipoDocumento(documento) === "RUC",
      );
      if (ruc)
        this.cliente
          .get("idTipoDocumento")!
          .setValue(ruc.id, { emitEvent: false });
    }
    this.validarDocumento(this.cliente);
    const nacimiento = this.cliente.get("fechaNacimiento")!;
    nacimiento.setValidators(
      this.esEmpresa()
        ? []
        : [Validators.required, fechaNacimientoValida, titularAdulto],
    );
    nacimiento.updateValueAndValidity();
    for (const name of ["nombres", "apellidos"]) {
      this.cliente
        .get(name)!
        .setValidators(
          this.esEmpresa()
            ? [Validators.maxLength(100)]
            : [Validators.required, Validators.maxLength(100)],
        );
      this.cliente.get(name)!.updateValueAndValidity();
    }
    this.cliente
      .get("razonSocial")!
      .setValidators(
        this.esEmpresa()
          ? [Validators.required, Validators.maxLength(250)]
          : [Validators.maxLength(250)],
      );
    this.cliente.get("razonSocial")!.updateValueAndValidity();
  }
  tipoDocumentoGrupo(grupo: FormGroup) {
    return tipoDocumento(
      this.catalogos()?.documentos.find(
        (documento) => documento.id === grupo.get("idTipoDocumento")?.value,
      ),
    );
  }

  validarDocumento(grupo: FormGroup) {
    const tipo = this.tipoDocumentoGrupo(grupo);
    const validators = [Validators.required, Validators.maxLength(50)];
    if (tipo === "DNI") validators.push(Validators.pattern(/^[0-9]{8}$/));
    if (tipo === "RUC") validators.push(Validators.pattern(/^[0-9]{11}$/));
    if (tipo === "OTRO") validators.push(Validators.pattern(/\S/));
    grupo.get("numeroDocumento")!.setValidators(validators);
    grupo.get("numeroDocumento")!.updateValueAndValidity();
  }

  mensajeDocumento(grupo: FormGroup): string {
    const error = grupo.get("numeroDocumento")?.errors;
    if (!error) return "";
    if (error["required"]) return "El número de documento es obligatorio";
    if (error["pattern"]) {
      const tipo = this.tipoDocumentoGrupo(grupo);
      if (tipo === "DNI") return "El DNI debe contener exactamente 8 dígitos";
      if (tipo === "RUC") return "El RUC debe contener exactamente 11 dígitos";
      return "Ingresa un número de documento válido";
    }
    return "El número de documento no debe superar 50 caracteres";
  }

  mensajeNacimiento(grupo: FormGroup, esTitular = false): string {
    const error = grupo.get("fechaNacimiento")?.errors;
    if (!error) return "";
    if (error["required"])
      return esTitular
        ? "La fecha de nacimiento del titular es obligatoria"
        : "La fecha de nacimiento de cada huésped es obligatoria";
    if (error["fechaNacimiento"])
      return "La fecha de nacimiento no puede ser futura";
    if (error["titularMenor"])
      return "El titular de la reserva debe tener al menos 18 años";
    return "Revisa la fecha de nacimiento";
  }

  private consultarPersona(tipoId: number, numero: string) {
    const tipo = tipoDocumento(
      this.catalogos()?.documentos.find((documento) => documento.id === tipoId),
    );
    return this.clienteService.buscarPorDocumento(tipoId, numero).pipe(
      map((cliente) => ({
        datos: cliente.datos as Partial<ClienteDatos>,
        origen: "local",
      })),
      catchError((error) => {
        if (error.status !== 404 || tipo === "OTRO")
          return throwError(() => error);
        return this.documentoConsultaService.consultar(tipo, numero).pipe(
          map((documento) => ({
            datos: (tipo === "DNI"
              ? {
                  empresa: false,
                  nombres: documento.nombres,
                  apellidos: documento.apellidos,
                }
              : {
                  empresa: true,
                  razonSocial: documento.razonSocial,
                  direccionFiscal: documento.direccionFiscal,
                }) as Partial<ClienteDatos>,
            origen: "apisperu",
          })),
        );
      }),
    );
  }

  buscarCliente() {
    this.validarDocumento(this.cliente);
    const { idTipoDocumento, numeroDocumento } = this.cliente.getRawValue();
    if (!idTipoDocumento || this.cliente.get("numeroDocumento")!.invalid) {
      this.alertar(
        this.mensajeDocumento(this.cliente) ||
          "Selecciona el tipo de documento",
      );
      return;
    }
    const id = ++this.consultaClienteId;
    const numero = numeroDocumento.trim();
    this.buscando.set(true);
    this.clienteMensaje.set("");
    this.consultarPersona(idTipoDocumento, numero)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (resultado) => {
          if (id !== this.consultaClienteId) return;
          this.buscando.set(false);
          const actual = this.cliente.getRawValue();
          if (
            actual.idTipoDocumento !== idTipoDocumento ||
            actual.numeroDocumento.trim() !== numero
          )
            return;
          const datos = { ...resultado.datos };
          if (resultado.origen !== 'local' && this.tipoDocumentoGrupo(this.cliente) === 'RUC' && !this.esEmpresa()) {
            delete datos.empresa; delete datos.razonSocial;
          }
          this.cliente.patchValue(datos);
          this.validarCliente();
          this.clienteMensaje.set(
            resultado.origen === "local"
              ? "Cliente encontrado en el hospedaje. Revisa sus datos."
              : "Datos obtenidos de APIs Perú. Revisa los datos y completa la fecha de nacimiento si corresponde.",
          );
        },
        error: (error) => {
          if (id === this.consultaClienteId) {
            this.buscando.set(false);
            this.alertar(mensajeError(error));
          }
        },
      });
  }

  buscarHuesped() {
    this.validarDocumento(this.guestForm);
    const { idTipoDocumento, numeroDocumento } = this.guestForm.getRawValue();
    if (!idTipoDocumento || this.guestForm.get("numeroDocumento")!.invalid) {
      this.alertar(
        this.mensajeDocumento(this.guestForm) ||
          "Selecciona el tipo de documento",
      );
      return;
    }
    const id = ++this.consultaHuespedId;
    const numero = numeroDocumento.trim();
    this.buscandoHuesped.set(true);
    this.guestMensaje.set("");
    this.consultarPersona(idTipoDocumento, numero)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (resultado) => {
          if (id !== this.consultaHuespedId || this.huespedEn() === null) return;
          this.buscandoHuesped.set(false);
          const actual = this.guestForm.getRawValue();
          if (
            actual.idTipoDocumento !== idTipoDocumento ||
            actual.numeroDocumento.trim() !== numero
          )
            return;
          if (resultado.datos.empresa) {
            this.alertar(
              "El huésped debe ser una persona natural; utiliza su DNI o documento personal.",
            );
            return;
          }
          this.guestForm.patchValue(resultado.datos);
          this.guestMensaje.set(
            resultado.origen === "local"
              ? "Huésped encontrado en el hospedaje."
              : "Nombres obtenidos de APIs Perú. Completa su fecha de nacimiento.",
          );
        },
        error: (error) => {
          if (id === this.consultaHuespedId && this.huespedEn() !== null) {
            this.buscandoHuesped.set(false);
            this.alertar(mensajeError(error));
          }
        },
      });
  }

  agregarHabitacion(line?: Estancia) {
    const primera = this.habitaciones.at(0)?.getRawValue() as Estancia | undefined;
    const today = this.hoy,
      next = new Date();
    next.setDate(next.getDate() + 1);
    this.habitaciones.push(
      this.fb.group({
        idHabitacion: [line?.idHabitacion || null, Validators.required],
        fechaIngreso: [
          line?.fechaIngreso?.slice(0, 16) || primera?.fechaIngreso || today + "T14:00",
          Validators.required,
        ],
        fechaSalida: [
          line?.fechaSalida?.slice(0, 16) || primera?.fechaSalida || fechaLocal(next) + "T12:00",
          Validators.required,
        ],
        huespedes: [line?.huespedes || []],
      }),
    );
  }
  quitarHabitacion(i: number) {
    if (this.habitaciones.length > 1) this.habitaciones.removeAt(i);
  }
  roomFor(i: number) {
    return this.rooms().find(
      (r) =>
        r.idHabitacion === this.habitaciones.at(i)?.get("idHabitacion")?.value,
    );
  }
  yaElegida(id: number, i: number) {
    return this.habitaciones.controls.some(
      (line, j) => j !== i && line.get("idHabitacion")!.value === id,
    );
  }
  nochesLinea(i: number) {
    const line = this.habitaciones.at(i).value;
    return noches(line.fechaIngreso, line.fechaSalida);
  }
  costoLinea(i: number) {
    return this.nochesLinea(i) * (this.roomFor(i)?.precio || 0);
  }
  guests(i: number): Huesped[] {
    return this.habitaciones.at(i).get("huespedes")!.value;
  }
  tipoOcupante(id: number) {
    return (
      this.catalogos()?.ocupantes.find((t) => t.id === id)?.nombre || "Huésped"
    );
  }
  lineError(i: number) {
    const line = this.habitaciones.at(i).value;
    if (line.fechaIngreso && line.fechaSalida && this.nochesLinea(i) === 0)
      return "La salida debe ser posterior al ingreso.";
    const room = this.roomFor(i);
    if (room) {
      if (room.precio <= 0) return 'La tarifa de esta habitación está pendiente. Configura el precio antes de registrar una reserva.';
      if (room.estado !== "DISPONIBLE" || room.ocupadaActualmente)
        return "La habitación no está disponible físicamente.";
      if (this.yaElegida(room.idHabitacion, i))
        return "Selecciona cada habitación una sola vez.";
      if (
        room.reservas.some(
          (r) =>
            r.estado === "EN_CURSO" ||
            (new Date(line.fechaIngreso).getTime() <
              new Date(r.salida).getTime() &&
              new Date(line.fechaSalida).getTime() >
                new Date(r.ingreso).getTime()),
        )
      )
        return "La habitación ya tiene una reserva en este horario. Elige otra habitación o cambia las fechas.";
      const error = errorOcupacion(room, this.guests(i), line.fechaIngreso);
      if (error) return error;
    }
    for (const g of this.guests(i)) {
      if (!g.persona.fechaNacimiento)
        return "Completa la fecha de nacimiento de cada huésped.";
      if (
        this.esMenor(g, i) &&
        (!g.responsable?.parentesco ||
          !this.adultos(i).some(
            (a) => this.clavePersona(a) === this.responsableSeleccionado(g),
          ))
      )
        return "Cada menor debe tener un padre, madre o tutor adulto en esta misma habitación.";
    }
    return "";
  }
  avisarErrorHabitacion(i: number) {
    const error = this.lineError(i);
    if (error) this.alertar(error);
  }
  actualizarCasillaCama(grupo: FormGroup) {
    const i = this.huespedEn();
    const cama = grupo.get("ocupaPlazaCama");
    if (i === null || !cama) return;
    const ingreso = this.habitaciones.at(i).get("fechaIngreso")!.value;
    const permitido =
      esMenorDeSiete(grupo.get("fechaNacimiento")!.value, ingreso) &&
      (this.roomFor(i)?.maxMenoresSinCama ?? 0) > 0;
    if (permitido) cama.enable({ emitEvent: false });
    else {
      cama.setValue(true, { emitEvent: false });
      cama.disable({ emitEvent: false });
    }
  }
  resumenOcupacion(i: number) {
    const lista = this.guests(i);
    const sinCama = lista.filter((g) => g.ocupaPlazaCama === false).length;
    return (
      lista.length +
      (lista.length === 1 ? " huésped · " : " huéspedes · ") +
      (lista.length - sinCama) +
      "/" +
      (this.roomFor(i)?.plazasCama ?? this.roomFor(i)?.capacidad ?? 0) +
      " plazas utilizadas · " +
      sinCama +
      (sinCama === 1 ? " menor sin plaza propia" : " menores sin plaza propia")
    );
  }
  notaCama(grupo:FormGroup=this.guestForm) {
    const i = this.huespedEn();
    if(i!==null&&grupo.get('fechaNacimiento')?.value&&!esMenorDeSiete(grupo.get('fechaNacimiento')!.value,this.habitaciones.at(i).get('fechaIngreso')!.value))return 'Desde los 7 años al ingresar se necesita una plaza de cama propia.';
    return i !== null && (this.roomFor(i)?.maxMenoresSinCama ?? 0) === 0
      ? "Esta habitación no admite menores sin plaza propia. Revisa sus límites en Configuraciones → Habitaciones."
      : "Puedes desmarcar la casilla para un menor de 7 años al ingresar que comparta cama con su responsable. Máximo un menor adicional sin plaza propia por habitación.";
  }
  abrirHuesped(i: number) {
    this.editandoHuesped.set(null);
    this.huespedEn.set(i);
    this.menores.clear();
    this.menoresOriginales = [];
    this.anadirMenores.set(false);
    this.guestMensaje.set("");
    this.consultaHuespedId++;
    this.buscandoHuesped.set(false);
    this.guestForm.reset({
      idTipoDocumento: this.documentosPersonales()[0]?.id,
      idTipoOcupante: this.catalogos()?.ocupantes[0]?.id,
      numeroDocumento: "",
      nombres: "",
      apellidos: "",
      telefono: "",
      fechaNacimiento: "",
      ocupaPlazaCama: true,
    });
  }
  editarHuesped(i: number, gi: number) {
    this.abrirHuesped(i);
    this.editandoHuesped.set(gi);
    const g = this.guests(i)[gi];
    this.guestForm.patchValue({
      ...g.persona,
      idTipoOcupante: g.idTipoOcupante,
      ocupaPlazaCama: g.ocupaPlazaCama !== false,
    });
    if (!this.esMenor(g, i)) {
      this.menoresOriginales = this.guests(i).filter(
        (h) => this.responsableSeleccionado(h) === this.clavePersona(g),
      );
      this.anadirMenores.set(this.menoresOriginales.length > 0);
      this.menoresOriginales.forEach((h) => this.agregarMenor(h));
    }
  }
  puedeEditarMenores() {
    const i = this.huespedEn();
    const gi = this.editandoHuesped();
    return i !== null && (gi === null || !this.esMenor(this.guests(i)[gi], i));
  }
  menoresQueSeRetiran() {
    return this.anadirMenores()
      ? []
      : this.menoresOriginales.map((h) => nombre(h.persona));
  }
  private sincronizarPersona(clave: string, persona: ClienteDatos) {
    this.habitaciones.controls.forEach((h) => {
      const lista = h.get("huespedes")!.value as Huesped[];
      h.get("huespedes")!.setValue(
        lista.map((g) => ({
          ...g,
          persona: this.clavePersona(g) === clave ? { ...persona } : g.persona,
          responsable:
            g.responsable && this.responsableSeleccionado(g) === clave
              ? {
                  ...g.responsable,
                  idTipoDocumento: persona.idTipoDocumento!,
                  numeroDocumento: persona.numeroDocumento,
                }
              : g.responsable,
        })),
      );
    });
  }
  usarCliente() {
    this.clienteClave = this.claveClienteActual();
    this.guestForm.patchValue(this.cliente.getRawValue());
  }
  private claveClienteActual() {
    return claveDocumento(this.cliente.getRawValue());
  }
  private alertar(mensaje: string) {
    this.avisos.mostrar(mensaje, true);
  }
  guardarHuesped() {
    const index = this.huespedEn();
    if (index === null) return;
    this.guestForm.markAllAsTouched();
    if (this.guestForm.invalid) {
      this.alertar(
        this.mensajeDocumento(this.guestForm) ||
          this.mensajeNacimiento(this.guestForm) ||
          "Completa el documento, nombres, apellidos y tipo de ocupante.",
      );
      return;
    }
    const v = this.guestForm.getRawValue();
    const editando = this.editandoHuesped();
    const anterior = editando === null ? null : this.guests(index)[editando];
    const ingreso = this.habitaciones
      .at(index)
      .get("fechaIngreso")!
      .value.slice(0, 10);
    if (!esAdulto(v.fechaNacimiento, ingreso) && !anterior?.responsable) {
      this.alertar(
        "Registra primero al adulto y usa «Añadir menores a su cargo» para incluir al menor.",
      );
      return;
    }
    this.menores.markAllAsTouched();
    for (const control of this.menores.controls) {
      const grupo = control as FormGroup;
      this.validarDocumento(grupo);
      if (
        grupo.invalid ||
        esAdulto(grupo.get("fechaNacimiento")!.value, ingreso)
      ) {
        this.alertar(
          this.mensajeDocumento(grupo) ||
            this.mensajeNacimiento(grupo) ||
            "Completa los datos del menor y el parentesco; debe tener menos de 18 años al ingresar.",
        );
        return;
      }
    }
    const titular = this.datosCliente();
    const editaTitular = anterior !== null &&
      this.clavePersona(anterior) === claveDocumento(titular) &&
      !errorIdentidadesReserva(titular, [anterior.persona]);
    const persona: ClienteDatos = {
      idTipoDocumento: v.idTipoDocumento,
      numeroDocumento: v.numeroDocumento.trim(),
      empresa: false,
      nombres: v.nombres.trim(),
      apellidos: v.apellidos.trim(),
      fechaNacimiento: v.fechaNacimiento || null,
      razonSocial: null,
      direccionFiscal: null,
      correo: editaTitular ? titular.correo : anterior?.persona.correo || null,
      telefono: v.telefono?.trim() || null,
    };
    const menoresNuevos: Huesped[] = this.menores
      .getRawValue()
      .map((menor: any) => ({
        persona: {
          empresa: false,
          razonSocial: null,
          direccionFiscal: null,
          correo: menor.personaAnterior?.correo ?? null,
          telefono: menor.telefono?.trim() || null,
          idTipoDocumento: menor.idTipoDocumento,
          numeroDocumento: menor.numeroDocumento.trim(),
          nombres: menor.nombres.trim(),
          apellidos: menor.apellidos.trim(),
          fechaNacimiento: menor.fechaNacimiento,
        },
        idTipoOcupante: menor.idTipoOcupante,
        idHuesped: menor.idHuesped,
        ocupaPlazaCama: menor.ocupaPlazaCama !== false,
        responsable: {
          idTipoDocumento: persona.idTipoDocumento!,
          numeroDocumento: persona.numeroDocumento,
          parentesco: menor.parentesco,
        },
      }));
    const actualizado: Huesped = {
      ...anterior,
      persona,
      idTipoOcupante: v.idTipoOcupante,
      ocupaPlazaCama: v.ocupaPlazaCama !== false,
    };
    const base = this.guests(index).filter(
      (g, gi) => gi !== editando && !this.menoresOriginales.includes(g),
    );
    const posicion =
      editando === null ? base.length : Math.min(editando, base.length);
    const candidatos = [
      ...base.slice(0, posicion),
      actualizado,
      ...menoresNuevos,
      ...base.slice(posicion),
    ];
    const identidades = this.habitaciones.controls
      .flatMap((_, i) => i === index ? candidatos : this.guests(i))
      .map((g) => g.persona);
    const identidadInvalida = errorIdentidadesReserva(editaTitular ? persona : titular, identidades);
    if (identidadInvalida) {
      this.alertar(identidadInvalida);
      return;
    }
    const room = this.roomFor(index);
    const error = room
      ? errorOcupacion(room, candidatos, ingreso)
      : "Selecciona una habitación.";
    if (error) {
      this.alertar(error);
      return;
    }
    this.habitaciones.at(index).get("huespedes")!.setValue(candidatos);
    if (editaTitular) {
      this.clienteClave = claveDocumento(persona);
      this.cliente.patchValue(persona);
    }
    this.huespedEn.set(null);
    this.editandoHuesped.set(null);
  }
  quitarHuesped(i: number, g: number) {
    const clave = this.clavePersona(this.guests(i)[g]);
    if (this.guests(i).some((h) => this.responsableSeleccionado(h) === clave)) {
      this.alertar(
        "Retira o reasigna primero a los menores a cargo de este adulto.",
      );
      return;
    }
    this.habitaciones
      .at(i)
      .get("huespedes")!
      .setValue(this.guests(i).filter((_, n) => n !== g));
  }
  private datosCliente(): ClienteDatos {
    const v = this.cliente.getRawValue();
    const clean = (x: any) =>
      typeof x === "string" && x.trim() ? x.trim() : null;
    return {
      idTipoDocumento: v.idTipoDocumento,
      numeroDocumento: v.numeroDocumento.trim(),
      empresa: v.empresa,
      nombres: v.empresa ? null : clean(v.nombres),
      apellidos: v.empresa ? null : clean(v.apellidos),
      fechaNacimiento: v.empresa ? null : v.fechaNacimiento || null,
      razonSocial: v.empresa ? clean(v.razonSocial) : null,
      direccionFiscal: v.empresa ? clean(v.direccionFiscal) : null,
      correo: clean(v.correo),
      telefono: clean(v.telefono),
    };
  }
  revisar() {
    if (this.guardando() || this.registroIniciado()) return;
    if (this.comprobando() || this.errorDisponibilidad()) {
      this.alertar(
        this.errorDisponibilidad() ||
          "Espera a que termine la consulta de disponibilidad.",
      );
      return;
    }
    if (this.reservaService.registroPendiente?.()) {
      this.alertar(
        "Hay una reserva pendiente de confirmar. Recupérala desde la lista antes de registrar otra.",
      );
      return;
    }
    this.form.markAllAsTouched();
    const titular = this.datosCliente();
    const huespedes = this.habitaciones.controls.flatMap((_, i) => this.guests(i).map((g) => g.persona));
    const identidadInvalida = errorIdentidadesReserva(titular, huespedes);
    if (identidadInvalida) {
      this.alertar(identidadInvalida);
      return;
    }
    if (
      this.form.invalid ||
      this.habitaciones.controls.some((_, i) => this.lineError(i))
    ) {
      this.alertar(
        this.mensajeDocumento(this.cliente) ||
          this.mensajeNacimiento(this.cliente, true) ||
          this.habitaciones.controls
            .map((_, i) => this.lineError(i))
            .find(Boolean) ||
          "Revisa los campos obligatorios y las fechas de cada habitación.",
      );
      return;
    }
    if (!this.habitaciones.length) {
      this.alertar("Agrega al menos una habitación.");
      return;
    }
    if (
      !this.idUsuario() ||
      !this.catalogos()?.usuarios?.some((u) => u.id === this.idUsuario())
    ) {
      this.alertar("Selecciona al recepcionista que registra la reserva.");
      return;
    }
    this.solicitud = {
      claveRegistro: this.clave,
      cliente: titular,
      habitaciones: this.habitaciones
        .getRawValue()
        .map((h: Estancia, i: number) => ({
          ...h,
          costoEstadia: Math.round(this.costoLinea(i) * 100) / 100,
        })),
      formaRegistro: "PENDIENTE",
      efectivoRecibido: null,
    };
    this.pagoAbierto.set(true);
  }
  confirmar(pago: ConfirmacionPago) {
    if (this.guardando() || !this.solicitud) return;
    if (pago.forma !== "PENDIENTE" && !pago.cobro) {
      this.alertar("Selecciona un turno abierto y una forma de pago.");
      return;
    }
    this.guardando.set(true);
    this.registroIniciado.set(true);
    const preparar = this.solicitudApi
      ? of(this.solicitudApi)
      : this.reservaService.prepararRegistro(this.solicitud, this.idUsuario()!);
    preparar
      .pipe(
        concatMap((request) => {
          this.solicitudApi = request;
          return this.reservaRegistrada()
            ? of(this.reservaRegistrada()!)
            : this.reservaService.crear(request);
        }),
        concatMap((reserva) => {
          this.reservaRegistrada.set(reserva);
          if (pago.forma === "PENDIENTE" && !this.pagoEnviado)
            return this.reservaService.cuenta(reserva.idReserva);
          this.pagoEnviado ??= structuredClone(pago);
          this.pagoFijado.set(true);
          return this.reservaService.pagar(
            reserva.idReserva,
            this.clavePago,
            this.pagoEnviado.monto!,
            this.pagoEnviado.cobro!,
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (cuenta) => {
          this.guardando.set(false);
          this.avisos.mostrar(
            "Reserva " +
              cuenta.numeroReserva +
              " registrada. Saldo: S/ " +
              cuenta.saldoPendiente.toFixed(2) +
              (this.pagoEnviado
                ? ". Vuelto: S/ " +
                  Math.max(
                    0,
                    (this.pagoEnviado.recibido ?? this.pagoEnviado.monto!) -
                      this.pagoEnviado.monto!,
                  ).toFixed(2)
                : ""),
          );
          void this.router.navigate(["/reservas"], {queryParams:{comprobante:cuenta.idReserva}});
        },
        error: (e) => {
          this.guardando.set(false);
          if (!this.solicitudApi) this.registroIniciado.set(false);
          if (this.reservaRegistrada() && e.status >= 400 && e.status < 500) {
            this.pagoEnviado = null;
            this.pagoFijado.set(false);
            this.clavePago = crypto.randomUUID();
          }
          // Un 4xx confirma que la operación fue rechazada. Los fallos de red
          // conservan la solicitud y su clave para consultar/reintentar sin duplicar.
          if (!this.reservaRegistrada() && e.status >= 400 && e.status < 500) {
            this.registroIniciado.set(false);
            this.solicitudApi = null;
            this.clave = crypto.randomUUID();
          }
          this.alertar(
            (this.reservaRegistrada()
              ? "Reserva R" +
                this.reservaRegistrada()!.idReserva +
                " guardada. El cobro aún no está confirmado. Reintenta el mismo pago o consulta la reserva. "
              : "") +
              (e instanceof Error && !("status" in e)
                ? e.message
                : mensajeError(e)),
          );
        },
      });
  }
  cerrarPago() {
    if (this.pagoFijado()) {
      this.alertar(
        "El pago está pendiente de confirmar. Reintenta el mismo pago; también puedes recuperarlo desde la lista si recargas la página.",
      );
      return;
    }
    if (this.reservaRegistrada()) {
      void this.router.navigate(["/reservas"]);
      return;
    }
    if (this.registroIniciado()) {
      this.alertar(
        "La confirmación está pendiente. Reintenta con los mismos datos para recuperar la reserva sin duplicarla.",
      );
      return;
    }
    this.pagoAbierto.set(false);
  }
}
