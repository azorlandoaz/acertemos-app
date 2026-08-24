import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RolService } from './core/rol.service';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('se crea correctamente', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('no muestra el boton de cambiar rol sin sesion activa', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button');
    expect(boton).toBeNull();
  });

  it('muestra el boton de cambiar rol cuando hay sesion activa', () => {
    TestBed.inject(RolService).establecer({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button');
    expect(boton?.textContent).toContain('Cambiar rol');
  });
});
