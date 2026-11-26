import {
  registerAdminNavigationGuard,
  getAdminNavigationGuard,
} from './AdminNavigationGuard';

interface ClinicalNavigationGuard {
  shouldPreventNavigation: () => boolean;
  confirmNavigation: (action: () => void) => void;
}

export function registerClinicalNavigationGuard(
  guard: ClinicalNavigationGuard
): () => void {
  return registerAdminNavigationGuard({
    ...guard,
    sourceTab: 'Pacientes',
  });
}

export function getClinicalNavigationGuard():
  ClinicalNavigationGuard | null {
  const guard = getAdminNavigationGuard();

  if (!guard || guard.sourceTab !== 'Pacientes') {
    return null;
  }

  return guard;
}
