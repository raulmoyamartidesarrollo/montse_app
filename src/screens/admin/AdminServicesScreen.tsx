import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  AdminServicesStackParamList,
} from '../../navigation/AdminServicesNavigator';

import AdminHeader from '../../components/admin/AdminHeader';
import CenterServiceCard from '../../components/admin/services/CenterServiceCard';

import {
  getCenterServices,
  type CenterService,
} from '../../services/centerServices';

import { colors } from '../../theme/colors';

// ==================================================
// TIPOS Y FILTROS
// ==================================================

type ServiceFilter = 'all' | 'active' | 'inactive';

type IconName =
  React.ComponentProps<typeof Ionicons>['name'];

const filters: {
  id: ServiceFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    id: 'all',
    label: 'Todos',
    icon: 'pricetags-outline',
  },
  {
    id: 'active',
    label: 'Activos',
    icon: 'checkmark-circle-outline',
  },
  {
    id: 'inactive',
    label: 'Inactivos',
    icon: 'pause-circle-outline',
  },
];

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .trim();
}

// ==================================================
// PANTALLA PRINCIPAL
// ==================================================

export default function AdminServicesScreen() {
  const insets = useSafeAreaInsets();

  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminServicesStackParamList>
    >();

  const [services, setServices] =
    useState<CenterService[]>([]);

  const [selectedFilter, setSelectedFilter] =
    useState<ServiceFilter>('all');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const requestIdRef = useRef(0);

  // ==================================================
  // CARGAR SERVICIOS
  // ==================================================

  const loadServices = useCallback(
    async (refresh = false) => {
      const requestId = ++requestIdRef.current;

      setLoading(!refresh);
      setRefreshing(refresh);
      setError(null);

      try {
        const result = await getCenterServices();

        if (requestId !== requestIdRef.current) {
          return;
        }

        setServices(result);
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error(
          '[AdminServicesScreen] Error cargando servicios:',
          err
        );

        setError(
          'No se ha podido cargar el listado de servicios.'
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadServices();

      return () => {
        requestIdRef.current += 1;
      };
    }, [loadServices])
  );

  // ==================================================
  // CONTADORES Y FILTROS
  // ==================================================

  const activeCount = useMemo(
    () => services.filter(
      (service) => service.active
    ).length,
    [services]
  );

  const inactiveCount =
    services.length - activeCount;

  const filteredServices = useMemo(() => {
    const query = normalizeText(search);

    return services.filter((service) => {
      if (
        selectedFilter === 'active' &&
        !service.active
      ) {
        return false;
      }

      if (
        selectedFilter === 'inactive' &&
        service.active
      ) {
        return false;
      }

      const searchableText = normalizeText(
        `${service.name} ${service.description}`
      );

      return (
        !query ||
        searchableText.includes(query)
      );
    });
  }, [
    services,
    selectedFilter,
    search,
  ]);

  const hasFilters =
    selectedFilter !== 'all' ||
    search.trim().length > 0;

  // ==================================================
  // TARJETA DE SERVICIO
  // ==================================================

  const renderService = ({
    item,
  }: {
    item: CenterService;
  }) => (
    <CenterServiceCard
      service={item}
      onPress={() =>
        navigation.navigate('EditService', {
          serviceId: item.serviceId,
        })
      }
    />
  );

  // ==================================================
  // CABECERA
  // ==================================================

  const listHeader = (
    <>
      <AdminHeader subtitle="Servicios y tratamientos" />

      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>
              SERVICIOS DEL CENTRO
            </Text>

            <Text style={styles.title}>
              Gestión de servicios
            </Text>

            <Text style={styles.subtitle}>
              Configura tus tratamientos, precios y duración.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear nuevo servicio"
            style={styles.newButton}
            onPress={() =>
              navigation.navigate('CreateService')
            }
          >
            <Ionicons
              name="add"
              size={21}
              color={colors.white}
            />

            <Text style={styles.newButtonText}>
              Nuevo
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {loading || error ? '—' : services.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Totales
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                { color: colors.secondary },
              ]}
            >
              {loading || error ? '—' : activeCount}
            </Text>

            <Text style={styles.summaryLabel}>
              Activos
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryNumber,
                { color: colors.textMuted },
              ]}
            >
              {loading || error ? '—' : inactiveCount}
            </Text>

            <Text style={styles.summaryLabel}>
              Inactivos
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />

          <TextInput
            accessibilityLabel="Buscar servicios"
            style={styles.searchInput}
            placeholder="Buscar servicios..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              hitSlop={8}
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.filtersRow}>
          {filters.map((filter) => {
            const selected =
              selectedFilter === filter.id;

            return (
              <Pressable
                key={filter.id}
                accessibilityRole="button"
                accessibilityState={{
                  selected,
                }}
                style={[
                  styles.filterChip,
                  selected &&
                    styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedFilter(filter.id)
                }
              >
                <Ionicons
                  name={filter.icon}
                  size={16}
                  color={
                    selected
                      ? colors.white
                      : colors.secondary
                  }
                />

                <Text
                  style={[
                    styles.filterText,
                    selected &&
                      styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>
            Listado de servicios
          </Text>

          <Text style={styles.listCount}>
            {loading || error
              ? '—'
              : `${filteredServices.length} resultados`}
          </Text>
        </View>
      </View>
    </>
  );

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <View style={styles.container}>
      <FlatList
        data={
          loading || error
            ? []
            : filteredServices
        }
        keyExtractor={(item) => item.serviceId}
        renderItem={renderService}
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 110,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadServices(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {loading || refreshing ? (
              <>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text style={styles.emptyDescription}>
                  Cargando servicios...
                </Text>
              </>
            ) : error ? (
              <>
                <Ionicons
                  name="alert-circle-outline"
                  size={40}
                  color={colors.error}
                />

                <Text style={styles.emptyTitle}>
                  Error al cargar servicios
                </Text>

                <Text style={styles.emptyDescription}>
                  {error}
                </Text>

                <Pressable
                  style={styles.retryButton}
                  onPress={() => void loadServices()}
                >
                  <Text style={styles.retryText}>
                    Reintentar
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="pricetags-outline"
                    size={36}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {services.length === 0
                    ? 'Todavía no tienes servicios'
                    : 'No se han encontrado servicios'}
                </Text>

                <Text style={styles.emptyDescription}>
                  {services.length === 0
                    ? 'Añade los tratamientos que ofreces en tu centro y configura su precio y duración.'
                    : 'Prueba con otra búsqueda o cambia los filtros seleccionados.'}
                </Text>

                {services.length === 0 ? (
                  <Pressable
                    style={styles.retryButton}
                    onPress={() =>
                      navigation.navigate('CreateService')
                    }
                  >
                    <Ionicons
                      name="add"
                      size={19}
                      color={colors.white}
                    />

                    <Text style={styles.retryText}>
                      Crear primer servicio
                    </Text>
                  </Pressable>
                ) : hasFilters ? (
                  <Pressable
                    style={styles.retryButton}
                    onPress={() => {
                      setSearch('');
                      setSelectedFilter('all');
                    }}
                  >
                    <Text style={styles.retryText}>
                      Limpiar filtros
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        }
      />
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

  listContent: {
    paddingHorizontal: 20,
  },

  content: {
    paddingTop: 8,
  },

  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  headingText: {
    flex: 1,
  },

  eyebrow: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondary,
    marginBottom: 8,
  },

  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.text,
  },

  subtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 7,
  },

  newButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginLeft: 10,
  },

  newButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.white,
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 23,
    color: colors.primary,
  },

  summaryLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 5,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: colors.surfaceBorder,
  },

  searchContainer: {
    minHeight: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.text,
  },

  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 23,
  },

  filterChip: {
    minHeight: 37,
    borderRadius: 20,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterChipActive: {
    backgroundColor: colors.primary,
  },

  filterText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },

  filterTextActive: {
    color: colors.white,
  },

  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    gap: 10,
  },

  listTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
  },

  listCount: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    marginTop: 4,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    marginTop: 17,
    textAlign: 'center',
  },

  emptyDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 9,
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    minHeight: 45,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.white,
  },
});
