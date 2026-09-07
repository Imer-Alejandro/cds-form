export const COMPANY_DEPARTMENTS = [
  "ADMINISTRACION Y SERVICIOS GENERALES",
  "COMPRAS",
  "FINANZAS / CONTABILIDAD",
  "KEXFORD",
  "FERRETERIA",
  "LEGAL",
  "PROYECTOS",
  "TALENTO Y CULTURA",
  "TECNOLOGIA",
  "VENTAS INMOBILIARIAS",
] as const;

export const DEPARTMENT_SIZES: Record<string, number> = {
  "ADMINISTRACION Y SERVICIOS GENERALES": 9,
  COMPRAS: 1,
  "FINANZAS / CONTABILIDAD": 12,
  KEXFORD: 3,
  FERRETERIA: 8,
  LEGAL: 1,
  PROYECTOS: 14,
  "TALENTO Y CULTURA": 5,
  TECNOLOGIA: 4,
  "VENTAS INMOBILIARIAS": 9,
};

export const TOTAL_EMPLOYEES = Object.values(DEPARTMENT_SIZES).reduce((a, b) => a + b, 0);

export const MIN_DEPT_EMPLOYEES = 5;

export function getDepartmentSize(department: string): number {
  return DEPARTMENT_SIZES[department] ?? 0;
}

export function isPrivateDepartment(department: string): boolean {
  return getDepartmentSize(department) < MIN_DEPT_EMPLOYEES;
}