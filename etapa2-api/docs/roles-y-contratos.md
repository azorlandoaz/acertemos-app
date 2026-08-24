# Roles y contratos — API de Mesa de Ayuda (Etapa 2)

## Límite conocido

Esta etapa no implementa autenticación completa (fuera del alcance del
Anexo A para Etapa 2). La autorización se simplifica a un header
`X-Role` que el cliente declara; en un sistema real este rol vendría de
un token verificado (JWT/OAuth), no de un header sin firmar.

## Roles

| Rol | Descripción |
|---|---|
| `solicitante` | Colaborador que crea y consulta sus propias solicitudes. |
| `responsable_area` | Responsable de un área (ver `areas.responsable` en `esquema.sql`); lista y consulta solicitudes de su área. |
| `administrador` | Coordinación de Aplicaciones; acceso total. |

## Matriz de permisos

| Endpoint | `solicitante` | `responsable_area` | `administrador` |
|---|---|---|---|
| `POST /solicitudes` | ✅ | ✅ | ✅ |
| `GET /solicitudes/:id` | ✅ | ✅ | ✅ |
| `GET /solicitudes` (listar) | ❌ | ✅ | ✅ |

## Contratos por endpoint

### `POST /solicitudes`
- **Request:** `{ asunto: string (min 3), descripcion?: string, area: string (min 2), solicitante: string (email) }`
- **201:** cuerpo de la solicitud creada, incluida `categoria`/`prioridad`/`confianzaClasificacion` ya resueltas.
- **422:** `{ error: { code: "ENTRADA_INVALIDA", message, details } }`

### `GET /solicitudes/:id`
- **200:** cuerpo de la solicitud.
- **404:** `{ error: { code: "NO_ENCONTRADA", message } }`

### `GET /solicitudes?area=&estado=&categoria=`
- **200:** arreglo de solicitudes (vacío si no hay coincidencias).

Ver `openapi.yaml` (Tarea 16) para el contrato formal machine-readable;
este archivo es el complemento legible por humanos con el cruce de roles.
