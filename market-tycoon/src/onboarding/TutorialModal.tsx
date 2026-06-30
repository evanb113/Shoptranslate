import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTutorial } from './TutorialContext';

interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Moon or Bust',
    body:
      'You start with cash and a list of tradeable assets. Your goal: grow your net worth without going bankrupt. Tap "Next Day" on the Portfolio screen to advance the market.',
  },
  {
    title: 'Buying',
    body:
      'Tap any asset to open its detail screen. Enter a quantity and press "Buy / Cover" to go long — you profit if the price rises.',
  },
  {
    title: 'Selling & Shorting',
    body:
      'Press "Sell / Short" to close a long position you already own. If you don’t own any shares (or sell more than you own), it opens a short position instead — you profit if the price falls.',
  },
  {
    title: 'Leverage',
    body:
      'Before buying or selling, pick a leverage multiplier like 2x, 4x, or 10x. Leverage lets you control more shares while only putting up a fraction of the cash as margin — gains and losses are magnified to match.',
  },
  {
    title: 'Margin Calls',
    body:
      'If your account equity falls too low compared to your leveraged positions, you’ll get a margin call — the game automatically force-closes your worst position to cover it, just like a real broker. Trade with leverage carefully!',
  },
];

export default function TutorialModal() {
  const { visible, closeTutorial } = useTutorial();
  const [stepIndex, setStepIndex] = useState(0);

  const isLastStep = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  const handleClose = () => {
    setStepIndex(0);
    closeTutorial();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => setStepIndex((i) => Math.max(0, i - 1));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.buttonRow}>
            {stepIndex > 0 ? (
              <Pressable style={styles.secondaryButton} onPress={handleBack}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.secondaryButton} onPress={handleClose}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{isLastStep ? 'Start Trading' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: '#1f6feb' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: '#444', lineHeight: 22, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#1f6feb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#f0f0f0' },
  secondaryButtonText: { color: '#333', fontWeight: '600', fontSize: 15 },
});
