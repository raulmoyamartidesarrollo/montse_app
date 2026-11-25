import React, { useEffect, useState } from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  PAIN_FREQUENCIES,
  PAIN_TYPES,
  type BodyView,
  type ClinicalPainZone,
  type PainFrequency,
  type PainType,
} from '../../types/clinicalPain';

interface Props {
  zoneId: string;
  zoneName: string;
  view: BodyView;
  initialValue?: ClinicalPainZone;
  onSave: (value: ClinicalPainZone) => void;
  onCancel: () => void;
}

export default function ClinicalPainZoneForm({
  zoneId,
  zoneName,
  view,
  initialValue,
  onSave,
  onCancel,
}: Props) {
  const [eva, setEva] = useState(initialValue?.eva ?? 0);

  const [painType, setPainType] = useState<PainType>(
    initialValue?.painType ?? 'muscular'
  );

  const [frequency, setFrequency] = useState<PainFrequency>(
    initialValue?.frequency ?? 'intermitente'
  );

  const [observations, setObservations] = useState(
    initialValue?.observations ?? ''
  );

  useEffect(() => {
    setEva(initialValue?.eva ?? 0);
    setPainType(initialValue?.painType ?? 'muscular');
    setFrequency(initialValue?.frequency ?? 'intermitente');
    setObservations(initialValue?.observations ?? '');
  }, [zoneId, initialValue]);

  const handleSave = () => {
    onSave({
      zoneId,
      zoneName,
      view,
      eva,
      painType,
      frequency,
      observations: observations.trim(),
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Valoración del dolor
      </Text>

      <Text style={styles.zoneName}>
        {zoneName}
      </Text>

      <Text style={styles.label}>
        Intensidad EVA: {eva}/10
      </Text>

      <View style={styles.evaGrid}>
        {Array.from({ length: 11 }, (_, index) => (
          <Pressable
            key={index}
            style={[
              styles.evaButton,
              eva === index && styles.evaSelected,
            ]}
            onPress={() => setEva(index)}
          >
            <Text
              style={[
                styles.evaText,
                eva === index && styles.selectedText,
              ]}
            >
              {index}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        Tipo de dolor
      </Text>

      <View style={styles.options}>
        {PAIN_TYPES.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.option,
              painType === option.value && styles.optionSelected,
            ]}
            onPress={() => setPainType(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                painType === option.value && styles.selectedText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        Frecuencia del dolor
      </Text>

      <View style={styles.options}>
        {PAIN_FREQUENCIES.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.option,
              frequency === option.value && styles.optionSelected,
            ]}
            onPress={() => setFrequency(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                frequency === option.value && styles.selectedText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        Observaciones clínicas
      </Text>

      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        placeholder="Describe las características del dolor..."
        value={observations}
        onChangeText={setObservations}
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>
            Cancelar
          </Text>
        </Pressable>

        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>
            Confirmar valoración
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  zoneName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  label: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  evaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  evaButton: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaSelected: {
    backgroundColor: '#DC2626',
  },
  evaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  optionSelected: {
    backgroundColor: '#2563EB',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  textArea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
    color: '#475569',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
