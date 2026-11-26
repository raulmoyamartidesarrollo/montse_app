import {
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';

import {
  Alert,
  Keyboard,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  registerAdminNavigationGuard,
  type AdminTabName,
} from '../navigation/AdminNavigationGuard';

// ==================================================
// TIPOS
// ==================================================

interface AdminDraftGuardOptions {
  sourceTab: AdminTabName;

  hasChanges: boolean;

  isSaving: boolean;

  enabled?: boolean;

  alertOpenRef?: {
    current: boolean;
  };

  savingRef?: {
    current: boolean;
  };

  savedRef?: {
    current: boolean;
  };

  onDiscardAndNavigate: (
    action: () => void
  ) => void;

  unsavedTitle?: string;

  unsavedMessage?: string;

  savingTitle?: string;

  savingMessage?: string;
}

// ==================================================
// HOOK
// ==================================================

export default function useAdminDraftGuard(
  options: AdminDraftGuardOptions
) {
  const internalAlertRef = useRef(false);

  const focusedRef = useRef(false);

  const optionsRef = useRef(options);

  useLayoutEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // ==================================================
  // COMPROBAR ESTADO ACTUAL
  // ==================================================

  const isCurrentlySaving = useCallback(() => {
    const current = optionsRef.current;

    return (
      current.isSaving ||
      current.savingRef?.current === true
    );
  }, []);

  const shouldPreventNavigation = useCallback(() => {
    const current = optionsRef.current;

    if (
      !focusedRef.current ||
      current.enabled === false
    ) {
      return false;
    }

    if (isCurrentlySaving()) {
      return true;
    }

    if (current.savedRef?.current === true) {
      return false;
    }

    return current.hasChanges;
  }, [isCurrentlySaving]);

  // ==================================================
  // CONFIRMAR NAVEGACIÓN
  // ==================================================

  const confirmNavigation = useCallback(
    (action: () => void) => {
      const current = optionsRef.current;

      const alertRef =
        current.alertOpenRef ?? internalAlertRef;

      if (!focusedRef.current) {
        return;
      }

      if (alertRef.current) {
        return;
      }

      if (isCurrentlySaving()) {
        alertRef.current = true;

        Alert.alert(
          current.savingTitle ??
            'Guardando información',

          current.savingMessage ??
            'Espera a que finalice el guardado antes de continuar.',

          [
            {
              text: 'Aceptar',
              onPress: () => {
                alertRef.current = false;
              },
            },
          ],

          {
            cancelable: false,
          }
        );

        return;
      }

      if (!shouldPreventNavigation()) {
        action();
        return;
      }

      alertRef.current = true;

      Keyboard.dismiss();

      Alert.alert(
        current.unsavedTitle ??
          'Cambios sin guardar',

        current.unsavedMessage ??
          'Si sales de esta pantalla perderás los cambios realizados.',

        [
          {
            text: 'Seguir editando',
            style: 'cancel',

            onPress: () => {
              alertRef.current = false;
            },
          },

          {
            text: 'Descartar cambios',
            style: 'destructive',

            onPress: () => {
              alertRef.current = false;

              if (
                !focusedRef.current ||
                isCurrentlySaving()
              ) {
                return;
              }

              action();
            },
          },
        ],

        {
          cancelable: false,
        }
      );
    },
    [
      isCurrentlySaving,
      shouldPreventNavigation,
    ]
  );

  // ==================================================
  // REGISTRAR PROTECCIÓN EN EL MENÚ INFERIOR
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      const unregister =
        registerAdminNavigationGuard({
          sourceTab: options.sourceTab,

          shouldPreventNavigation,

          confirmNavigation: (action) => {
            confirmNavigation(() => {
              if (!focusedRef.current) {
                return;
              }

              optionsRef.current
                .onDiscardAndNavigate(action);
            });
          },
        });

      return () => {
        focusedRef.current = false;

        unregister();
      };
    }, [
      options.sourceTab,
      shouldPreventNavigation,
      confirmNavigation,
    ])
  );

  // ==================================================
  // API DEL HOOK
  // ==================================================

  return {
    shouldPreventNavigation,
    confirmNavigation,
    isCurrentlySaving,
  };
}
