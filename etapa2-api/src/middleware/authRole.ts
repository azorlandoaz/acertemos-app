import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";

export type Rol = "solicitante" | "responsable_area" | "administrador";
const ROLES_VALIDOS: readonly Rol[] = ["solicitante", "responsable_area", "administrador"];

/** Autorización simplificada por header X-Role (Etapa 2 no exige
 * autenticación completa — límite conocido, documentado en
 * docs/roles-y-contratos.md). */
export function requiereRol(...permitidos: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const valor = req.header("X-Role");
    if (!valor || !(ROLES_VALIDOS as string[]).includes(valor)) {
      return next(new AppError(403, "ROL_NO_AUTORIZADO", "Header X-Role ausente o no reconocido"));
    }
    if (!permitidos.includes(valor as Rol)) {
      return next(new AppError(403, "ROL_NO_AUTORIZADO", `El rol '${valor}' no puede realizar esta acción`));
    }
    next();
  };
}
