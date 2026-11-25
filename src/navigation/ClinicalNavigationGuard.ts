interface ClinicalNavigationGuard {
  shouldPreventNavigation: () => boolean;
  confirmNavigation: (action: () => void) => void;
}

let activeGuard: ClinicalNavigationGuard | null = null;

export function registerClinicalNavigationGuard(
  guard: ClinicalNavigationGuard
): () => void {
  activeGuard = guard;

  return () => {
    if (activeGuard === guard) {
      activeGuard = null;
    }
  };
}

export function getClinicalNavigationGuard():
  ClinicalNavigationGuard | null {
  return activeGuard;
}
