# Etapa 2 — Cliente Angular

Aplicación Angular que consume la API REST de `etapa2-api` (ya
acreditada). **No es parte de los 5 entregables calificados del Anexo
A** — es una adición aparte que vive en su propia rama
(`etapa2-frontend`).

## Instalación y ejecución

Requiere dos procesos corriendo en paralelo:

```bash
# Terminal 1 — API de Etapa 2
cd etapa2-api
cp .env.example .env
npm install
npm run dev

# Terminal 2 — Cliente Angular
cd etapa2-frontend
npm install
npm start
```

Abrir `http://localhost:4200`. El proxy de Angular (`proxy.conf.json`)
reenvía `/api/*` al backend en `http://localhost:3000`, así que no
hace falta configurar CORS en `etapa2-api`.

## Cómo probar los distintos roles

La API no tiene login real — el acceso se controla con el header
`X-Role`. Al entrar por primera vez, la app pide elegir un rol
(`solicitante`, `responsable_area` o `administrador`) y un correo; ese
rol se usa en cada petición hasta que se cambie con el botón "Cambiar
rol" de la barra superior. El listado de solicitudes (`/solicitudes`)
solo es accesible para `responsable_area`/`administrador` — un
`solicitante` que intente entrar es redirigido de vuelta a la
selección de rol.

## Pruebas

```bash
npm test -- --watch=false
```

## Qué no incluye

- Autenticación real — ver spec,
  `docs/superpowers/specs/2026-08-23-etapa2-frontend-angular-design.md`.
- Pipeline de CI propio — es una demo local, no un entregable
  calificado del Anexo A.
- Filtros del listado reflejados en la URL — se mantienen en el
  formulario del componente, así que no se puede marcar como favorito
  ni compartir una vista filtrada, y recargar la página los reinicia.
- Reintento automático ante errores de red/servidor — se muestra un
  mensaje, pero no hay botón para reintentar la acción; hay que
  repetirla manualmente.
