import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RolService } from '../../core/rol.service';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { ErrorApi } from '../../solicitudes/solicitud';

@Component({
  selector: 'app-nueva-solicitud',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './nueva-solicitud.html',
  styleUrl: './nueva-solicitud.scss',
})
export class NuevaSolicitud {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SolicitudesApiService);
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    asunto: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    descripcion: this.fb.nonNullable.control(''),
    area: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    solicitante: this.fb.nonNullable.control(this.rolService.sesion()?.nombre ?? '', [
      Validators.required,
      Validators.email,
    ]),
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.api.crear(this.formulario.getRawValue()).subscribe({
      next: (creada) => {
        this.router.navigate(['/solicitudes', creada.id]);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.aplicarErroresDeCampo(err);
      },
    });
  }

  private aplicarErroresDeCampo(err: unknown): void {
    if (!(err instanceof HttpErrorResponse) || err.status !== 422) {
      return;
    }
    const cuerpo = err.error as { error?: ErrorApi };
    const camposConError = cuerpo.error?.details?.fieldErrors ?? {};
    for (const [campo, mensajes] of Object.entries(camposConError)) {
      const control = this.formulario.get(campo);
      if (control && mensajes.length > 0) {
        control.setErrors({ servidor: mensajes[0] });
      }
    }
  }
}
