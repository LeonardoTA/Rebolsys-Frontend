import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Categoria } from "../../models/categoria.model";
import { CategoriaService } from "../../services/categoria-service";
import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { Icon } from "../../../../shared/components/icono/icono";
import { mensajeError } from "../../../../core/utils/http-error";
@Component({
  selector: "app-categoria-dialog",
  imports: [FormsModule, DialogFocus, Icon],
  templateUrl: "./categoria-dialog.html",
  styleUrl: "./categoria-dialog.css",
})
export class CategoriaDialog implements OnInit {
  cerrar = output<void>();
  creada = output<Categoria>();
  private servicio = inject(CategoriaService);
  private destroy = inject(DestroyRef);
  categorias = signal<Categoria[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal("");
  aviso = signal("");
  nombre = "";
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set("");
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (cats) => {
          this.categorias.set(cats);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
  guardar() {
    if (this.guardando() || this.cargando()) return;
    const nombre = this.nombre.trim();
    this.error.set("");
    this.aviso.set("");
    if (!nombre || nombre.length > 30) {
      this.error.set("Escribe una categoría de hasta 30 caracteres.");
      return;
    }
    if (
      this.categorias().some(
        (c) =>
          c.nombreCategoria.trim().toLocaleLowerCase("es") ===
          nombre.toLocaleLowerCase("es"),
      )
    ) {
      this.error.set("Ya existe una categoría con ese nombre.");
      return;
    }
    this.guardando.set(true);
    this.servicio
      .crear(nombre)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.categorias.update((cats) =>
            [...cats, c].sort((a, b) =>
              a.nombreCategoria.localeCompare(b.nombreCategoria, "es"),
            ),
          );
          this.nombre = "";
          this.guardando.set(false);
          this.aviso.set("Categoría creada. Puedes agregar otra.");
          this.creada.emit(c);
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
}
