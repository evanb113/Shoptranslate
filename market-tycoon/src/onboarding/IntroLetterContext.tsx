import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const HAS_SEEN_INTRO_LETTER_KEY = 'market-tycoon:hasSeenIntroLetter';

interface IntroLetterContextValue {
  visible: boolean;
  hydrated: boolean;
  closeIntroLetter: () => void;
}

const IntroLetterContext = createContext<IntroLetterContextValue | undefined>(undefined);

export function IntroLetterProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HAS_SEEN_INTRO_LETTER_KEY)
      .then((value) => {
        if (value !== 'true') setVisible(true);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const closeIntroLetter = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(HAS_SEEN_INTRO_LETTER_KEY, 'true').catch(() => {});
  }, []);

  return (
    <IntroLetterContext.Provider value={{ visible, hydrated, closeIntroLetter }}>
      {children}
    </IntroLetterContext.Provider>
  );
}

export function useIntroLetter(): IntroLetterContextValue {
  const ctx = useContext(IntroLetterContext);
  if (!ctx) throw new Error('useIntroLetter must be used within an IntroLetterProvider');
  return ctx;
}
