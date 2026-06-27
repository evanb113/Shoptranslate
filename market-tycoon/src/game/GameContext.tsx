import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Asset,
  Exchange,
  MarketEvent,
  Portfolio,
  buyAsset,
  buyExchange,
  createInitialAssets,
  createInitialExchange,
  createInitialPortfolio,
  fireEmployee,
  generateEvent,
  hireEmployee,
  isBankrupt,
  repayLoan,
  resolveMarginCall,
  runExchangeDay,
  sellAsset,
  tickPrices,
  upgradeExchange,
} from './gameModel';

interface GameContextValue {
  portfolio: Portfolio;
  assets: Asset[];
  exchange: Exchange;
  events: MarketEvent[];
  bankrupt: boolean;
  buy: (assetId: string, quantity: number, leverage: number) => void;
  sell: (assetId: string, quantity: number, leverage: number) => void;
  purchaseExchange: () => void;
  upgradeExchangeTier: () => void;
  hire: () => void;
  fire: () => void;
  payDownLoan: (amount: number) => void;
  tick: () => void;
  restart: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(() => createInitialAssets());
  const [portfolio, setPortfolio] = useState<Portfolio>(() => createInitialPortfolio());
  const [exchange, setExchange] = useState<Exchange>(() => createInitialExchange());
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

  const purchaseExchange = useCallback(() => {
    const result = buyExchange(portfolio, exchange);
    setPortfolio(result.portfolio);
    setExchange(result.exchange);
  }, [portfolio, exchange]);

  const upgradeExchangeTier = useCallback(() => {
    const result = upgradeExchange(portfolio, exchange);
    setPortfolio(result.portfolio);
    setExchange(result.exchange);
  }, [portfolio, exchange]);

  const hire = useCallback(() => setExchange((e) => hireEmployee(e)), []);
  const fire = useCallback(() => setExchange((e) => fireEmployee(e)), []);

  const payDownLoan = useCallback(
    (amount: number) => {
      const result = repayLoan(portfolio, exchange, amount);
      setPortfolio(result.portfolio);
      setExchange(result.exchange);
    },
    [portfolio, exchange]
  );

  const tick = useCallback(() => {
    const nextAssets = tickPrices(assets);
    const event = generateEvent(nextAssets);
    const { portfolio: afterMarginCall, liquidatedSymbols } = resolveMarginCall(portfolio, nextAssets, exchange);
    const { portfolio: afterBusiness, exchange: nextExchange, result: businessResult } = runExchangeDay(
      afterMarginCall,
      exchange
    );

    setAssets(nextAssets);
    setPortfolio(afterBusiness);
    setExchange(nextExchange);

    const liquidationEvents: MarketEvent[] = liquidatedSymbols.map((symbol, i) => ({
      id: `${Date.now()}-liq-${i}`,
      message: `Margin call: ${symbol} position force-liquidated.`,
    }));
    const businessEvents: MarketEvent[] = [];
    if (businessResult) {
      if (businessResult.net >= 0) {
        businessEvents.push({
          id: `${Date.now()}-biz`,
          message: `Exchange day: +$${businessResult.net.toFixed(0)} profit.`,
        });
      } else {
        businessEvents.push({
          id: `${Date.now()}-biz`,
          message: `Exchange day: -$${Math.abs(businessResult.net).toFixed(0)} loss.`,
        });
      }
      if (businessResult.loanTaken > 0) {
        businessEvents.push({
          id: `${Date.now()}-loan`,
          message: `Took an emergency loan of $${businessResult.loanTaken.toFixed(0)} to cover payroll.`,
        });
      }
    }

    const newEvents = [...liquidationEvents, ...businessEvents, ...(event ? [event] : [])];
    if (newEvents.length > 0) {
      setEvents((e) => [...newEvents, ...e].slice(0, 20));
    }

    if (isBankrupt(afterBusiness, nextAssets, nextExchange)) setBankrupt(true);
  }, [assets, portfolio, exchange]);

  const restart = useCallback(() => {
    setAssets(createInitialAssets());
    setPortfolio(createInitialPortfolio());
    setExchange(createInitialExchange());
    setEvents([]);
    setBankrupt(false);
  }, []);

  const value = useMemo(
    () => ({
      portfolio,
      assets,
      exchange,
      events,
      bankrupt,
      buy,
      sell,
      purchaseExchange,
      upgradeExchangeTier,
      hire,
      fire,
      payDownLoan,
      tick,
      restart,
    }),
    [
      portfolio,
      assets,
      exchange,
      events,
      bankrupt,
      buy,
      sell,
      purchaseExchange,
      upgradeExchangeTier,
      hire,
      fire,
      payDownLoan,
      tick,
      restart,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
