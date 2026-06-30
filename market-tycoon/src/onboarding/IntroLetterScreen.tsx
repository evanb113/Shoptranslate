import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { STARTING_AGE, STARTING_CASH } from '../game/gameModel';

const LETTER_BODY = `Congratulations, sweetheart — you made it through high school!

I know things weren't always easy, but you pushed through, and I could not be more proud of you.

It isn't much, but I've put aside $${STARTING_CASH.toLocaleString()} to help you get started out in the world. Markets can build a fortune for someone patient enough to stick with it — and just as easily wipe out a fool chasing a quick win. I trust you to know the difference.

Go on now, ${STARTING_AGE} years old and ready for anything. Make something of yourself. I'll be watching your progress every step of the way, for every year still to come.

All my love,
Grandma`;

interface Props {
  onContinue: () => void;
}

export default function IntroLetterScreen({ onContinue }: Props) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.envelope} onPress={() => setOpened(true)}>
          <View style={styles.envelopeFlap} />
          <Text style={styles.envelopeLabel}>To: You</Text>
          <Text style={styles.tapHint}>Tap to open</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.letterCard}>
        <Text style={styles.title}>A Letter From Grandma</Text>
        <Text style={styles.body}>{LETTER_BODY}</Text>
        <Pressable style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Begin Your Journey</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1f6feb', alignItems: 'center', justifyContent: 'center', padding: 24 },
  envelope: {
    width: 220,
    height: 150,
    backgroundColor: '#f5ecd7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c9b88f',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  envelopeFlap: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 110,
    borderRightWidth: 110,
    borderTopWidth: 75,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#e3d3ab',
  },
  envelopeLabel: { marginTop: 50, fontSize: 14, color: '#5c4a2a', fontWeight: '600' },
  tapHint: { marginTop: 8, fontSize: 12, color: '#8a7550' },
  letterCard: {
    backgroundColor: '#fffdf6',
    borderRadius: 12,
    padding: 24,
    maxWidth: 380,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#333' },
  body: { fontSize: 15, color: '#444', lineHeight: 23 },
  button: { marginTop: 24, backgroundColor: '#1f6feb', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
