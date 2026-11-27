import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

import type {
  CenterVacation,
  CenterVacationCursor,
  GetCenterVacationsInput,
} from '../../types/centerVacations';

import {
  getCenterVacations,
} from '../../services/centerVacations';

import {
  formatVacationRange,
  getVacationDurationDays,
  getVacationDatesInMonth,
  getVacationStatus,
  isDateInVacationRange,
} from '../../utils/centerVacationDates';

import {
  getCenterTodayISO,
  getMonthStartISO,
  getMonthEndISO,
  isValidDateISO,
} from '../../utils/centerScheduleDates';

import MonthlyCalendar, {
  type CalendarDayMark,
} from '../../components/admin/schedules/MonthlyCalendar';

type ViewMode = 'calendar' | 'list';

type VacationFilter = 'upcoming' | 'history';

type LoadMode = 'initial' | 'refresh' | 'more';

const PAGE_SIZE = 20;
const MONTH_PAGE_SIZE = 31;

export default function CenterVacationsScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<AdminMoreStackParamList>
  >();

  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] =
    useState<ViewMode>('calendar');

  const [filter, setFilter] =
    useState<VacationFilter>('upcoming');

  const [monthISO, setMonthISO] =
    useState(() =>
      getMonthStartISO(getCenterTodayISO())
    );

  const [vacations, setVacations] =
    useState<CenterVacation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [paginationError, setPaginationError] =
    useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(false);

  const cursorRef =
    useRef<CenterVacationCursor | null>(null);

  const queryBoundsRef =
    useRef<GetCenterVacationsInput | null>(null);

  const loadingRef = useRef(false);

  const focusedRef = useRef(false);

  const requestIdRef = useRef(0);

  const isBusy =
    loading || refreshing || loadingMore;

  // ==================================================
  // MARCAR VACACIONES EN EL CALENDARIO
  // ==================================================

  const markedDates = useMemo<
    Record<string, CalendarDayMark>
  >(() => {
    const marks: Record<string, CalendarDayMark> = {};

    if (viewMode !== 'calendar') {
      return marks;
    }

    for (const vacation of vacations) {
      const dates = getVacationDatesInMonth(
        vacation,
        monthISO
      );

      for (const dateISO of dates) {
        marks[dateISO] = {
          status: 'vacation',
          label: vacation.reason || undefined,
        };
      }
    }

    return marks;
  }, [vacations, monthISO, viewMode]);

  // ==================================================
  // RECUPERAR VACACIONES DESDE FIREBASE
  // ==================================================

  const loadVacations = useCallback(
    async (mode: LoadMode = 'initial') => {
      if (!focusedRef.current) {
        return;
      }

      if (
        mode !== 'initial' &&
        loadingRef.current
      ) {
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
        setVacations([]);
        setHasMore(false);

        cursorRef.current = null;
        queryBoundsRef.current = null;
      }

      try {
        const todayISO = getCenterTodayISO();

        const bounds: GetCenterVacationsInput =
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
                    endBeforeDateISO: todayISO,
                  };

        const cursor = cursorRef.current;

        const result = await getCenterVacations({
          ...bounds,

          ...(mode === 'more' && cursor
            ? {
                cursorStartDateISO:
                  cursor.startDateISO,

                cursorVacationId:
                  cursor.vacationId,
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
            'La consulta mensual contiene más periodos de los esperados.'
          );
        }

        if (mode === 'more') {
          setVacations((previous) => {
            const merged = new Map(
              previous.map((vacation) => [
                vacation.id,
                vacation,
              ])
            );

            for (const vacation of result.vacations) {
              merged.set(vacation.id, vacation);
            }

            return Array.from(merged.values()).sort(
              (a, b) =>
                a.startDateISO.localeCompare(
                  b.startDateISO
                ) || a.id.localeCompare(b.id)
            );
          });

        } else {
          setVacations(result.vacations);
        }

        queryBoundsRef.current = bounds;

        cursorRef.current = result.nextCursor;

        setHasMore(result.hasMore);

      } catch (loadError) {
        if (
          requestId !== requestIdRef.current ||
          !focusedRef.current
        ) {
          return;
        }

        console.error(
          '[CenterVacationsScreen]',
          loadError
        );

        if (mode === 'initial') {
          setError(
            'No se han podido recuperar las vacaciones del centro.'
          );
        } else {
          setPaginationError(
            mode === 'more'
              ? 'No se han podido cargar más periodos.'
              : 'No se han podido actualizar las vacaciones.'
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
    [viewMode, filter, monthISO]
  );

  // ==================================================
  // ACTUALIZAR AL ENTRAR EN LA PANTALLA
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      void loadVacations();

      return () => {
        focusedRef.current = false;
        loadingRef.current = false;

        requestIdRef.current += 1;
      };
    }, [loadVacations])
  );

  function resetVacationQuery() {
    requestIdRef.current += 1;

    loadingRef.current = false;

    cursorRef.current = null;
    queryBoundsRef.current = null;

    setVacations([]);
    setHasMore(false);
    setError(null);
    setPaginationError(null);

    setLoading(true);
    setRefreshing(false);
    setLoadingMore(false);

  }

  // ==================================================
  // CAMBIAR VISTA, FILTRO Y MES
  // ==================================================

  function handleViewModeChange(nextViewMode: ViewMode) {
    if (
      nextViewMode === viewMode ||
      !navigation.isFocused()
    ) {
      return;
    }

    resetVacationQuery();
    setViewMode(nextViewMode);
  }

  function handleFilterChange(nextFilter: VacationFilter) {
    if (
      viewMode !== 'list' ||
      nextFilter === filter ||
      !navigation.isFocused()
    ) {
      return;
    }

    resetVacationQuery();
    setFilter(nextFilter);
  }

  function handleMonthChange(nextMonthISO: string) {
    if (
      viewMode !== 'calendar' ||
      !isValidDateISO(nextMonthISO) ||
      !navigation.isFocused()
    ) {
      return;
    }

    const normalizedMonth =
      getMonthStartISO(nextMonthISO);

    if (normalizedMonth === monthISO) {
      return;
    }

    resetVacationQuery();
    setMonthISO(normalizedMonth);
  }

  function handleCalendarDayPress(dateISO: string) {
    if (
      isBusy ||
      loadingRef.current ||
      error ||
      paginationError ||
      !navigation.isFocused() ||
      !isValidDateISO(dateISO) ||
      dateISO < getCenterTodayISO() ||
      getMonthStartISO(dateISO) !== monthISO
    ) {
      return;
    }

    const existingVacation = vacations.find(
      (vacation) =>
        isDateInVacationRange(dateISO, vacation)
    );

    if (existingVacation) {
      navigation.navigate('CenterVacationForm', {
        vacation: existingVacation,
      });

      return;
    }

    navigation.navigate('CenterVacationForm', {
      dateISO,
    });
  }

  function handleCreateVacation() {
    if (
      isBusy ||
      loadingRef.current ||
      error ||
      paginationError ||
      !navigation.isFocused()
    ) {
      return;
    }

    const todayISO = getCenterTodayISO();

    const initialDateISO =
      viewMode === 'calendar' &&
      monthISO > todayISO
        ? monthISO
        : todayISO;

    navigation.navigate('CenterVacationForm', {
      dateISO: initialDateISO,
    });
  }

  function handleRefresh() {
    if (
      loadingRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    void loadVacations(
      error ? 'initial' : 'refresh'
    );
  }

  function handleLoadMore() {
    if (
      viewMode !== 'list' ||
      !hasMore ||
      loadingRef.current ||
      !navigation.isFocused()
    ) {
      return;
    }

    void loadVacations('more');
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            enabled={!isBusy}
          />
        }
      >
        {/* CABECERA */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <Text style={styles.title}>
            Vacaciones
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Gestiona los periodos de vacaciones del centro.
        </Text>

        {/* INFORMACIÓN */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="sunny-outline"
              size={26}
              color={colors.secondary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Vacaciones del centro
            </Text>

            <Text style={styles.infoDescription}>
              Configura los periodos completos de cierre
              por vacaciones, desde un único día hasta
              varias semanas o meses.
            </Text>
          </View>
        </View>

        {/* AÑADIR VACACIONES */}

        <Pressable
          style={[
            styles.addButton,
            (
              isBusy ||
              !!error ||
              !!paginationError
            ) && styles.addButtonDisabled,
          ]}
          onPress={handleCreateVacation}
          disabled={
            isBusy ||
            !!error ||
            !!paginationError
          }
          accessibilityRole="button"
          accessibilityLabel="Añadir vacaciones"
          accessibilityState={{
            disabled:
              isBusy ||
              !!error ||
              !!paginationError,
          }}
        >
          <Ionicons
            name="add-circle-outline"
            size={23}
            color={colors.white}
          />

          <Text style={styles.addButtonText}>
            Añadir vacaciones
          </Text>
        </Pressable>

        {/* SELECTOR DE VISTA */}

        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              viewMode === 'calendar' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              handleViewModeChange('calendar')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: viewMode === 'calendar',
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

            <Text style={[
              styles.filterText,
              viewMode === 'calendar' &&
                styles.filterTextActive,
            ]}>
              Calendario
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              viewMode === 'list' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              handleViewModeChange('list')
            }
            accessibilityRole="button"
            accessibilityState={{
              selected: viewMode === 'list',
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

            <Text style={[
              styles.filterText,
              viewMode === 'list' &&
                styles.filterTextActive,
            ]}>
              Listado
            </Text>
          </Pressable>
        </View>

        {/* CALENDARIO */}

        {viewMode === 'calendar' && (
          <View style={styles.calendarContainer}>
            <MonthlyCalendar
              monthISO={monthISO}
              todayISO={getCenterTodayISO()}
              minimumDateISO={getCenterTodayISO()}
              markedDates={markedDates}
              onMonthChange={handleMonthChange}
              onDayPress={handleCalendarDayPress}
              daysDisabled={
                isBusy ||
                !!error ||
                !!paginationError
              }
            />

            <View style={styles.calendarLegend}>
              <View style={styles.legendDot} />

              <Text style={styles.legendText}>
                Vacaciones del centro
              </Text>
            </View>
          </View>
        )}

        {/* FILTROS DEL LISTADO */}

        {viewMode === 'list' && (
          <View style={styles.filterContainer}>
            <Pressable
              style={[
                styles.filterButton,
                filter === 'upcoming' &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                handleFilterChange('upcoming')
              }
              accessibilityRole="button"
              accessibilityState={{
                selected: filter === 'upcoming',
              }}
            >
              <Text style={[
                styles.filterText,
                filter === 'upcoming' &&
                  styles.filterTextActive,
              ]}>
                Próximas
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.filterButton,
                filter === 'history' &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                handleFilterChange('history')
              }
              accessibilityRole="button"
              accessibilityState={{
                selected: filter === 'history',
              }}
            >
              <Text style={[
                styles.filterText,
                filter === 'history' &&
                  styles.filterTextActive,
              ]}>
                Histórico
              </Text>
            </Pressable>
          </View>
        )}

        {/* ESTADO DE CARGA */}

        {loading && !refreshing && (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />

            <Text style={styles.stateText}>
              Cargando vacaciones...
            </Text>
          </View>
        )}

        {/* ERROR */}

        {!loading && error && (
          <View style={styles.stateCard}>
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={colors.error}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() =>
                void loadVacations()
              }
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>
                Volver a intentar
              </Text>
            </Pressable>
          </View>
        )}

        {/* VACACIONES */}

        {!loading && !error && (
          <View style={styles.results}>
            <Text style={styles.sectionTitle}>
              {viewMode === 'calendar'
                ? 'VACACIONES DEL MES'
                : filter === 'upcoming'
                  ? 'VACACIONES ACTUALES Y FUTURAS'
                  : 'HISTÓRICO DE VACACIONES'}
            </Text>

            {vacations.length === 0 ? (
              <View style={styles.stateCard}>
                <Ionicons
                  name="calendar-outline"
                  size={34}
                  color={colors.textMuted}
                />

                <Text style={styles.emptyTitle}>
                  {viewMode === 'calendar'
                    ? 'Sin vacaciones este mes'
                    : filter === 'upcoming'
                      ? 'No hay vacaciones programadas'
                      : 'No hay vacaciones anteriores'}
                </Text>

                <Text style={styles.stateText}>
                  Los periodos de vacaciones del centro
                  aparecerán aquí.
                </Text>
              </View>
            ) : (
              vacations.map((vacation) => {
                const duration =
                  getVacationDurationDays(vacation);

                const status =
                  getVacationStatus(vacation);

                return (
                  <View
                    key={vacation.id}
                    style={styles.vacationCard}
                  >
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {status === 'current'
                          ? 'En curso'
                          : status === 'upcoming'
                            ? 'Programadas'
                            : 'Finalizadas'}
                      </Text>
                    </View>

                    <Text style={styles.vacationTitle}>
                      {formatVacationRange(vacation)}
                    </Text>

                    <Text style={styles.duration}>
                      {duration} {duration === 1 ? 'día' : 'días'}
                    </Text>

                    {vacation.reason.length > 0 && (
                      <Text style={styles.reason}>
                        {vacation.reason}
                      </Text>
                    )}
                  </View>
                );
              })
            )}

            {!!paginationError && (
              <Text style={styles.errorText}>
                {paginationError}
              </Text>
            )}

            {viewMode === 'list' && hasMore && (
              <Pressable
                style={[
                  styles.loadMoreButton,
                  isBusy && { opacity: 0.45 },
                ]}
                disabled={isBusy}
                onPress={handleLoadMore}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: isBusy,
                  busy: loadingMore,
                }}
              >
                {loadingMore && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                )}

                <Text style={styles.loadMoreText}>
                  {loadingMore
                    ? 'Cargando vacaciones...'
                    : 'Cargar más vacaciones'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: colors.text,
    flex: 1,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 21,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.secondary,
  },
  infoDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondary,
    marginTop: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 20,
    gap: 10,
  },
  addButtonDisabled: {
    opacity: 0.45,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  legendText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.secondary,
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
    marginTop: 16,
  },
  loadMoreText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  results: {
    marginTop: 28,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 12,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  stateText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.onPrimary,
  },
  vacationCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  vacationTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  duration: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.secondary,
    marginTop: 8,
  },
  reason: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
});
