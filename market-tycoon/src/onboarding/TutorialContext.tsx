import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const HAS_SEEN_TUTORIAL_KEY = 'market-tycoon:hasSeenTutorial';

interface TutorialContextValue {
  visible: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HAS_SEEN_TUTORIAL_KEY).then((value) => {
      if (value !== 'true') setVisible(true);
    });
  }, []);

  const openTutorial = useCallback(() => setVisible(true), []);

  const closeTutorial = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(HAS_SEEN_TUTORIAL_KEY, 'true');
  }, []);

  return (
    <TutorialContext.Provider value={{ visible, openTutorial, closeTutorial }}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within a TutorialProvider');
  return ctx;
}
