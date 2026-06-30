import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/game/GameContext';
import RootNavigator from './src/navigation/RootNavigator';
import { IntroLetterProvider, useIntroLetter } from './src/onboarding/IntroLetterContext';
import IntroLetterScreen from './src/onboarding/IntroLetterScreen';
import { TutorialProvider } from './src/onboarding/TutorialContext';
import TutorialModal from './src/onboarding/TutorialModal';

function AppContent() {
  const { visible, hydrated, closeIntroLetter } = useIntroLetter();

  if (!hydrated) return null;
  if (visible) return <IntroLetterScreen onContinue={closeIntroLetter} />;

  return (
    <TutorialProvider>
      <RootNavigator />
      <TutorialModal />
    </TutorialProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <IntroLetterProvider>
          <AppContent />
        </IntroLetterProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}
