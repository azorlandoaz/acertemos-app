import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import type { Rol } from '../../core/rol';
import { RolService } from '../../core/rol.service';

interface OpcionRol {
  valor: Rol;
  etiqueta: string;
}

@Component({
  selector: 'app-rol-selector',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
  templateUrl: './rol-selector.html',
  styleUrl: './rol-selector.scss',
})
export class RolSelector {
  private readonly fb = inject(FormBuilder);
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly opciones: OpcionRol[] = [
    { valor: 'solicitante', etiqueta: 'Solicitante' },
    { valor: 'responsable_area', etiqueta: 'Responsable de área' },
    { valor: 'administrador', etiqueta: 'Administrador' },
  ];

  protected readonly formulario = this.fb.nonNullable.group({
    rol: this.fb.nonNullable.control<Rol>('solicitante', Validators.required),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
  });

  protected continuar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { rol, nombre } = this.formulario.getRawValue();
    this.rolService.establecer({ rol, nombre });
    this.router.navigate(['/solicitudes/nueva']);
  }
}
