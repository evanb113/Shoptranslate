import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Bankruptcy'>;

export default function BankruptcyScreen({ navigation }: Props) {
  const { restart } = useGame();

  const handleRestart = () => {
    restart();
    navigation.replace('Portfolio');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're Bankrupt</Text>
      <Text style={styles.subtitle}>Your net worth dropped to zero or below. Time to start over.</Text>
      <Pressable style={styles.button} onPress={handleRestart}>
        <Text style={styles.buttonText}>Restart</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#c0392b', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: '#1f6feb', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
