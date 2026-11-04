import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SplashScreenProps {
  progress: number;
  status: string;
}

const COLORS = {
  background: '#FFF8F3',
  primary: '#665A4A',
  secondary: '#566154',
  text: '#1E1B17',
  textMuted: '#4C463E',
  track: '#E8E1DB',
  surface: '#FAF2EC',
};

export default function SplashScreen({
  progress,
  status,
}: SplashScreenProps) {
  const { height } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);
  useEffect(() => {
  Animated.timing(progressAnim, {
    toValue: Math.max(0, Math.min(progress, 100)),
    duration: 50,
    easing: Easing.linear,
    useNativeDriver: false,
  }).start();
}, [progress, progressAnim]);

  const safeProgress = Math.max(0, Math.min(progress, 100));
  const animatedWidth = progressAnim.interpolate({
  inputRange: [0, 100],
  outputRange: ['0%', '100%'],
});

  return (
    <SafeAreaView style={styles.container}>
     <StatusBar barStyle="dark-content" />

      {/* Cabecera */}
      <View style={styles.header}>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dotTall} />
          <View style={styles.dotLight} />
        </View>

        <Text style={styles.headerText}>SALUD BIOMECÁNICA</Text>
      </View>

      {/* Contenido principal */}
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoHalo} />

          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/splash/ma-logo.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedIcon}>✦</Text>
          </View>
        </View>

        <Text style={styles.title}>MA Fisioterapia</Text>

        <Text style={styles.subtitle}>
          CLÍNICA & READAPTACIÓN FUNCIONAL
        </Text>

        <Text style={styles.description}>
          Equilibrio postural, alivio articular y bienestar biomecánico integral.
        </Text>

        {/* Barra de progreso */}
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <Animated.View
                style={[
                    styles.progressFill,
                    { width: animatedWidth },
                ]}
                />
          </View>

          <View style={styles.progressInfo}>
            <Text style={styles.progressStatus}>⟳  {status}</Text>
            <Text style={styles.progressPercentage}>
              {Math.round(safeProgress)}%
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Pie */}
      <View style={styles.footer}>
        <View style={styles.certification}>
          <Text style={styles.certificationText}>
            ✦ Centro Colegiado Nº 4821 · Certificación Sanitaria
          </Text>
        </View>

        <Text style={styles.version}>
          ♙ Datos Cifrados SSL  •  v1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  dotTall: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#CFC5BA',
  },
  dotLight: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CFC5BA',
  },
  headerText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#7E766D',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoHalo: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: '#DAE6D4',
    opacity: 0.45,
  },
  logoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#FFFFFF',
    padding: 4,
    elevation: 5,
    shadowColor: '#665A4A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
    marginTop: 10,
  },
  progressSection: {
    width: 220,
    marginTop: 36,
  },
  progressTrack: {
    height: 6,
    borderRadius: 10,
    backgroundColor: COLORS.track,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  progressInfo: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 18,
    gap: 8,
  },
  certification: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
  },
  certificationText: {
    fontSize: 10,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  version: {
    fontSize: 11,
    color: '#7E766D',
  },
});