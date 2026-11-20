import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  AdminPatientsStackParamList,
} from '../../navigation/AdminPatientsNavigator';

import { colors } from '../../theme/colors';
import {
  getPatientClinicalProfile,
  updatePatientClinicalProfile,
  type PatientClinicalProfile,
} from '../../services/clinicalHistory';

import ClinicalEpisodesList from '../../components/clinical/ClinicalEpisodesList';
import type { ClinicalEpisode } from '../../services/clinicalEpisodes';
import CreateClinicalEpisodeForm from '../../components/clinical/CreateClinicalEpisodeForm';
import ClinicalEpisodeDetail from '../../components/clinical/ClinicalEpisodeDetail';
import EditClinicalEpisodeForm from '../../components/clinical/EditClinicalEpisodeForm';
import CloseClinicalEpisodeForm from '../../components/clinical/CloseClinicalEpisodeForm';
import {
  reopenPatientClinicalEpisode,
} from '../../services/clinicalEpisodes';

type Props = NativeStackScreenProps<
  AdminPatientsStackParamList,
  'PatientClinicalHistory'
>;

type ClinicalTab =
  | 'episodes'
  | 'evolution'
  | 'painMap'
  | 'history';

  type ClinicalForm = Pick<
  PatientClinicalProfile,
  | 'reasonForConsultation'
  | 'affectedArea'
  | 'medicalHistory'
  | 'observations'
  | 'patientInstructions'
>;

const emptyClinicalForm: ClinicalForm = {
  reasonForConsultation: '',
  affectedArea: '',
  medicalHistory: '',
  observations: '',
  patientInstructions: '',
};

const clinicalFields: {
  key: keyof ClinicalForm;
  label: string;
  placeholder: string;
  maxLength: number;
}[] = [
  {
    key: 'reasonForConsultation',
    label: 'Motivo de consulta',
    placeholder: 'Describe el motivo de la consulta...',
    maxLength: 2000,
  },
  {
    key: 'affectedArea',
    label: 'Zona afectada',
    placeholder: 'Indica la zona afectada...',
    maxLength: 1000,
  },
  {
    key: 'medicalHistory',
    label: 'Antecedentes médicos',
    placeholder: 'Lesiones, operaciones, patologías...',
    maxLength: 5000,
  },
  {
    key: 'observations',
    label: 'Observaciones internas',
    placeholder: 'Notas privadas del profesional...',
    maxLength: 10000,
  },
  {
    key: 'patientInstructions',
    label: 'Indicaciones para el paciente',
    placeholder: 'Recomendaciones para el paciente...',
    maxLength: 5000,
  },
];

function profileToForm(
  profile: PatientClinicalProfile
): ClinicalForm {
  return {
    reasonForConsultation: profile.reasonForConsultation,
    affectedArea: profile.affectedArea,
    medicalHistory: profile.medicalHistory,
    observations: profile.observations,
    patientInstructions: profile.patientInstructions,
  };
}

const tabs: {
  id: ClinicalTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
    {
  id: 'episodes',
  label: 'Episodios',
  icon: 'albums-outline',
},
  {
    id: 'evolution',
    label: 'Evolución',
    icon: 'pulse-outline',
  },
  {
    id: 'painMap',
    label: 'Mapa del dolor',
    icon: 'body-outline',
  },
  {
    id: 'history',
    label: 'Antecedentes',
    icon: 'document-text-outline',
  },
];

export default function PatientClinicalHistoryScreen({
  route,
  navigation,
}: Props) {
  const insets = useSafeAreaInsets();

const { clientId, patientName } = route.params;

const [activeTab, setActiveTab] =
  useState<ClinicalTab>('episodes');
  const [creatingEpisode, setCreatingEpisode] = useState(false);

const [episodesRefreshKey, setEpisodesRefreshKey] = useState(0);
const [selectedEpisodeId, setSelectedEpisodeId] =
  useState<string | null>(null);
  const [editingEpisode, setEditingEpisode] =
  useState<ClinicalEpisode | null>(null);
const [closingEpisode, setClosingEpisode] =
  useState<ClinicalEpisode | null>(null);
  const [reopeningEpisode, setReopeningEpisode] =
  useState(false);
const [episodeDetailRefreshKey, setEpisodeDetailRefreshKey] =
  useState(0);

const [clinicalProfile, setClinicalProfile] =
  useState<PatientClinicalProfile | null>(null);

const [loadingClinicalProfile, setLoadingClinicalProfile] =
  useState(false);

const [clinicalError, setClinicalError] =
  useState<string | null>(null);

  const [editingClinical, setEditingClinical] =
  useState(false);

const [savingClinical, setSavingClinical] =
  useState(false);

const [clinicalForm, setClinicalForm] =
  useState<ClinicalForm>(emptyClinicalForm);
const loadClinicalProfile = useCallback(async () => {
  try {
    setLoadingClinicalProfile(true);
    setClinicalError(null);

    const profile = await getPatientClinicalProfile(clientId);

    setClinicalProfile(profile);
    setClinicalForm(profileToForm(profile));
  } catch (error) {
    console.error(
      'Error cargando antecedentes clínicos:',
      error
    );

    setClinicalError(
      'No se han podido cargar los antecedentes clínicos.'
    );
  } finally {
    setLoadingClinicalProfile(false);
  }
}, [clientId]);

useEffect(() => {
  if (
    activeTab === 'history' &&
    !editingClinical &&
    !clinicalProfile
  ) {
    void loadClinicalProfile();
  }
}, [
  activeTab,
  editingClinical,
  clinicalProfile,
  loadClinicalProfile,
]);
const startClinicalEditing = () => {
  if (!clinicalProfile) return;

  setClinicalForm(profileToForm(clinicalProfile));
  setEditingClinical(true);
};

const cancelClinicalEditing = () => {
  if (savingClinical) return;

  if (clinicalProfile) {
    setClinicalForm(profileToForm(clinicalProfile));
  }

  setEditingClinical(false);
};

const updateClinicalField = (
  key: keyof ClinicalForm,
  value: string
) => {
  setClinicalForm((current) => ({
    ...current,
    [key]: value,
  }));
};

const saveClinicalProfile = async () => {
  if (savingClinical || !clinicalProfile) return;

  try {
    setSavingClinical(true);

    await updatePatientClinicalProfile({
      clientId,
      ...clinicalForm,
    });

    const updatedProfile = await getPatientClinicalProfile(
      clientId
    );

    setClinicalProfile(updatedProfile);
    setClinicalForm(profileToForm(updatedProfile));
    setEditingClinical(false);

    Alert.alert(
      'Antecedentes guardados',
      'La ficha clínica se ha actualizado correctamente.'
    );
  } catch (error) {
    console.error(
      'Error guardando antecedentes clínicos:',
      error
    );

    Alert.alert(
      'Error',
      'No se han podido completar los cambios. Comprueba la conexión e inténtalo de nuevo.'
    );
  } finally {
    setSavingClinical(false);
  }
};
const handleCreateEpisode = () => {
  setCreatingEpisode(true);
};

const handleCancelCreateEpisode = () => {
  setCreatingEpisode(false);
};

const handleEpisodeCreated = () => {
  setCreatingEpisode(false);
  setEpisodesRefreshKey((current) => current + 1);
};

const handleSelectEpisode = (episode: ClinicalEpisode) => {
  setSelectedEpisodeId(episode.episodeId);
};

const handleBackToEpisodes = () => {
  setSelectedEpisodeId(null);
  setEpisodesRefreshKey((current) => current + 1);
};
const handleEditEpisode = (episode: ClinicalEpisode) => {
  if (episode.status !== 'open') {
    Alert.alert(
      'Episodio cerrado',
      'Debes reabrir este episodio antes de editarlo.'
    );
    return;
  }

  setEditingEpisode(episode);
};

const handleCancelEditEpisode = () => {
  setEditingEpisode(null);
};

const handleEpisodeUpdated = () => {
  setEditingEpisode(null);

  setEpisodeDetailRefreshKey((current) => current + 1);
  setEpisodesRefreshKey((current) => current + 1);
};

const handleCloseEpisode = (episode: ClinicalEpisode) => {
  if (episode.status !== 'open') {
    Alert.alert(
      'Episodio cerrado',
      'Este episodio ya está cerrado.'
    );
    return;
  }

  setClosingEpisode(episode);
};

const handleCancelCloseEpisode = () => {
  setClosingEpisode(null);
};

const handleEpisodeClosed = () => {
  setClosingEpisode(null);

  setEpisodeDetailRefreshKey((current) => current + 1);
  setEpisodesRefreshKey((current) => current + 1);
};

const handleReopenEpisode = (episode: ClinicalEpisode) => {
  if (reopeningEpisode) return;

  if (episode.status !== 'closed') {
    Alert.alert(
      'Episodio abierto',
      'Este episodio ya se encuentra abierto.'
    );
    return;
  }

  Alert.alert(
    'Reabrir episodio clínico',
    `¿Quieres reabrir el episodio "${episode.title}"?\n\nPodrás volver a modificar su información clínica.`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Reabrir episodio',
        onPress: () => {
          void (async () => {
            if (reopeningEpisode) return;

            try {
              setReopeningEpisode(true);

              await reopenPatientClinicalEpisode(
                episode.clientId,
                episode.episodeId
              );

              setEpisodeDetailRefreshKey(
                (current) => current + 1
              );

              setEpisodesRefreshKey(
                (current) => current + 1
              );

              Alert.alert(
                'Episodio reabierto',
                'El episodio clínico vuelve a estar abierto.'
              );
            } catch (error) {
              console.error(
                'Error reabriendo episodio clínico:',
                error
              );

              Alert.alert(
                'Error',
                'No se ha podido reabrir el episodio. Comprueba la conexión e inténtalo de nuevo.'
              );
            } finally {
              setReopeningEpisode(false);
            }
          })();
        },
      },
    ]
  );
};
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Historial clínico
          </Text>

          <Text style={styles.headerSubtitle}>
            MA Fisioterapia y Bienestar
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.patientCard}>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>
              {patientName}
            </Text>

            <Text style={styles.patientDescription}>
              Expediente clínico del paciente
            </Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;

            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  selected && styles.activeTab,
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={19}
                  color={
                    selected
                      ? colors.primary
                      : colors.textMuted
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    selected && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
{activeTab === 'episodes' && (
  closingEpisode ? (
    <CloseClinicalEpisodeForm
      key={`${closingEpisode.clientId}-${closingEpisode.episodeId}`}
      episode={closingEpisode}
      onCancel={handleCancelCloseEpisode}
      onClosed={handleEpisodeClosed}
    />
  ) : editingEpisode ? (
    <EditClinicalEpisodeForm
      key={`${editingEpisode.clientId}-${editingEpisode.episodeId}`}
      episode={editingEpisode}
      onCancel={handleCancelEditEpisode}
      onUpdated={handleEpisodeUpdated}
    />
  ) : selectedEpisodeId ? (
    <ClinicalEpisodeDetail
      key={`${clientId}-${selectedEpisodeId}-${episodeDetailRefreshKey}`}
      clientId={clientId}
      episodeId={selectedEpisodeId}
      onBack={handleBackToEpisodes}
      onEdit={handleEditEpisode}
      onClose={handleCloseEpisode}
      onReopen={handleReopenEpisode}
    />
  ) : creatingEpisode ? (
    <CreateClinicalEpisodeForm
      clientId={clientId}
      onCancel={handleCancelCreateEpisode}
      onCreated={handleEpisodeCreated}
    />
  ) : (
    <ClinicalEpisodesList
      key={`${clientId}-${episodesRefreshKey}`}
      clientId={clientId}
      onCreateEpisode={handleCreateEpisode}
      onSelectEpisode={handleSelectEpisode}
    />
  )
)}

        {activeTab === 'evolution' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="pulse-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.sectionTitle}>
                Evolución y sesiones
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Aquí mostraremos la evolución del paciente,
              la escala de dolor EVA y el historial
              cronológico de tratamientos realizados.
            </Text>
          </View>
        )}

        {activeTab === 'painMap' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="body-outline"
                size={22}
                color={colors.primary}
              />

              <Text style={styles.sectionTitle}>
                Mapa del dolor
              </Text>
            </View>

            <Text style={styles.sectionDescription}>
              Aquí incorporaremos una representación
              corporal para registrar las zonas afectadas
              y su evolución.
            </Text>
          </View>
        )}

 {activeTab === 'history' && (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Ionicons
        name="document-text-outline"
        size={22}
        color={colors.primary}
      />

      <Text style={styles.sectionTitle}>
        Antecedentes clínicos
      </Text>
    </View>

    {loadingClinicalProfile ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.sectionDescription}>
          Cargando antecedentes clínicos...
        </Text>
      </View>
    ) : clinicalError ? (
      <View>
        <Text style={styles.errorText}>
          {clinicalError}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => void loadClinicalProfile()}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={colors.primary}
          />

          <Text style={styles.retryButtonText}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    ) : clinicalProfile ? (
      <View>
        {!editingClinical ? (
          <>
            {clinicalFields.map((field) => (
              <View key={field.key}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                </Text>

                <Text style={styles.fieldValue}>
                  {clinicalProfile[field.key] ||
                    'Sin información registrada'}
                </Text>
              </View>
            ))}

            <Pressable
              style={styles.editClinicalButton}
              onPress={startClinicalEditing}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={colors.surface}
              />

              <Text style={styles.editClinicalButtonText}>
                Editar antecedentes
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {clinicalFields.map((field) => (
              <View key={field.key}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                </Text>

                <TextInput
                  style={styles.clinicalInput}
                  value={clinicalForm[field.key]}
                  onChangeText={(value) =>
                    updateClinicalField(field.key, value)
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  maxLength={field.maxLength}
                  editable={!savingClinical}
                />
              </View>
            ))}

            <View style={styles.clinicalActions}>
              <Pressable
                style={styles.cancelClinicalButton}
                onPress={cancelClinicalEditing}
                disabled={savingClinical}
              >
                <Text style={styles.cancelClinicalButtonText}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                style={styles.saveClinicalButton}
                onPress={() => void saveClinicalProfile()}
                disabled={savingClinical}
              >
                {savingClinical ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.surface}
                  />
                ) : (
                  <Ionicons
                    name="save-outline"
                    size={18}
                    color={colors.surface}
                  />
                )}

                <Text style={styles.saveClinicalButtonText}>
                  {savingClinical
                    ? 'Guardando...'
                    : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    ) : (
      <Text style={styles.sectionDescription}>
        No hay información clínica disponible.
      </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.text,
  },

  headerSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  content: {
    padding: 18,
  },

  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  patientInfo: {
    flex: 1,
  },

  patientName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.text,
  },

  patientDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 5,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 11,
    gap: 6,
  },

  activeTab: {
    backgroundColor: colors.background,
  },

  tabText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },

  activeTabText: {
    color: colors.primary,
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.text,
    flex: 1,
  },

  sectionDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  loadingContainer: {
  alignItems: 'center',
  paddingVertical: 25,
  gap: 12,
},

errorText: {
  fontFamily: 'PlusJakartaSans_400Regular',
  fontSize: 13,
  color: colors.error,
  lineHeight: 20,
},

retryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 15,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: colors.background,
},

retryButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 13,
  color: colors.primary,
},

fieldLabel: {
  fontFamily: 'PlusJakartaSans_700Bold',
  fontSize: 13,
  color: colors.text,
  marginTop: 18,
  marginBottom: 6,
},

fieldValue: {
  fontFamily: 'PlusJakartaSans_400Regular',
  fontSize: 13,
  lineHeight: 21,
  color: colors.textSecondary,
},
clinicalInput: {
  minHeight: 95,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  backgroundColor: colors.background,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontFamily: 'PlusJakartaSans_400Regular',
  fontSize: 14,
  lineHeight: 21,
  color: colors.text,
},

editClinicalButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 25,
  paddingVertical: 15,
  borderRadius: 12,
  backgroundColor: colors.primary,
},

editClinicalButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 14,
  color: colors.surface,
},

clinicalActions: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 25,
},

cancelClinicalButton: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 15,
  borderRadius: 12,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
},

cancelClinicalButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 14,
  color: colors.text,
},

saveClinicalButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 15,
  borderRadius: 12,
  backgroundColor: colors.primary,
},

saveClinicalButtonText: {
  fontFamily: 'PlusJakartaSans_600SemiBold',
  fontSize: 14,
  color: colors.surface,
},
});