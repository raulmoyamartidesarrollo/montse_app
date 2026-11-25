import {
  useId,
  useLayoutEffect,
} from 'react';

import {
  useClinicalDraftContext,
} from '../contexts/ClinicalDraftContext';

interface Options {
  dirty: boolean;
  saving?: boolean;
  enabled?: boolean;
}

export function useClinicalDraftGuard({
  dirty,
  saving = false,
  enabled = true,
}: Options) {
  const draftId = useId();

  const {
    registerDraft,
    unregisterDraft,
    confirmNavigation,
    hasUnsavedChanges,
    isSaving,
  } = useClinicalDraftContext();

  useLayoutEffect(() => {
    if (!enabled) {
      unregisterDraft(draftId);
      return;
    }

    registerDraft(draftId, {
      dirty,
      saving,
    });
  }, [
    draftId,
    dirty,
    saving,
    enabled,
    registerDraft,
    unregisterDraft,
  ]);

  useLayoutEffect(() => {
    return () => {
      unregisterDraft(draftId);
    };
  }, [
    draftId,
    unregisterDraft,
  ]);

  return {
    confirmNavigation,
    hasUnsavedChanges,
    isSaving,
  };
}
