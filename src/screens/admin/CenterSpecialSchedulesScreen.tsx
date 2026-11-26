import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
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
} from '../../services/centerSpecialSchedules';

import {
  DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
  type CenterSpecialSchedule,
} from '../../types/centerSpecialSchedules';

import {
  getCenterTodayISO,
  addDaysToDateISO,
} from '../../utils/centerScheduleDates';

import SpecialScheduleCard from '../../components/admin/schedules/SpecialScheduleCard';

import type {
  AdminMoreStackParamList,
} from '../../navigation/AdminMoreNavigator';

// ==================================================
// PANTALLA DE HORARIOS ESPECIALES
// ==================================================

type ScheduleFilter = 'upcoming' | 'history';

export default function CenterSpecialSchedulesScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<AdminMoreStackParamList>
  >();

  const insets = useSafeAreaInsets();

  const [filter, setFilter] =
    useState<ScheduleFilter>('upcoming');

  const [schedules, setSchedules] =
    useState<CenterSpecialSchedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(false);

  const requestIdRef = useRef(0);

  // ==================================================
  // RECUPERAR HORARIOS ESPECIALES
  // ==================================================

  const loadSchedules = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setSchedules([]);
    setHasMore(false);

    try {
      const todayISO = getCenterTodayISO();

      const result = await getCenterSpecialSchedules({
        ...(filter === 'upcoming'
          ? {
              fromDateISO: todayISO,
            }
          : {
              toDateISO: addDaysToDateISO(
                todayISO,
                -1
              ),
            }),

        limit: DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSchedules(result.specialSchedules);
      setHasMore(result.hasMore);

    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        '[CenterSpecialSchedulesScreen] Error cargando horarios:',
        err
      );

      setError(
        'No se han podido recuperar los horarios especiales.'
      );

    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filter]);

  // ==================================================
  // ACTUALIZAR AL ENTRAR EN LA PANTALLA
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      void loadSchedules();

      return () => {
        requestIdRef.current += 1;
      };
    }, [loadSchedules])
  );

  // ==================================================
  // CAMBIAR FILTRO
  // ==================================================

  function handleFilterChange(
    nextFilter: ScheduleFilter
  ) {
    if (nextFilter === filter) {
      return;
    }

    // Invalidar cualquier consulta anterior.

    requestIdRef.current += 1;

    setLoading(true);
    setError(null);
    setSchedules([]);
    setHasMore(false);

    setFilter(nextFilter);
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

        <Text style={styles.headerTitle}>
          Horarios especiales
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
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

        {/* AÑADIR HORARIO ESPECIAL */}

        <Pressable
          style={styles.addButton}
          onPress={() =>
            navigation.navigate(
              'CenterSpecialScheduleForm'
            )
          }
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
              onPress={() => void loadSchedules()}
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
              {filter === 'upcoming'
                ? 'PRÓXIMOS HORARIOS ESPECIALES'
                : 'HISTÓRICO DE HORARIOS ESPECIALES'}
            </Text>

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
                  {filter === 'upcoming'
                    ? 'No hay horarios especiales'
                    : 'No hay horarios anteriores'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {filter === 'upcoming'
                    ? 'No tienes horarios especiales configurados para próximas fechas.'
                    : 'Todavía no tienes horarios especiales correspondientes a fechas anteriores.'}
                </Text>
              </View>
            ) : (
              schedules.map((schedule) => (
                <SpecialScheduleCard
                  key={schedule.dateISO}
                  schedule={schedule}
                  onEdit={() =>
                    navigation.navigate(
                      'CenterSpecialScheduleForm',
                      {
                        schedule,
                      }
                    )
                  }
                />
              ))
            )}

            {hasMore && (
              <View style={styles.noticeCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={23}
                  color={colors.primary}
                />

                <Text style={styles.noticeText}>
                  Se muestran los primeros {
                    DEFAULT_SPECIAL_SCHEDULE_PAGE_SIZE
                  } horarios. Hay más resultados disponibles.
                </Text>
              </View>
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

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginTop: 20,
  },

  noticeText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
