import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
    Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminHeader from '../../components/admin/AdminHeader';
import { colors } from '../../theme/colors';
import {
  CenterClient,
  getCenterClients,
  restoreCenterClient,
  deleteCenterClient,
} from '../../services/clients';
import CreatePatientModal from '../../components/admin/CreatePatientModal';
import EditPatientModal from '../../components/admin/EditPatientModal';

type PatientFilter =
  | 'all'
  | 'activePackage'
  | 'upcomingAppointment'
  | 'inactive';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const filters: {
  id: PatientFilter;
  label: string;
  icon: IconName;
}[] = [
  { id: 'all', label: 'Todos', icon: 'checkmark' },
  {
    id: 'activePackage',
    label: 'Con Bono Activo',
    icon: 'pricetag-outline',
  },
  {
    id: 'upcomingAppointment',
    label: 'Con Cita Próxima',
    icon: 'calendar-outline',
  },
  {
    id: 'inactive',
    label: 'Inactivos',
    icon: 'pause-circle-outline',
  },
];

function getInitials(client: CenterClient): string {
  const first = client.name.trim().charAt(0);
  const last = client.surname.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || 'P';
}

function getFullName(client: CenterClient): string {
  return `${client.name} ${client.surname}`.trim() || 'Paciente sin nombre';
}

export default function AdminPatientsScreen() {
  const insets = useSafeAreaInsets();
  const [createPatientVisible, setCreatePatientVisible] = useState(false);
  const [editPatientVisible, setEditPatientVisible] = useState(false);

  const [clients, setClients] = useState<CenterClient[]>([]);
  const [patientView, setPatientView] = useState<'patients' | 'trash'>(
  'patients'
);
const deletedClients = useMemo(
  () => clients.filter((client) => client.deleted),
  [clients]
);
  const visibleClients = useMemo(
  () => clients.filter((client) => !client.deleted),
  [clients]
);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] =
    useState<PatientFilter>('all');

  const [selectedClientId, setSelectedClientId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringClientId, setRestoringClientId] =
  useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] =
  useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);

      const result = await getCenterClients();

      setClients(result);
    } catch (err) {
      console.error('Error cargando pacientes:', err);

      setError(
        'No se ha podido cargar el listado de pacientes.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRestorePatient = useCallback(
  (client: CenterClient) => {
    Alert.alert(
      'Restaurar paciente',
      `¿Quieres restaurar la ficha de ${getFullName(client)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Restaurar',
          onPress: () => {
            void (async () => {
              try {
                setRestoringClientId(client.id);

                await restoreCenterClient(client.id);

                // Actualizamos el listado local.
                setClients((previous) =>
                  previous.map((item) =>
                    item.id === client.id
                      ? { ...item, deleted: false }
                      : item
                  )
                );

                setSelectedClientId(null);

                Alert.alert(
                  'Paciente restaurado',
                  'La ficha se ha recuperado correctamente.'
                );

                // Sincronizamos nuevamente con Firebase.
                await loadClients(true);
              } catch (err) {
                console.error(
                  'Error restaurando paciente:',
                  err
                );

                Alert.alert(
                  'Error',
                  'No se ha podido restaurar el paciente. Inténtalo de nuevo.'
                );
              } finally {
                setRestoringClientId(null);
              }
            })();
          },
        },
      ]
    );
  },
  [loadClients]
);

  useFocusEffect(
    useCallback(() => {
      void loadClients();
    }, [loadClients])
  );

const handleDeletePatient = useCallback(
  (client: CenterClient) => {
    Alert.alert(
      'Eliminar paciente',
      `¿Quieres enviar a ${getFullName(client)} a la papelera?\n\n` +
        'La ficha desaparecerá del directorio, pero podrás restaurarla posteriormente.\n\n' +
        'Sus citas, bonos e historial se conservarán.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setDeletingClientId(client.id);

                await deleteCenterClient(client.id);

                // Actualizamos el listado local.
                setClients((previous) =>
                  previous.map((item) =>
                    item.id === client.id
                      ? { ...item, deleted: true }
                      : item
                  )
                );

                setSelectedClientId(null);

                Alert.alert(
                  'Paciente eliminado',
                  'El paciente se ha enviado a la papelera. Puedes restaurarlo cuando lo necesites.'
                );

                // Sincronizamos con Firebase.
                await loadClients(true);
              } catch (err) {
                console.error(
                  'Error eliminando paciente:',
                  err
                );

                Alert.alert(
                  'Error',
                  'No se ha podido enviar el paciente a la papelera.'
                );
              } finally {
                setDeletingClientId(null);
              }
            })();
          },
        },
      ]
    );
  },
  [loadClients]
);

const activeClients = useMemo(
  () =>
    visibleClients.filter(
      (client) => client.status === 'active'
    ),
  [visibleClients]
);

  const normalizedSearch = search.trim().toLocaleLowerCase('es-ES');
  const currentViewClients = useMemo(
  () =>
    patientView === 'trash'
      ? deletedClients
      : visibleClients,
  [patientView, deletedClients, visibleClients]
);

const filteredClients = useMemo(() => {
  return currentViewClients.filter((client) => {
    const searchable = [
      client.name,
      client.surname,
      client.phone,
      client.email,
    ]
      .join(' ')
      .toLocaleLowerCase('es-ES');

    if (!searchable.includes(normalizedSearch)) {
      return false;
    }

    // En la papelera mostramos todos los eliminados.
    if (patientView === 'trash') {
      return true;
    }

    switch (selectedFilter) {
      case 'inactive':
        return client.status === 'inactive';

      case 'activePackage':
      case 'upcomingAppointment':
        return false;

      case 'all':
      default:
        return true;
    }
  });
}, [
  currentViewClients,
  normalizedSearch,
  selectedFilter,
  patientView,
]);

  const selectedClient = useMemo(() => {
    if (!filteredClients.length) {
      return null;
    }

    return (
      filteredClients.find(
        (client) => client.id === selectedClientId
      ) ?? filteredClients[0]
    );
  }, [filteredClients, selectedClientId]);

  const remainingClients = filteredClients.filter(
    (client) => client.id !== selectedClient?.id
  );

  const renderActionButton = (
    icon: IconName,
    label: string,
    onPress: () => void,
    primary = false,
    disabled = false
  ) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionButton,
        primary
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
        disabled && styles.disabledButton,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={primary ? colors.white : colors.secondary}
      />

      <Text
        style={[
          styles.actionButtonText,
          primary && styles.actionButtonTextPrimary,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: 110 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadClients(true)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AdminHeader subtitle="Directorio clínico" />

        <View style={styles.content}>
          {/* CABECERA */}
          <View style={styles.heading}>
            <View style={styles.headingText}>
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowDot} />

                <Text style={styles.eyebrow}>
                  DIRECTORIO CLÍNICO
                </Text>
              </View>

              <Text style={styles.title}>
                Gestión de{'\n'}Pacientes
              </Text>
            </View>

            {patientView === 'patients' && (
  <Pressable
    style={styles.newButton}
    onPress={() => setCreatePatientVisible(true)}
    accessibilityLabel="Crear nuevo paciente"
  >
    <Ionicons
      name="person-add-outline"
      size={19}
      color={colors.white}
    />

    <Text style={styles.newButtonText}>
      + Nuevo
    </Text>
  </Pressable>
)}
          </View>

          {/* ESTADÍSTICAS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>
                  {activeClients.length}
                </Text>

                <Text style={styles.statLabel}>
                  Expedientes{'\n'}activos
                </Text>
              </View>

              <View style={styles.statIcon}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <Text style={styles.statNumberSecondary}>
                  —
                </Text>

                <Text style={styles.statLabel}>
                  Nuevos este mes
                </Text>
              </View>

              <View style={styles.statIconGreen}>
                <Ionicons
                  name="trending-up-outline"
                  size={22}
                  color={colors.secondary}
                />
              </View>
            </View>
          </View>
          <View style={styles.patientViewTabs}>
  <Pressable
    style={[
      styles.patientViewTab,
      patientView === 'patients' && styles.patientViewTabActive,
    ]}
    onPress={() => {
      setPatientView('patients');
      setSelectedClientId(null);
      setSelectedFilter('all');
    }}
  >
    <Ionicons
      name="people-outline"
      size={18}
      color={patientView === 'patients' ? '#FFFFFF' : '#64748B'}
    />

    <Text
      style={[
        styles.patientViewTabText,
        patientView === 'patients' && styles.patientViewTabTextActive,
      ]}
    >
      Pacientes ({visibleClients.length})
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.patientViewTab,
      patientView === 'trash' && styles.patientViewTabActive,
    ]}
    onPress={() => {
      setPatientView('trash');
      setSelectedClientId(null);
      setSelectedFilter('all');
    }}
  >
    <Ionicons
      name="trash-outline"
      size={18}
      color={patientView === 'trash' ? '#FFFFFF' : '#64748B'}
    />

    <Text
      style={[
        styles.patientViewTabText,
        patientView === 'trash' && styles.patientViewTabTextActive,
      ]}
    >
      Papelera ({deletedClients.length})
    </Text>
  </Pressable>
</View>

          {/* BUSCADOR */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={21}
              color={colors.textSecondary}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, teléfono o email..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* FILTROS */}
{patientView === 'patients' && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filtersContent}
    style={styles.filtersScroll}
  >
    {filters.map((filter) => {
      const active = selectedFilter === filter.id;

      return (
        <Pressable
          key={filter.id}
          onPress={() => setSelectedFilter(filter.id)}
          style={[
            styles.filterChip,
            active && styles.filterChipActive,
          ]}
        >
          <Ionicons
            name={filter.icon}
            size={15}
            color={
              active ? colors.white : colors.secondary
            }
          />

          <Text
            style={[
              styles.filterText,
              active && styles.filterTextActive,
            ]}
          >
            {filter.id === 'all'
              ? `Todos (${visibleClients.length})`
              : filter.label}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
)}

          {/* ESTADOS DE CARGA */}
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />

              <Text style={styles.emptyDescription}>
                Cargando pacientes...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="alert-circle-outline"
                size={38}
                color={colors.error}
              />

              <Text style={styles.emptyTitle}>
                Error al cargar pacientes
              </Text>

              <Text style={styles.emptyDescription}>
                {error}
              </Text>

              <Pressable
                style={styles.retryButton}
                onPress={() => void loadClients()}
              >
                <Text style={styles.retryText}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : filteredClients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-outline"
                size={42}
                color={colors.primary}
              />

              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? 'No hay coincidencias'
                  : selectedFilter !== 'all'
                    ? 'No hay pacientes en este filtro'
                    : 'Todavía no hay pacientes'}
              </Text>

              <Text style={styles.emptyDescription}>
                {selectedFilter === 'activePackage' ||
                selectedFilter === 'upcomingAppointment'
                  ? 'Este filtro estará disponible cuando conectemos los bonos y las citas.'
                  : 'Los pacientes registrados aparecerán aquí.'}
              </Text>
            </View>
          ) : (
            <>
              {/* PACIENTE DESTACADO */}
              {selectedClient && (
                <View style={styles.featuredCard}>
                  <View style={styles.patientHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(selectedClient)}
                      </Text>
                    </View>

                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>
                        {getFullName(selectedClient)}
                      </Text>

                      <Text style={styles.patientContact}>
                        {selectedClient.phone ||
                          selectedClient.email ||
                          'Sin datos de contacto'}
                      </Text>

                      {selectedClient.isTest && (
                        <Text style={styles.testLabel}>
                          Paciente de prueba
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        selectedClient.status === 'inactive' &&
                          styles.statusBadgeInactive,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {selectedClient.status === 'active'
                          ? 'Activo'
                          : 'Inactivo'}
                      </Text>
                    </View>
                  </View>

                  {/* BONO */}
                  <View style={styles.packageCard}>
                    <View style={styles.packageIcon}>
                      <Ionicons
                        name="pricetag-outline"
                        size={22}
                        color={colors.secondary}
                      />
                    </View>

                    <View style={styles.packageInfo}>
                      <Text style={styles.packageTitle}>
                        Bonos de sesiones
                      </Text>

                      <Text style={styles.packageDescription}>
                        Pendiente de conectar con Firebase
                      </Text>
                    </View>
                  </View>

                  {/* ACCIONES */}
{patientView === 'trash' ? (
  <View style={styles.actionsRow}>
    <Pressable
      style={[
        styles.restoreButton,
        restoringClientId === selectedClient.id &&
          styles.disabledButton,
      ]}
      disabled={restoringClientId !== null}
      onPress={() => handleRestorePatient(selectedClient)}
    >
      {restoringClientId === selectedClient.id ? (
        <ActivityIndicator
          size="small"
          color={colors.white}
        />
      ) : (
        <Ionicons
          name="refresh-outline"
          size={19}
          color={colors.white}
        />
      )}

      <Text style={styles.restoreButtonText}>
        {restoringClientId === selectedClient.id
          ? 'Restaurando...'
          : 'Restaurar paciente'}
      </Text>
    </Pressable>
  </View>
) : (
  <>
    <View style={styles.actionsRow}>
      {renderActionButton(
        'calendar-outline',
        'Nueva Cita Manual',
        () => {},
        true,
        true
      )}

      {renderActionButton(
        'card-outline',
        'Vincular Bono',
        () => {},
        false,
        true
      )}
    </View>

    {/* GESTIÓN DEL PACIENTE */}
    <View style={styles.patientManagementSection}>
      <Text style={styles.patientManagementTitle}>
        Gestión del paciente
      </Text>
      <Pressable
  style={styles.editPatientButton}
  onPress={() => setEditPatientVisible(true)}
  accessibilityLabel="Editar paciente"
>
  <Ionicons
    name="create-outline"
    size={19}
    color={colors.primary}
  />

  <Text style={styles.editPatientButtonText}>
    Editar paciente
  </Text>
</Pressable>

      <Pressable
        style={[
          styles.deletePatientButton,
          deletingClientId === selectedClient.id &&
            styles.disabledButton,
        ]}
        disabled={deletingClientId !== null}
        onPress={() => handleDeletePatient(selectedClient)}
      >
        {deletingClientId === selectedClient.id ? (
          <ActivityIndicator
            size="small"
            color="#DC2626"
          />
        ) : (
          <Ionicons
            name="trash-outline"
            size={19}
            color="#DC2626"
          />
        )}

        <Text style={styles.deletePatientButtonText}>
          {deletingClientId === selectedClient.id
            ? 'Eliminando...'
            : 'Eliminar paciente'}
        </Text>
      </Pressable>

      <Text style={styles.deletePatientDescription}>
        El paciente se moverá a la papelera y podrás
        restaurarlo posteriormente.
      </Text>
    </View>
  </>
)}

                  {/* HISTORIAL */}
                  <View style={styles.historySection}>
                    <View style={styles.historyHeading}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={colors.primary}
                      />

                      <Text style={styles.historyTitle}>
                        Agenda e Historial Clínico
                      </Text>
                    </View>

                    <View style={styles.historyEmpty}>
                      <Text style={styles.historyEmptyText}>
                        Las próximas citas y sesiones anteriores
                        aparecerán aquí cuando conectemos
                        el sistema de reservas.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* RESTO DE PACIENTES */}
              {remainingClients.length > 0 && (
                <View style={styles.directorySection}>
                  <Text style={styles.directoryTitle}>
                    Más pacientes
                  </Text>

                  {remainingClients.map((client) => (
                    <Pressable
                      key={client.id}
                      style={styles.patientRow}
                      onPress={() => setSelectedClientId(client.id)}
                    >
                      <View style={styles.smallAvatar}>
                        <Text style={styles.smallAvatarText}>
                          {getInitials(client)}
                        </Text>
                      </View>

                      <View style={styles.rowInfo}>
                        <Text
                          style={styles.rowName}
                          numberOfLines={1}
                        >
                          {getFullName(client)}
                        </Text>

                        <Text
                          style={styles.rowDetail}
                          numberOfLines={1}
                        >
                          {client.phone ||
                            client.email ||
                            'Sin datos de contacto'}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.primary}
                      />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      <CreatePatientModal
        visible={createPatientVisible}
        onClose={() => setCreatePatientVisible(false)}
        onCreated={(clientId) => {
            setSelectedClientId(clientId);
            setSearch('');
            setSelectedFilter('all');
            void loadClients();
        }}
        />
        <EditPatientModal
  visible={editPatientVisible}
  client={selectedClient}
  onClose={() => setEditPatientVisible(false)}
  onUpdated={(clientId) => {
    setSelectedClientId(clientId);
    void loadClients(true);
  }}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headingText: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondary,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 27,
    lineHeight: 36,
    color: colors.text,
  },
  newButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 10,
  },
  newButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: colors.white,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.65,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    padding: 12,
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.primary,
  },
  statNumberSecondary: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.secondary,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    height: 54,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 17,
    paddingHorizontal: 15,
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
  filtersScroll: {
    marginTop: 12,
    marginBottom: 24,
  },
  filtersContent: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 2,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 20,
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
  featuredCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  patientContact: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  testLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 5,
  },
  statusBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: colors.secondary,
  },
  packageCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  packageIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  packageDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minHeight: 49,
    paddingHorizontal: 9,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surfaceMuted,
  },
  actionButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionButtonTextPrimary: {
    color: colors.white,
  },
  historySection: {
    marginTop: 24,
  },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  historyTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.text,
    flexShrink: 1,
  },
  historyEmpty: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  historyEmptyText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  directorySection: {
    marginBottom: 20,
  },
  directoryTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    marginBottom: 14,
  },
  patientRow: {
    backgroundColor: colors.surface,
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  smallAvatarText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  rowDetail: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: colors.text,
    marginTop: 14,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 18,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },
  patientViewTabs: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 18,
},

patientViewTab: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 13,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: '#F1F5F9',
},

patientViewTabActive: {
  backgroundColor: '#2563EB',
},

patientViewTabText: {
  fontSize: 13,
  fontWeight: '600',
  color: '#64748B',
},

patientViewTabTextActive: {
  color: '#FFFFFF',
},
restoreButton: {
  flex: 1,
  minHeight: 50,
  backgroundColor: colors.secondary,
  borderRadius: 25,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  paddingHorizontal: 16,
},

restoreButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 13,
  color: colors.white,
},
patientManagementSection: {
  marginTop: 22,
  paddingTop: 18,
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
},

patientManagementTitle: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 14,
  color: colors.text,
  marginBottom: 12,
},

deletePatientButton: {
  minHeight: 48,
  borderRadius: 14,
  backgroundColor: '#FEF2F2',
  borderWidth: 1,
  borderColor: '#FECACA',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  paddingHorizontal: 14,
},

deletePatientButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 13,
  color: '#DC2626',
},

deletePatientDescription: {
  fontFamily: 'PlusJakartaSans_400Regular',
  fontSize: 11,
  lineHeight: 17,
  color: colors.textSecondary,
  marginTop: 9,
},
editPatientButton: {
  minHeight: 48,
  borderRadius: 14,
  backgroundColor: colors.surfaceMuted,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  paddingHorizontal: 14,
  marginBottom: 12,
},

editPatientButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 13,
  color: colors.primary,
},
});