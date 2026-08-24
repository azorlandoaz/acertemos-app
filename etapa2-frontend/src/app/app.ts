import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RolService } from './core/rol.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatButtonModule, MatToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly sesion = this.rolService.sesion;

  protected cambiarRol(): void {
    this.rolService.limpiar();
    this.router.navigate(['/rol']);
  }
}
