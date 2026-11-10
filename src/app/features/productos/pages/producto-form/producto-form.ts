import { Component, inject, input, signal } from "@angular/core";
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { CurrencyPipe } from "@angular/common";
import { ProductoService } from "../../services/producto-service";
import { CategoriaService } from "../../../categorias/services/categoria-service";
import { Categoria } from "../../../categorias/models/categoria.model";
import { mensajeError } from "../../../../core/utils/http-error";
import { NotificacionService } from "../../../../core/services/notificacion.service";
import { Icon } from "../../../../shared/components/icono/icono";
import { forkJoin, of } from "rxjs";
import { CategoriaDialog } from "../../../categorias/components/categoria-dialog/categoria-dialog";
import { CatalogoService } from "../../../../core/services/catalogo-service";
import { Catalogo } from "../../../../core/models/catalogo.model";
@Component({
  selector: "app-producto-form",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Icon,
    CurrencyPipe,
    CategoriaDialog,
  ],
  templateUrl: "./producto-form.html",
  styleUrl: "./producto-form.css",
})
export class ProductoForm {
  id = input<string>();
  private productos = inject(ProductoService);
  private categoriasService = inject(CategoriaService);
  private fb = inject(UntypedFormBuilder);
  private router = inject(Router);
  private avisos = inject(NotificacionService);
  private catalogosService = inject(CatalogoService);
  categorias = signal<Categoria[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal("");
  categoriasAbiertas = signal(false);
  usuarios = signal<Catalogo[]>([]);
  confirmacionPendiente = signal(false);
  imagenFallida = signal(false);
  form = this.fb.group({
    nombreProducto: ["", [Validators.required, Validators.maxLength(100)]],
    descripcion: ["", Validators.maxLength(500)],
    idUsuario: [null],
    precioActual: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(99999999.99),
        Validators.pattern(/^[0-9]+([.][0-9]{1,2})?$/),
      ],
    ],
    stock: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(999999999),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    stockMinimo: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(999999999),
        Validators.pattern(/^[0-9]+$/),
      ],
    ],
    idCategoria: [null, Validators.required],
    estadoProducto: ["ACTIVO", Validators.required],
    imagenRuta: [
      "",
      [
        Validators.maxLength(300),
        Validators.pattern(
          /^$|^\/(?!\/)[^\s\\<>]*\.(png|jpe?g|webp|avif|gif)$/i,
        ),
      ],
    ],
    stockAnterior: [null],
  });
  ngOnInit() {
    if (this.id()) this.form.get("stock")!.disable();
    this.cargar();
  }
  cargar() {
    this.error.set("");
    this.cargando.set(true);
    forkJoin({
      cats: this.categoriasService.listar(),
      catalogos: this.id() ? of(null) : this.catalogosService.listar(),
    }).subscribe({
      next: ({ cats, catalogos }) => {
        this.categorias.set(cats);
        this.usuarios.set(catalogos?.usuarios ?? []);
        if (!this.id())
          this.form
            .get("idUsuario")!
            .setValue(catalogos?.usuarios?.[0]?.id ?? null);
        if (this.id())
          this.productos.obtener(this.id()!).subscribe({
            next: (p) => {
              this.form.patchValue({
                ...p,
                imagenRuta: p.imagenRuta || "",
                descripcion: p.descripcion ?? "",
                stockAnterior: p.stock,
              });
              this.cargando.set(false);
            },
            error: (e) => this.fallo(e),
          });
        else this.cargando.set(false);
      },
      error: (e) => this.fallo(e),
    });
  }
  private fallo(e: any) {
    this.cargando.set(false);
    this.error.set(mensajeError(e));
  }
  categoriaCreada(c: Categoria) {
    this.categorias.update((cats) =>
      [...cats.filter((x) => x.idCategoria !== c.idCategoria), c].sort((a, b) =>
        a.nombreCategoria.localeCompare(b.nombreCategoria, "es"),
      ),
    );
    this.form.get("idCategoria")!.setValue(c.idCategoria);
  }
  vistaImagen() {
    const ruta = this.form.get("imagenRuta")!.value;
    return ruta && this.form.get("imagenRuta")!.valid && !this.imagenFallida()
      ? ruta
      : "/imagenes/productos/sin-imagen.svg";
  }
  guardar() {
    if (this.guardando() || this.confirmacionPendiente()) return;
    this.form.markAllAsTouched();
    this.error.set("");
    if (this.form.invalid || !this.form.get("nombreProducto")!.value.trim()) {
      this.error.set(
        "Revisa nombre, categoría, importes, existencias y ruta de imagen.",
      );
      return;
    }
    const raw = this.form.getRawValue();
    if (
      !this.id() &&
      raw.stock > 0 &&
      !this.usuarios().some((u) => u.id === raw.idUsuario)
    ) {
      this.error.set("Selecciona al responsable de las existencias iniciales.");
      return;
    }
    const datos = {
      ...raw,
      nombreProducto: raw.nombreProducto.trim(),
      imagenRuta: raw.imagenRuta?.trim() || null,
      descripcion: raw.descripcion?.trim() || null,
      idUsuario: this.id() ? undefined : raw.idUsuario,
    };
    this.guardando.set(true);
    this.form.disable({ emitEvent: false });
    (this.id()
      ? this.productos.actualizar(this.id()!, datos)
      : this.productos.crear(datos)
    ).subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisos.mostrar(
          this.id() ? "Producto actualizado." : "Producto registrado.",
        );
        void this.router.navigate(["/configuraciones/productos"]);
      },
      error: (e) => {
        this.guardando.set(false);
        if (!this.id() && (!e.status || e.status >= 500)) {
          this.confirmacionPendiente.set(true);
          this.error.set(
            mensajeError(e) +
              " No pudimos confirmar si se guardó. Revisa el listado antes de registrar otro producto.",
          );
        } else {
          this.form.enable({ emitEvent: false });
          if (this.id()) this.form.get("stock")!.disable();
          this.error.set(mensajeError(e));
        }
      },
    });
  }
}
