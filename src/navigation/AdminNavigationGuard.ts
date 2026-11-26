export type AdminTabName =
  | 'Inicio'
  | 'Agenda'
  | 'Pacientes'
  | 'Servicios'
  | 'Mas';

export interface AdminNavigationGuard {
  sourceTab: AdminTabName;
  shouldPreventNavigation: () => boolean;
  confirmNavigation: (action: () => void) => void;
}

let activeGuard: AdminNavigationGuard | null = null;

export function registerAdminNavigationGuard(
  guard: AdminNavigationGuard
): () => void {
  activeGuard = guard;

  return () => {
    if (activeGuard === guard) {
      activeGuard = null;
    }
  };
}

export function getAdminNavigationGuard():
  AdminNavigationGuard | null {
  return activeGuard;
}
