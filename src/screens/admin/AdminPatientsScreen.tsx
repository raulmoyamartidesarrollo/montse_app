import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Share,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  AdminPatientsStackParamList,
} from '../../navigation/AdminPatientsNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AdminHeader from '../../components/admin/AdminHeader';
import CreatePatientModal from '../../components/admin/CreatePatientModal';
import EditPatientModal from '../../components/admin/EditPatientModal';

import {
  CenterClient,
  deleteCenterClient,
  getCenterClients,
  restoreCenterClient,
  setCenterClientStatus,
  regenerateClientLinkingCode,
} from '../../services/clients';

import { colors } from '../../theme/colors';

type PatientView = 'patients' | 'trash';

type PatientFilter =
  | 'all'
  | 'active'
  | 'inactive'
  | 'pendingLink'
  | 'linked';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const filters: {
  id: PatientFilter;
  label: string;
  icon: IconName;
}[] = [
  {
    id: 'all',
    label: 'Todos',
    icon: 'people-outline',
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
  {
    id: 'pendingLink',
    label: 'Sin vincular',
    icon: 'link-outline',
  },
  {
    id: 'linked',
    label: 'Vinculados',
    icon: 'checkmark-done-outline',
  },
];



function getFullName(client: CenterClient): string {
  return `${client.name} ${client.surname}`.trim();
}

function getInitials(client: CenterClient): string {
  const first = client.name.trim().charAt(0);
  const last = client.surname.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || 'P';
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .trim();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function matchesSearch(
  client: CenterClient,
  search: string
): boolean {
  const normalizedQuery = normalizeText(search);

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = normalizeText(
    [
      client.name,
      client.surname,
      getFullName(client),
      client.email,
      client.phone,
    ].join(' ')
  );

  if (searchableText.includes(normalizedQuery)) {
    return true;
  }

  const phoneQuery = normalizePhone(search);

  if (
    phoneQuery.length > 0 &&
    normalizePhone(client.phone).includes(phoneQuery)
  ) {
    return true;
  }

  return false;
}

function getLinkingLabel(client: CenterClient): string {
  switch (client.linkingStatus) {
    case 'linked':
      return 'Cuenta vinculada';

    case 'pending':
      return 'Pendiente de vincular';

    default:
      return 'Sin vinculación';
  }
}

export default function AdminPatientsScreen() {
  const insets = useSafeAreaInsets();

  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminPatientsStackParamList>
    >();
  const [clients, setClients] = useState<CenterClient[]>([]);

  const [patientView, setPatientView] =
    useState<PatientView>('patients');
    const [regeneratingCodeClientId, setRegeneratingCodeClientId] =
  useState<string | null>(null);

const [generatedLinkingCode, setGeneratedLinkingCode] =
  useState<string | null>(null);

const [generatedCodeExpiresAt, setGeneratedCodeExpiresAt] =
  useState<string | null>(null);

  const [selectedFilter, setSelectedFilter] =
    useState<PatientFilter>('all');

  const [search, setSearch] = useState('');

  const [selectedClientId, setSelectedClientId] =
    useState<string | null>(null);

  const [createPatientVisible, setCreatePatientVisible] =
    useState(false);

  const [editPatientVisible, setEditPatientVisible] =
    useState(false);
    const [editingClient, setEditingClient] =
  useState<CenterClient | null>(null);

type PendingPatientAction =
  | { type: 'edit' }
  | {
      type: 'clinicalHistory';
      clientId: string;
      patientName: string;
    };

const pendingPatientActionRef =
  useRef<PendingPatientAction | null>(null);

const finishPatientModalAction = () => {
  const action = pendingPatientActionRef.current;

  if (!action) {
    return;
  }

  // Consumimos la acción antes de ejecutarla.
  // Así evitamos que se ejecute dos veces.
  pendingPatientActionRef.current = null;

  if (action.type === 'edit') {
    setEditPatientVisible(true);
    return;
  }

  navigation.navigate('PatientClinicalHistory', {
    clientId: action.clientId,
    patientName: action.patientName,
  });
};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deletingClientId, setDeletingClientId] =
    useState<string | null>(null);

  const [restoringClientId, setRestoringClientId] =
    useState<string | null>(null);
const [updatingStatusClientId, setUpdatingStatusClientId] =
  useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(
    async (refresh = false) => {
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
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadClients();
    }, [loadClients])
  );

  const visibleClients = useMemo(
    () => clients.filter((client) => !client.deleted),
    [clients]
  );

  const deletedClients = useMemo(
    () => clients.filter((client) => client.deleted),
    [clients]
  );

  const activeClients = useMemo(
    () =>
      visibleClients.filter(
        (client) => client.status === 'active'
      ),
    [visibleClients]
  );

  const inactiveClients = useMemo(
    () =>
      visibleClients.filter(
        (client) => client.status === 'inactive'
      ),
    [visibleClients]
  );

  const currentClients =
    patientView === 'trash'
      ? deletedClients
      : visibleClients;

  const filteredClients = useMemo(() => {
    return currentClients
      .filter((client) => {
        if (!matchesSearch(client, search)) {
          return false;
        }

        if (patientView === 'trash') {
          return true;
        }

        switch (selectedFilter) {
          case 'active':
            return client.status === 'active';

          case 'inactive':
            return client.status === 'inactive';

          case 'pendingLink':
            return client.linkingStatus !== 'linked';

          case 'linked':
            return client.linkingStatus === 'linked';

          case 'all':
          default:
            return true;
        }
      })
      .sort((a, b) =>
        getFullName(a).localeCompare(
          getFullName(b),
          'es',
          { sensitivity: 'base' }
        )
      );
  }, [
    currentClients,
    search,
    selectedFilter,
    patientView,
  ]);

  const selectedClient = useMemo(
    () =>
      clients.find(
        (client) => client.id === selectedClientId
      ) ?? null,
    [clients, selectedClientId]
  );

 const closePatientDetail = () => {
  if (deletingClientId || restoringClientId) {
    return;
  }

  setSelectedClientId(null);
  setGeneratedLinkingCode(null);
  setGeneratedCodeExpiresAt(null);
};

const handleEditPatient = () => {
  if (!selectedClient) {
    return;
  }

  setGeneratedLinkingCode(null);
  setGeneratedCodeExpiresAt(null);

  setEditingClient(selectedClient);

  pendingPatientActionRef.current = {
    type: 'edit',
  };

  setSelectedClientId(null);

  if (Platform.OS === 'android') {
  setTimeout(() => {
    finishPatientModalAction();
  }, 400);
}
};
const handleOpenClinicalHistory = () => {
  if (!selectedClient || selectedClient.deleted) {
    return;
  }

  pendingPatientActionRef.current = {
    type: 'clinicalHistory',
    clientId: selectedClient.id,
    patientName: getFullName(selectedClient),
  };

  setGeneratedLinkingCode(null);
  setGeneratedCodeExpiresAt(null);
  setSelectedClientId(null);

  if (Platform.OS === 'android') {
  setTimeout(() => {
    finishPatientModalAction();
  }, 400);
}
};

  const handleDeletePatient = useCallback(
    (client: CenterClient) => {
      Alert.alert(
        'Borrar paciente',
        `¿Quieres enviar a ${getFullName(client)} a la papelera?\n\n` +
          'Podrás recuperar su ficha posteriormente.',
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
                    'La ficha se ha enviado a la papelera.'
                  );

                  await loadClients(true);
                } catch (err) {
                  console.error(
                    'Error eliminando paciente:',
                    err
                  );

                  Alert.alert(
                    'Error',
                    'No se ha podido eliminar el paciente.'
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

                  await loadClients(true);
                } catch (err) {
                  console.error(
                    'Error restaurando paciente:',
                    err
                  );

                  Alert.alert(
                    'Error',
                    'No se ha podido restaurar el paciente.'
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
const handleChangePatientStatus = useCallback(
  (client: CenterClient) => {
    if (client.deleted) {
      return;
    }

    const newStatus =
      client.status === 'active' ? 'inactive' : 'active';

    const isDeactivating = newStatus === 'inactive';

    Alert.alert(
      isDeactivating
        ? 'Desactivar paciente'
        : 'Activar paciente',
      isDeactivating
        ? `¿Quieres desactivar a ${getFullName(client)}?\n\nSu ficha y su historial se conservarán.`
        : `¿Quieres volver a activar a ${getFullName(client)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: isDeactivating ? 'Desactivar' : 'Activar',
          style: isDeactivating ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              try {
                setUpdatingStatusClientId(client.id);

                await setCenterClientStatus({
                  clientId: client.id,
                  status: newStatus,
                });

                setClients((previous) =>
                  previous.map((item) =>
                    item.id === client.id
                      ? { ...item, status: newStatus }
                      : item
                  )
                );

                Alert.alert(
                  'Estado actualizado',
                  isDeactivating
                    ? 'El paciente se ha desactivado correctamente.'
                    : 'El paciente se ha activado correctamente.'
                );

                await loadClients(true);
              } catch (err) {
                console.error(
                  'Error actualizando estado del paciente:',
                  err
                );

                Alert.alert(
                  'Error',
                  'No se ha podido actualizar el estado del paciente.'
                );
              } finally {
                setUpdatingStatusClientId(null);
              }
            })();
          },
        },
      ]
    );
  },
  [loadClients]
);

const handleRegenerateLinkingCode = (
  client: CenterClient
) => {
  if (
    client.deleted ||
    client.status !== 'active' ||
    client.linkingStatus === 'linked' ||
    regeneratingCodeClientId !== null
  ) {
    return;
  }

  Alert.alert(
    'Regenerar código',
    `¿Quieres generar un nuevo código para ${getFullName(client)}?\n\nEl código anterior dejará de funcionar.`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Generar código',
        onPress: () => {
          void (async () => {
            try {
              setRegeneratingCodeClientId(client.id);

              const response =
                await regenerateClientLinkingCode({
                  clientId: client.id,
                });

              setGeneratedLinkingCode(
                response.linkingCode
              );

              setGeneratedCodeExpiresAt(
                response.expiresAt
              );

              await loadClients(true);
            } catch (error) {
              console.error(
                'Error regenerando código:',
                error
              );

              Alert.alert(
                'Error',
                'No se ha podido generar el código de vinculación.'
              );
            } finally {
              setRegeneratingCodeClientId(null);
            }
          })();
        },
      },
    ]
  );
};
  const renderPatient = ({
    item,
  }: {
    item: CenterClient;
  }) => {
    return (
      <Pressable
        style={styles.patientRow}
        onPress={() => {
  setGeneratedLinkingCode(null);
  setGeneratedCodeExpiresAt(null);
  setSelectedClientId(item.id);
}}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item)}
          </Text>
        </View>

        <View style={styles.patientInfo}>
          <Text
            style={styles.patientName}
            numberOfLines={1}
          >
            {getFullName(item)}
          </Text>

          <Text
            style={styles.patientPhone}
            numberOfLines={1}
          >
            {item.phone || 'Sin teléfono'}
          </Text>

          {item.email ? (
            <Text
              style={styles.patientEmail}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          ) : null}

          {item.isTest && (
            <Text style={styles.testLabel}>
              Paciente de prueba
            </Text>
          )}
        </View>

        <View style={styles.rowRight}>
          {patientView === 'patients' && (
            <View
              style={[
                styles.statusBadge,
                item.status === 'inactive' &&
                  styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.status === 'inactive' &&
                    styles.statusTextInactive,
                ]}
              >
                {item.status === 'active'
                  ? 'Activo'
                  : 'Inactivo'}
              </Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={19}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <>
      <AdminHeader subtitle="Directorio clínico" />

      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={styles.eyebrow}>
              DIRECTORIO CLÍNICO
            </Text>

            <Text style={styles.title}>
              Gestión de pacientes
            </Text>

            <Text style={styles.subtitle}>
              {visibleClients.length} pacientes registrados
            </Text>
          </View>

          {patientView === 'patients' && (
            <Pressable
              style={styles.newButton}
              onPress={() =>
                setCreatePatientVisible(true)
              }
            >
              <Ionicons
                name="person-add-outline"
                size={19}
                color={colors.white}
              />

              <Text style={styles.newButtonText}>
                Nuevo
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {activeClients.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Activos
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {inactiveClients.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Inactivos
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {deletedClients.length}
            </Text>

            <Text style={styles.summaryLabel}>
              Papelera
            </Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[
              styles.tab,
              patientView === 'patients' &&
                styles.tabActive,
            ]}
            onPress={() => {
              setPatientView('patients');
              setSelectedFilter('all');
              setSearch('');
            }}
          >
            <Ionicons
              name="people-outline"
              size={17}
              color={
                patientView === 'patients'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.tabText,
                patientView === 'patients' &&
                  styles.tabTextActive,
              ]}
            >
              Pacientes
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              patientView === 'trash' &&
                styles.tabActive,
            ]}
            onPress={() => {
              setPatientView('trash');
              setSelectedFilter('all');
              setSearch('');
            }}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color={
                patientView === 'trash'
                  ? colors.white
                  : colors.textSecondary
              }
            />

            <Text
              style={[
                styles.tabText,
                patientView === 'trash' &&
                  styles.tabTextActive,
              ]}
            >
              Papelera
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, apellidos, teléfono o email"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {patientView === 'patients' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
            style={styles.filtersScroll}
          >
            {filters.map((filter) => {
              const active =
                selectedFilter === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedFilter(filter.id)
                  }
                >
                  <Ionicons
                    name={filter.icon}
                    size={15}
                    color={
                      active
                        ? colors.white
                        : colors.secondary
                    }
                  />

                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>
            {patientView === 'trash'
              ? 'Pacientes eliminados'
              : 'Listado de pacientes'}
          </Text>

          <Text style={styles.listCount}>
            {filteredClients.length} resultados
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={error ? [] : filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderPatient}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top,
            paddingBottom: 110 + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadClients(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {loading ? (
              <>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text style={styles.emptyDescription}>
                  Cargando pacientes...
                </Text>
              </>
            ) : error ? (
              <>
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
              </>
            ) : (
              <>
                <Ionicons
                  name="people-outline"
                  size={40}
                  color={colors.primary}
                />

                <Text style={styles.emptyTitle}>
                  No se han encontrado pacientes
                </Text>

                <Text style={styles.emptyDescription}>
                  Prueba con otro nombre, apellido,
                  teléfono o correo electrónico.
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FICHA DEL PACIENTE */}
      <Modal
            visible={selectedClient !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            transparent={false}
            onRequestClose={closePatientDetail}
            onDismiss={
                Platform.OS === 'ios'
                ? finishPatientModalAction
                : undefined
            }
            >
        <ScrollView
          style={styles.detailContainer}
          contentContainerStyle={{
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 30),
            paddingHorizontal: 22,
          }}
        >
          {selectedClient && (
            <>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>
                  Ficha del paciente
                </Text>

                <Pressable
                  onPress={closePatientDetail}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={colors.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {getInitials(selectedClient)}
                  </Text>
                </View>

                <Text style={styles.detailName}>
                  {getFullName(selectedClient)}
                </Text>

                <Text style={styles.detailContact}>
                  {selectedClient.phone}
                </Text>

                {selectedClient.email ? (
                  <Text style={styles.detailContact}>
                    {selectedClient.email}
                  </Text>
                ) : null}

                <View style={styles.linkingBadge}>
                  <Ionicons
                    name="link-outline"
                    size={17}
                    color={colors.secondary}
                  />

                  <Text style={styles.linkingText}>
                    {getLinkingLabel(selectedClient)}
                  </Text>
                </View>

                {selectedClient.isTest && (
                  <Text style={styles.testLabel}>
                    Paciente de prueba
                  </Text>
                )}
              </View>

              {selectedClient.deleted ? (
                <Pressable
                  style={[
                    styles.restoreButton,
                    restoringClientId !== null &&
                      styles.disabledButton,
                  ]}
                  disabled={restoringClientId !== null}
                  onPress={() =>
                    handleRestorePatient(selectedClient)
                  }
                >
                  {restoringClientId ===
                  selectedClient.id ? (
                    <ActivityIndicator
                      color={colors.white}
                    />
                  ) : (
                    <Ionicons
                      name="refresh-outline"
                      size={19}
                      color={colors.white}
                    />
                  )}

                  <Text style={styles.primaryButtonText}>
                    Restaurar paciente
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                        style={styles.editButton}
                        onPress={handleEditPatient}
                        >
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={colors.primary}
                    />

                    <Text style={styles.editButtonText}>
                      Editar datos
                    </Text>
                  </Pressable>
                  {/* ACCESO AL HISTORIAL CLÍNICO */}
<Pressable
  style={[
    styles.editButton,
    { marginTop: 12 },
  ]}
  onPress={handleOpenClinicalHistory}
>
  <Ionicons
    name="medkit-outline"
    size={20}
    color={colors.primary}
  />

  <Text style={styles.editButtonText}>
    Historial clínico
  </Text>

  <Ionicons
    name="chevron-forward"
    size={18}
    color={colors.primary}
  />
</Pressable>

                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Bonos y sesiones
                    </Text>

                    <Text style={styles.sectionDescription}>
                      Próximamente: bonos asignados y
                      sesiones disponibles.
                    </Text>
                  </View>

                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Próximas citas
                    </Text>

                    <Text style={styles.sectionDescription}>
                      Próximamente: citas programadas
                      e historial de sesiones.
                    </Text>
                  </View>

                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Gestión del paciente
                    </Text>

                    <Text style={styles.sectionDescription}>
                      Estado: {selectedClient.status ===
                      'active'
                        ? 'Activo'
                        : 'Inactivo'}
                    </Text>
                        <Pressable
  style={[
    styles.statusActionButton,
    selectedClient.status === 'inactive' &&
      styles.statusActionButtonActivate,
    updatingStatusClientId !== null &&
      styles.disabledButton,
  ]}
  disabled={updatingStatusClientId !== null}
  onPress={() =>
    handleChangePatientStatus(selectedClient)
  }
>
  {updatingStatusClientId === selectedClient.id ? (
    <ActivityIndicator
      size="small"
      color={colors.white}
    />
  ) : (
    <Ionicons
      name={
        selectedClient.status === 'active'
          ? 'pause-circle-outline'
          : 'checkmark-circle-outline'
      }
      size={19}
      color={colors.white}
    />
  )}

  <Text style={styles.primaryButtonText}>
    {updatingStatusClientId === selectedClient.id
      ? 'Actualizando...'
      : selectedClient.status === 'active'
        ? 'Desactivar paciente'
        : 'Activar paciente'}
  </Text>
</Pressable>
{!selectedClient.deleted &&
  selectedClient.status === 'active' &&
  selectedClient.linkingStatus !== 'linked' && (
    <Pressable
      style={styles.linkingCodeButton}
      disabled={regeneratingCodeClientId !== null}
      onPress={() =>
        handleRegenerateLinkingCode(selectedClient)
      }
    >
      {regeneratingCodeClientId === selectedClient.id ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <Ionicons
          name="key-outline"
          size={20}
          color="#FFFFFF"
        />
      )}

      <Text style={styles.linkingCodeButtonText}>
        {regeneratingCodeClientId === selectedClient.id
          ? 'Generando código...'
          : 'Regenerar código de vinculación'}
      </Text>
    </Pressable>
  )}
  {generatedLinkingCode && (
  <View style={styles.generatedCodeCard}>
    <Text style={styles.generatedCodeTitle}>
      Nuevo código de vinculación
    </Text>

    <Text style={styles.generatedCodeValue}>
      {generatedLinkingCode}
    </Text>

    <Text style={styles.generatedCodeDescription}>
      Este código solo se muestra ahora.
      Compártelo con el paciente para que pueda
      vincular su cuenta.
    </Text>

    {generatedCodeExpiresAt && (
      <Text style={styles.generatedCodeExpiry}>
        Caduca el{' '}
        {new Date(
          generatedCodeExpiresAt
        ).toLocaleDateString('es-ES')}
      </Text>
    )}

    <Pressable
      style={styles.shareCodeButton}
      onPress={() => {
        void Share.share({
          message:
            `Tu código de vinculación para MA Fisioterapia y Bienestar es: ${generatedLinkingCode}\n\n` +
            'Introduce este código en la aplicación para vincular tu cuenta.',
        });
      }}
    >
      <Ionicons
        name="share-social-outline"
        size={18}
        color="#FFFFFF"
      />

      <Text style={styles.linkingCodeButtonText}>
        Compartir código
      </Text>
    </Pressable>
  </View>
)}
                    <Pressable
                      style={styles.deleteButton}
                      disabled={deletingClientId !== null}
                      onPress={() =>
                        handleDeletePatient(selectedClient)
                      }
                    >
                      {deletingClientId ===
                      selectedClient.id ? (
                        <ActivityIndicator
                          color="#DC2626"
                        />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#DC2626"
                        />
                      )}

                      <Text style={styles.deleteButtonText}>
                        Enviar a papelera
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </Modal>

      <CreatePatientModal
        visible={createPatientVisible}
        onClose={() =>
          setCreatePatientVisible(false)
        }
        onCreated={(clientId) => {
          setPatientView('patients');
          setSelectedFilter('all');
          setSearch('');
          setSelectedClientId(clientId);
          void loadClients(true);
        }}
      />

      <EditPatientModal
  visible={editPatientVisible}
  client={editingClient}
  onClose={() => {
    setEditPatientVisible(false);
    setEditingClient(null);
  }}
  onUpdated={() => {
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

  listContent: {
    paddingHorizontal: 20,
  },

  content: {
    paddingTop: 8,
  },

  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    color: colors.textSecondary,
    marginTop: 6,
  },

  newButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    paddingVertical: 17,
    marginBottom: 20,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 21,
    color: colors.primary,
  },

  summaryLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: colors.surfaceMuted,
  },

  tabs: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  tabActive: {
    backgroundColor: colors.primary,
  },

  tabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
  },

  tabTextActive: {
    color: colors.white,
  },

  searchContainer: {
    height: 52,
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

  filtersScroll: {
    marginTop: 13,
    marginBottom: 20,
  },

  filtersContent: {
    flexDirection: 'row',
    gap: 8,
  },

  filterChip: {
    minHeight: 36,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
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

  patientRow: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  avatarText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.primary,
  },

  patientInfo: {
    flex: 1,
  },

  patientName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  patientPhone: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },

  patientEmail: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  testLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: colors.secondary,
    marginTop: 4,
  },

  rowRight: {
    alignItems: 'flex-end',
    gap: 7,
    marginLeft: 8,
  },

  statusBadge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusBadgeInactive: {
    backgroundColor: colors.surfaceMuted,
  },

  statusText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: colors.secondary,
  },

  statusTextInactive: {
    color: colors.textSecondary,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
    marginTop: 12,
    textAlign: 'center',
  },

  emptyDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 9,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },

  retryText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: colors.white,
  },

  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  detailTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: colors.text,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },

  detailAvatar: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  detailAvatarText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: colors.primary,
  },

  detailName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },

  detailContact: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 7,
  },

  linkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 15,
  },

  linkingText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: colors.secondary,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },

  sectionDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 9,
  },

  editButton: {
    minHeight: 49,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  editButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },

  deleteButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 17,
  },

  deleteButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#DC2626',
  },

  restoreButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },

  disabledButton: {
    opacity: 0.6,
  },
  statusActionButton: {
  minHeight: 48,
  borderRadius: 14,
  backgroundColor: '#64748B',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  marginTop: 16,
  paddingHorizontal: 14,
},

statusActionButtonActivate: {
  backgroundColor: colors.secondary,
},
linkingCodeButton: {
  minHeight: 48,
  backgroundColor: colors.primary,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  marginTop: 12,
  paddingHorizontal: 14,
},

linkingCodeButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '700',
},

generatedCodeCard: {
  backgroundColor: '#F0F9FF',
  borderRadius: 16,
  padding: 20,
  marginTop: 16,
  alignItems: 'center',
},

generatedCodeTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#334155',
  marginBottom: 12,
},

generatedCodeValue: {
  fontSize: 30,
  fontWeight: '800',
  letterSpacing: 4,
  color: colors.primary,
  marginBottom: 12,
},

generatedCodeDescription: {
  fontSize: 13,
  color: '#64748B',
  textAlign: 'center',
  lineHeight: 20,
},

generatedCodeExpiry: {
  fontSize: 12,
  color: '#64748B',
  marginTop: 10,
},

shareCodeButton: {
  minHeight: 44,
  backgroundColor: colors.primary,
  borderRadius: 12,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 18,
},
});