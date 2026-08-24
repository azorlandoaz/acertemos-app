import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { NotificacionService } from './notificacion.service';

describe('NotificacionService', () => {
  it('mostrarError abre un snackbar con el mensaje dado', () => {
    const snackBarMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: snackBarMock }],
    });
    const service = TestBed.inject(NotificacionService);
    service.mostrarError('algo salio mal');
    expect(snackBarMock.open).toHaveBeenCalledWith('algo salio mal', 'Cerrar', { duration: 5000 });
  });

  it('mostrarExito abre un snackbar con duracion mas corta', () => {
    const snackBarMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: snackBarMock }],
    });
    const service = TestBed.inject(NotificacionService);
    service.mostrarExito('todo bien');
    expect(snackBarMock.open).toHaveBeenCalledWith('todo bien', 'Cerrar', { duration: 3000 });
  });
});
