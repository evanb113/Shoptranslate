import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Asset,
  MarketEvent,
  Portfolio,
  buyAsset,
  checkMarginCall,
  createInitialAssets,
  createInitialPortfolio,
  generateEvent,
  isBankrupt,
  sellAsset,
  tickPrices,
} from './gameModel';

interface GameContextValue {
  portfolio: Portfolio;
  assets: Asset[];
  events: MarketEvent[];
  bankrupt: boolean;
  buy: (assetId: string, quantity: number) => void;
  sell: (assetId: string, quantity: number) => void;
  tick: () => void;
  restart: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(() => createInitialAssets());
  const [portfolio, setPortfolio] = useState<Portfolio>(() => createInitialPortfolio());
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [bankrupt, setBankrupt] = useState(false);

  const buy = useCallback(
    (assetId: string, quantity: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      setPortfolio((p) => buyAsset(p, asset, quantity));
    },
    [assets]
  );

  const sell = useCallback(
    (assetId: string, quantity: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      setPortfolio((p) => sellAsset(p, asset, quantity));
    },
    [assets]
  );

  const tick = useCallback(() => {
    setAssets((prev) => {
      const nextAssets = tickPrices(prev);
      const event = generateEvent(nextAssets);
      if (event) setEvents((e) => [event, ...e].slice(0, 20));

      setPortfolio((p) => {
        checkMarginCall(p, nextAssets);
        if (isBankrupt(p, nextAssets)) setBankrupt(true);
        return p;
      });

      return nextAssets;
    });
  }, []);

  const restart = useCallback(() => {
    setAssets(createInitialAssets());
    setPortfolio(createInitialPortfolio());
    setEvents([]);
    setBankrupt(false);
  }, []);

  const value = useMemo(
    () => ({ portfolio, assets, events, bankrupt, buy, sell, tick, restart }),
    [portfolio, assets, events, bankrupt, buy, sell, tick, restart]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
