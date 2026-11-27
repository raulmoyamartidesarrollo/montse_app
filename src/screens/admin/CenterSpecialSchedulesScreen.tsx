import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import {
  getCenterSpecialSchedules,
  deleteCenterSpecialSchedule,
} from '../../services/centerSpecialSchedules';

import {
  type CenterSpecialSchedule,
  type GetCenterSpecialSchedulesInput,
} from '../../types/centerSpecialSchedules';

import {
  getCenterTodayISO,
  addDaysToDateISO,
  formatCenterDate,
  getMonthStartISO,
  getMonthEndISO,
  isValidDateISO,
} from '../../utils/centerScheduleDates';

import MonthlyCalendar, {
  type CalendarDayMark,
} from '../../components/admin/schedules/MonthlyCalendar';

import SpecialScheduleCard from '../../components/admin/schedules/SpecialScheduleCard';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

// ==================================================
// PANTALLA DE HORARIOS ESPECIALES
// ==================================================

type ScheduleFilter = 'upcoming' | 'history';

type ViewMode = 'calendar' | 'list';

type LoadMode = 'initial' | 'refresh' | 'more';

const PAGE_SIZE = 20;

const MONTH_PAGE_SIZE = 31;

export default function CenterSpecialSchedulesScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<AdminMoreStackParamList>
  >();

  const insets = useSafeAreaInsets();

  const [filter, setFilter] =
    useState<ScheduleFilter>('upcoming');

  const [viewMode, setViewMode] =
    useState<ViewMode>('calendar');

  const [monthISO, setMonthISO] =
    useState(() =>
      getMonthStartISO(getCenterTodayISO())
    );

  const [schedules, setSchedules] =
    useState<CenterSpecialSchedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [paginationError, setPaginationError] =
    useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);

  const queryBoundsRef = useRef<
    GetCenterSpecialSchedulesInput | null
  >(null);

  const loadingRef = useRef(false);

  const [deletingDateISO, setDeletingDateISO] =
    useState<string | null>(null);

  const [deleteError, setDeleteError] =
    useState<string | null>(null);

  const deletingRef = useRef(false);

  const deleteAlertOpenRef = useRef(false);

  const focusedRef = useRef(false);

  const requestIdRef = useRef(0);

  const isDeleting =
    deletingDateISO !== null;

  const isBusy =
    loading ||
    refreshing ||
    loadingMore ||
    isDeleting;

  // ==================================================
  // INDICADORES DEL CALENDARIO
  // ==================================================

  const markedDates = useMemo<
    Record<string, CalendarDayMark>
  >(() => {
    const marks: Record<string, CalendarDayMark> = {};

    if (viewMode !== 'calendar') {
      return marks;
    }

    for (const schedule of schedules) {
      marks[schedule.dateISO] = {
        status: schedule.closed
          ? 'closed'
          : 'special',

        label: schedule.reason || undefined,
      };
    }

    return marks;
  }, [schedules, viewMode]);

  // ==================================================
  // RECUPERAR HORARIOS ESPECIALES
  // ==================================================

  const loadSchedules = useCallback(
    async (mode: LoadMode = 'initial') => {
      if (!focusedRef.current) {
        return;
      }

      if (mode !== 'initial' && loadingRef.current) {
        return;
      }

      if (
        mode === 'more' &&
        (
          viewMode !== 'list' ||
          !cursorRef.current ||
          !queryBoundsRef.current
        )
      ) {
        return;
      }

      const requestId = ++requestIdRef.current;

      loadingRef.current = true;

      setLoading(mode === 'initial');
      setRefreshing(mode === 'refresh');
      setLoadingMore(mode === 'more');

      setError(null);
      setPaginationError(null);

      if (mode === 'initial') {
        setSchedules([]);
        setHasMore(false);

        cursorRef.current = null;
        queryBoundsRef.current = null;
      }

      try {
        const todayISO = getCenterTodayISO();

        const bounds: GetCenterSpecialSchedulesInput =
          mode === 'more'
            ? { ...queryBoundsRef.current }
            : viewMode === 'calendar'
              ? {
                  fromDateISO:
                    getMonthStartISO(monthISO),

                  toDateISO:
                    getMonthEndISO(monthISO),
                }
              : filter === 'upcoming'
                ? {
                    fromDateISO: todayISO,
                  }
                : {
                    toDateISO: addDaysToDateISO(
                      todayISO,
                      -1
                    ),
                  };

        const result = await getCenterSpecialSchedules({
          ...bounds,

          ...(mode === 'more' && cursorRef.current
            ? {
                cursorDateISO: cursorRef.current,
              }
            : {}),

          limit:
            viewMode === 'calendar'
              ? MONTH_PAGE_SIZE
              : PAGE_SIZE,
        });

        if (
          requestId !== requestIdRef.current ||
          !focusedRef.current
        ) {
          return;
        }

        if (
          viewMode === 'calendar' &&
          result.hasMore
        ) {
          throw new Error(
            'La consulta mensual contiene más registros de los esperados.'
          );
        }

        if (mode === 'more') {
          setSchedules((previous) => {
            const merged = new Map(
              previous.map((schedule) => [
                schedule.dateISO,
                schedule,
              ])
            );

            for (const schedule of result.specialSchedules) {
              merged.set(
                schedule.dateISO,
                schedule
              );
            }

            return Array.from(merged.values()).sort(
              (a, b) =>
                a.dateISO.localeCompare(b.dateISO)
            );
          });

        } else {
          setSchedules(result.specialSchedules);
        }

        queryBoundsRef.current = bounds;

        cursorRef.current =
          result.nextCursorDateISO;

        setHasMore(result.hasMore);

      } catch (err) {
        if (
          requestId !== requestIdRef.current ||
          !focusedRef.current
        ) {
          return;
        }

        console.error(
          '[CenterSpecialSchedulesScreen] Error cargando horarios:',
          err
        );

        if (mode === 'initial') {
          setError(
            'No se han podido recuperar los horarios especiales.'
          );

        } else {
          setPaginationError(
            mode === 'more'
              ? 'No se han podido cargar más horarios. Vuelve a intentarlo.'
              : 'No se han podido actualizar los horarios. Desliza hacia abajo para reintentar.'
          );
        }

      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;

          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [filter, viewMode, monthISO]
  );

  // ==================================================
  // ACTUALIZAR AL ENTRAR EN LA PANTALLA
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      setDeleteError(null);

      void loadSchedules();

      return () => {
        focusedRef.current = false;

        deleteAlertOpenRef.current = false;

        loadingRef.current = false;

        requestIdRef.current += 1;
      };
    }, [loadSchedules])
  );

  // ==================================================
  // INVALIDAR CONSULTAS ANTERIORES
  // ==================================================

  function resetScheduleQuery() {
    setDeleteError(null);
    setPaginationError(null);

    cursorRef.current = null;
    queryBoundsRef.current = null;

    loadingRef.current = false;

    setRefreshing(false);
    setLoadingMore(false);

    // Invalidar cualquier consulta anterior.

    requestIdRef.current += 1;

    setLoading(true);
    setError(null);
    setSchedules([]);
    setHasMore(false);
  }

  // ==================================================
  // CAMBIAR FILTRO
  // ==================================================

  function handleFilterChange(
    nextFilter: ScheduleFilter
  ) {
    if (
      viewMode !== 'list' ||
      nextFilter === filter ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    resetScheduleQuery();

    setFilter(nextFilter);
  }

  // ==================================================
  // CAMBIAR VISTA
  // ==================================================

  function handleViewModeChange(
    nextViewMode: ViewMode
  ) {
    if (
      nextViewMode === viewMode ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    resetScheduleQuery();

    setViewMode(nextViewMode);
  }

  // ==================================================
  // CAMBIAR MES
  // ==================================================

  function handleMonthChange(
    nextMonthISO: string
  ) {
    if (
      viewMode !== 'calendar' ||
      !isValidDateISO(nextMonthISO) ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    const normalizedMonth =
      getMonthStartISO(nextMonthISO);

    if (normalizedMonth === monthISO) {
      return;
    }

    resetScheduleQuery();

    setMonthISO(normalizedMonth);
  }

  // ==================================================
  // PULSAR DÍA DEL CALENDARIO
  // ==================================================

  function handleCalendarDayPress(
    dateISO: string
  ) {
    if (
      viewMode !== 'calendar' ||
      !isValidDateISO(dateISO) ||
      getMonthStartISO(dateISO) !== monthISO ||
      isBusy ||
      !!error ||
      !!paginationError ||
      loadingRef.current ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    const existingSchedule =
      schedules.find(
        (schedule) =>
          schedule.dateISO === dateISO
      );

    if (existingSchedule) {
      navigation.navigate(
        'CenterSpecialScheduleForm',
        {
          schedule: existingSchedule,
        }
      );

      return;
    }

    navigation.navigate(
      'CenterSpecialScheduleForm',
      {
        dateISO,
      }
    );
  }

  // ==================================================
  // ACTUALIZAR LISTADO
  // ==================================================

  function handleRefresh() {
    if (
      loadingRef.current ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    setDeleteError(null);

    void loadSchedules(
      error ? 'initial' : 'refresh'
    );
  }

  // ==================================================
  // CARGAR SIGUIENTE PÁGINA
  // ==================================================

  function handleLoadMore() {
    if (
      viewMode !== 'list' ||
      !hasMore ||
      loadingRef.current ||
      deletingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    void loadSchedules('more');
  }

  // ==================================================
  // ELIMINAR HORARIO ESPECIAL
  // ==================================================

  async function handleDeleteSchedule(
    dateISO: string
  ) {
    if (
      deletingRef.current ||
      loadingRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    deletingRef.current = true;

    setDeletingDateISO(dateISO);
    setDeleteError(null);

    try {
      await deleteCenterSpecialSchedule({
        dateISO,
      });

      // Retirar el horario eliminado del listado local.

      setSchedules((previous) =>
        previous.filter(
          (schedule) =>
            schedule.dateISO !== dateISO
        )
      );

    } catch (err) {
      console.error(
        '[CenterSpecialSchedulesScreen] Error eliminando horario:',
        err
      );

      const code =
        typeof err === 'object' &&
        err !== null &&
        'code' in err
          ? String(err.code)
          : '';

      if (code === 'functions/not-found') {
        // El horario ya no existe en Firebase.

        setSchedules((previous) =>
          previous.filter(
            (schedule) =>
              schedule.dateISO !== dateISO
          )
        );

      } else if (focusedRef.current) {
        setDeleteError(
          code === 'functions/permission-denied'
            ? 'No tienes permisos para eliminar horarios especiales.'
            : code === 'functions/unauthenticated'
              ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
              : 'No se ha podido confirmar la eliminación. Revisa el listado antes de volver a intentarlo.'
        );
      }

    } finally {
      try {
        // Consultar Firebase nuevamente si la pantalla
        // continúa activa.

        if (
          focusedRef.current &&
          navigation.isFocused()
        ) {
          await loadSchedules();
        }

      } finally {
        deletingRef.current = false;

        setDeletingDateISO(null);
      }
    }
  }

  // ==================================================
  // CONFIRMAR ELIMINACIÓN
  // ==================================================

  function confirmDeleteSchedule(
    schedule: CenterSpecialSchedule
  ) {
    if (
      deletingRef.current ||
      loadingRef.current ||
      deleteAlertOpenRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    const fullDate = formatCenterDate(
      schedule.dateISO
    );

    deleteAlertOpenRef.current = true;

    Alert.alert(
      'Eliminar horario especial',
      `¿Estás seguro de que quieres eliminar el horario especial del ${fullDate}? Esta acción no se puede deshacer. Se eliminará esta excepción de la configuración. Las citas existentes no se modificarán.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            deleteAlertOpenRef.current = false;
          },
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteAlertOpenRef.current = false;

            if (navigation.isFocused()) {
              void handleDeleteSchedule(
                schedule.dateISO
              );
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          deleteAlertOpenRef.current = false;
        },
      }
    );
  }

  return (
    <View style={styles.container}>

      {/* CABECERA */}

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (!deletingRef.current) {
              navigation.goBack();
            }
          }}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Horarios especiales
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            enabled={
              !loading &&
              !loadingMore &&
              !isDeleting
            }
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 110,
        }}
      >

        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="calendar-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Horarios para fechas concretas
            </Text>

            <Text style={styles.infoDescription}>
              Configura horarios diferentes al habitual
              o cierres excepcionales para días concretos.
            </Text>
          </View>
        </View>

        {/* SELECTOR DE VISTAS */}

        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              viewMode === 'calendar' &&
                styles.filterButtonActive,
            ]}
            disabled={isDeleting}
            onPress={() =>
              handleViewModeChange('calendar')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: viewMode === 'calendar',
              disabled: isDeleting,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={19}
              color={
                viewMode === 'calendar'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.filterText,
                viewMode === 'calendar' &&
                  styles.filterTextActive,
              ]}
            >
              Calendario
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              viewMode === 'list' &&
                styles.filterButtonActive,
            ]}
            disabled={isDeleting}
            onPress={() =>
              handleViewModeChange('list')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: viewMode === 'list',
              disabled: isDeleting,
            }}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={
                viewMode === 'list'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.filterText,
                viewMode === 'list' &&
                  styles.filterTextActive,
              ]}
            >
              Listado
            </Text>
          </Pressable>
        </View>

        {/* CALENDARIO MENSUAL */}

        {viewMode === 'calendar' && (
          <View style={styles.calendarContainer}>
            <MonthlyCalendar
              monthISO={monthISO}
              todayISO={getCenterTodayISO()}
              markedDates={markedDates}
              onMonthChange={handleMonthChange}
              onDayPress={handleCalendarDayPress}
              disabled={isDeleting}
              daysDisabled={
                isBusy ||
                !!error ||
                !!paginationError
              }
            />

            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    styles.legendSpecial,
                  ]}
                />

                <Text style={styles.legendText}>
                  Horario especial
                </Text>
              </View>

              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    styles.legendClosed,
                  ]}
                />

                <Text style={styles.legendText}>
                  Cierre excepcional
                </Text>
              </View>
            </View>

            <View style={styles.calendarHint}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={colors.primary}
              />

              <Text style={styles.calendarHintText}>
                Pulsa sobre un día para configurar
                o editar su horario especial.
              </Text>
            </View>
          </View>
        )}

        {/* AÑADIR HORARIO ESPECIAL */}

        {viewMode === 'list' && (
          <>

        <Pressable
          style={[
            styles.addButton,
            isDeleting && styles.disabledButton,
          ]}
          disabled={isDeleting}
          onPress={() => {
            if (
              !deletingRef.current &&
              !deleteAlertOpenRef.current
            ) {
              navigation.navigate(
                'CenterSpecialScheduleForm'
              );
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Añadir horario especial"
        >
          <Ionicons
            name="add-circle-outline"
            size={23}
            color={colors.white}
          />

          <Text style={styles.addButtonText}>
            Añadir horario especial
          </Text>
        </Pressable>

        {/* FILTROS */}

        <View style={styles.filterContainer}>

          <Pressable
            style={[
              styles.filterButton,
              filter === 'upcoming' &&
                styles.filterButtonActive,
            ]}
            disabled={isDeleting}
            onPress={() =>
              handleFilterChange('upcoming')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: filter === 'upcoming',
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={
                filter === 'upcoming'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.filterText,
                filter === 'upcoming' &&
                  styles.filterTextActive,
              ]}
            >
              Próximos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              filter === 'history' &&
                styles.filterButtonActive,
            ]}
            disabled={isDeleting}
            onPress={() =>
              handleFilterChange('history')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: filter === 'history',
            }}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={
                filter === 'history'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.filterText,
                filter === 'history' &&
                  styles.filterTextActive,
              ]}
            >
              Histórico
            </Text>
          </Pressable>

        </View>

          </>
        )}

        {/* ERROR DE ELIMINACIÓN */}

        {!!deleteError && (
          <View
            style={styles.deleteErrorCard}
            accessibilityLiveRegion="polite"
          >
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color={colors.error}
            />

            <Text style={styles.deleteErrorText}>
              {deleteError}
            </Text>
          </View>
        )}

        {/* CARGANDO */}

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.stateText}>
              Cargando horarios especiales...
            </Text>
          </View>
        )}

        {/* ERROR */}

        {!loading && error && (
          <View style={styles.stateCard}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.error}
            />

            <Text style={styles.stateText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => {
                if (!deletingRef.current) {
                  void loadSchedules();
                }
              }}
              disabled={isDeleting}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        )}

        {/* HORARIOS ESPECIALES */}

        {!loading && !error && (
          <>
            <Text style={styles.sectionTitle}>
              {viewMode === 'calendar'
                ? 'HORARIOS ESPECIALES DEL MES'
                : filter === 'upcoming'
                  ? 'PRÓXIMOS HORARIOS ESPECIALES'
                  : 'HISTÓRICO DE HORARIOS ESPECIALES'}
            </Text>

            {schedules.length > 0 && (
              <Text style={styles.resultsText}>
                {viewMode === 'calendar'
                  ? schedules.length === 1
                    ? '1 horario especial este mes'
                    : `${schedules.length} horarios especiales este mes`
                  : schedules.length === 1
                    ? '1 horario cargado'
                    : `${schedules.length} horarios cargados`}
              </Text>
            )}

            {schedules.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {viewMode === 'calendar'
                    ? 'Sin horarios especiales este mes'
                    : filter === 'upcoming'
                      ? 'No hay horarios especiales'
                      : 'No hay horarios anteriores'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {viewMode === 'calendar'
                    ? 'Pulsa sobre cualquier día del mes para configurar un horario especial o un cierre excepcional.'
                    : filter === 'upcoming'
                      ? 'No tienes horarios especiales configurados para próximas fechas.'
                      : 'Todavía no tienes horarios especiales correspondientes a fechas anteriores.'}
                </Text>
              </View>
            ) : (
              schedules.map((schedule) => (
                <SpecialScheduleCard
                  key={schedule.dateISO}
                  schedule={schedule}
                  disabled={isBusy}
                  deleting={
                    deletingDateISO ===
                      schedule.dateISO
                  }
                  onEdit={() => {
                    if (
                      !deletingRef.current &&
                      !loadingRef.current &&
                      !deleteAlertOpenRef.current
                    ) {
                      navigation.navigate(
                        'CenterSpecialScheduleForm',
                        {
                          schedule,
                        }
                      );
                    }
                  }}
                  onDelete={() =>
                    confirmDeleteSchedule(
                      schedule
                    )
                  }
                />
              ))
            )}

            {!!paginationError && (
              <View
                style={styles.deleteErrorCard}
                accessibilityLiveRegion="polite"
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={23}
                  color={colors.error}
                />

                <Text style={styles.deleteErrorText}>
                  {paginationError}
                </Text>
              </View>
            )}

            {viewMode === 'list' && hasMore && (
              <Pressable
                style={[
                  styles.loadMoreButton,
                  isBusy && styles.disabledButton,
                ]}
                disabled={isBusy}
                onPress={handleLoadMore}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: isBusy,
                  busy: loadingMore,
                }}
              >
                {loadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                ) : (
                  <Ionicons
                    name="chevron-down-circle-outline"
                    size={22}
                    color={colors.primary}
                  />
                )}

                <Text style={styles.loadMoreText}>
                  {loadingMore
                    ? 'Cargando horarios...'
                    : 'Cargar más horarios'}
                </Text>
              </Pressable>
            )}

            {viewMode === 'list' &&
              !hasMore &&
              !paginationError &&
              schedules.length > 0 && (
              <Text style={styles.endResultsText}>
                Todos los horarios están cargados.
              </Text>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ==================================================
// ESTILOS
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    marginLeft: 8,
  },

  scroll: {
    flex: 1,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  infoDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 5,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 20,
  },

  addButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.white,
  },

  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 5,
    gap: 5,
    marginTop: 22,
  },

  filterButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    gap: 7,
  },

  filterButtonActive: {
    backgroundColor: colors.primary,
  },

  filterText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.textSecondary,
  },

  filterTextActive: {
    color: colors.white,
  },

  calendarContainer: {
    marginTop: 18,
  },

  calendarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 16,
    rowGap: 10,
    marginTop: 16,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },

  legendSpecial: {
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  legendClosed: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },

  legendText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },

  calendarHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    marginTop: 16,
  },

  calendarHintText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
    marginTop: 30,
    marginBottom: 16,
  },

  stateCard: {
    alignItems: 'center',
    padding: 28,
    marginTop: 24,
    gap: 14,
  },

  stateText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },

  emptyDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },

  disabledButton: {
    opacity: 0.45,
  },

  deleteErrorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },

  deleteErrorText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.error,
  },

  resultsText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14,
  },

  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },

  loadMoreText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  endResultsText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 18,
  },
});
