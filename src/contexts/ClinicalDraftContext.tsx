import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Alert } from 'react-native';

export interface ClinicalDraftState {
  dirty: boolean;
  saving: boolean;
}

interface ClinicalDraftContextValue {
  hasUnsavedChanges: boolean;
  isSaving: boolean;

  registerDraft: (
    id: string,
    state: ClinicalDraftState
  ) => void;

  unregisterDraft: (id: string) => void;

  confirmNavigation: (action: () => void) => void;
}

const ClinicalDraftContext =
  createContext<ClinicalDraftContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function ClinicalDraftProvider({
  children,
}: Props) {
  const draftsRef = useRef<
    Map<string, ClinicalDraftState>
  >(new Map());

  const alertOpenRef = useRef(false);

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const refreshState = useCallback(() => {
    const drafts = Array.from(
      draftsRef.current.values()
    );

    setHasUnsavedChanges(
      drafts.some((draft) => draft.dirty)
    );

    setIsSaving(
      drafts.some((draft) => draft.saving)
    );
  }, []);

  const registerDraft = useCallback(
    (
      id: string,
      state: ClinicalDraftState
    ) => {
      const previous = draftsRef.current.get(id);

      if (
        previous?.dirty === state.dirty &&
        previous?.saving === state.saving
      ) {
        return;
      }

      draftsRef.current.set(id, {
        dirty: state.dirty,
        saving: state.saving,
      });

      refreshState();
    },
    [refreshState]
  );

  const unregisterDraft = useCallback(
    (id: string) => {
      if (draftsRef.current.delete(id)) {
        refreshState();
      }
    },
    [refreshState]
  );

  const confirmNavigation = useCallback(
    (action: () => void) => {
      if (alertOpenRef.current) {
        return;
      }

      const drafts = Array.from(
        draftsRef.current.values()
      );

      const saving = drafts.some(
        (draft) => draft.saving
      );

      const dirty = drafts.some(
        (draft) => draft.dirty
      );

      if (saving) {
        alertOpenRef.current = true;

        Alert.alert(
          'Guardando información',
          'Espera a que finalice el guardado antes de continuar.',
          [
            {
              text: 'Aceptar',
              onPress: () => {
                alertOpenRef.current = false;
              },
            },
          ],
          { cancelable: false }
        );

        return;
      }

      if (!dirty) {
        action();
        return;
      }

      alertOpenRef.current = true;

      Alert.alert(
        'Cambios sin guardar',
        'Tienes información clínica pendiente de guardar. Si continúas, podrías perder los cambios realizados.',
        [
          {
            text: 'Seguir editando',
            style: 'cancel',
            onPress: () => {
              alertOpenRef.current = false;
            },
          },
          {
            text: 'Descartar cambios',
            style: 'destructive',
            onPress: () => {
              alertOpenRef.current = false;

              const currentlySaving = Array.from(
                draftsRef.current.values()
              ).some((draft) => draft.saving);

              if (currentlySaving) {
                return;
              }

              action();
            },
          },
        ],
        { cancelable: false }
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      isSaving,
      registerDraft,
      unregisterDraft,
      confirmNavigation,
    }),
    [
      hasUnsavedChanges,
      isSaving,
      registerDraft,
      unregisterDraft,
      confirmNavigation,
    ]
  );

  return (
    <ClinicalDraftContext.Provider value={value}>
      {children}
    </ClinicalDraftContext.Provider>
  );
}

export function useClinicalDraftContext() {
  const context = useContext(ClinicalDraftContext);

  if (!context) {
    throw new Error(
      'useClinicalDraftContext debe utilizarse dentro de ClinicalDraftProvider.'
    );
  }

  return context;
}
