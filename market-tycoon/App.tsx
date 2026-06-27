import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/game/GameContext';
import RootNavigator from './src/navigation/RootNavigator';
import { TutorialProvider } from './src/onboarding/TutorialContext';
import TutorialModal from './src/onboarding/TutorialModal';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <TutorialProvider>
          <RootNavigator />
          <TutorialModal />
        </TutorialProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}
