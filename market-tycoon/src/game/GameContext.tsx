import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Asset,
  MarketEvent,
  Portfolio,
  buyAsset,
  createInitialAssets,
  createInitialPortfolio,
  generateEvent,
  isBankrupt,
  resolveMarginCall,
  sellAsset,
  tickPrices,
} from './gameModel';

interface GameContextValue {
  portfolio: Portfolio;
  assets: Asset[];
  events: MarketEvent[];
  bankrupt: boolean;
  buy: (assetId: string, quantity: number, leverage: number) => void;
  sell: (assetId: string, quantity: number, leverage: number) => void;
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
    (assetId: string, quantity: number, leverage: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      setPortfolio((p) => buyAsset(p, asset, quantity, leverage));
    },
    [assets]
  );

  const sell = useCallback(
    (assetId: string, quantity: number, leverage: number) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      setPortfolio((p) => sellAsset(p, asset, quantity, leverage));
    },
    [assets]
  );

  const tick = useCallback(() => {
    const nextAssets = tickPrices(assets);
    const event = generateEvent(nextAssets);
    const { portfolio: resolved, liquidatedSymbols } = resolveMarginCall(portfolio, nextAssets);

    setAssets(nextAssets);
    setPortfolio(resolved);

    const liquidationEvents: MarketEvent[] = liquidatedSymbols.map((symbol, i) => ({
      id: `${Date.now()}-liq-${i}`,
      message: `Margin call: ${symbol} position force-liquidated.`,
    }));
    const newEvents = [...liquidationEvents, ...(event ? [event] : [])];
    if (newEvents.length > 0) {
      setEvents((e) => [...newEvents, ...e].slice(0, 20));
    }

    if (isBankrupt(resolved, nextAssets)) setBankrupt(true);
  }, [assets, portfolio]);

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
