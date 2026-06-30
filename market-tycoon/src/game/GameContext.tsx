import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Asset,
  Exchange,
  MarketEvent,
  Portfolio,
  SideHustle,
  Venture,
  buyAsset,
  buyExchange,
  createInitialAssets,
  createInitialExchange,
  createInitialPortfolio,
  createInitialSideHustle,
  createInitialVenture,
  fireEmployee,
  fireHustleEmployee,
  fireVentureEmployee,
  generateEvent,
  getAge,
  hireEmployee,
  hireHustleEmployee,
  hireVentureEmployee,
  isBankrupt,
  MEME_JACKPOT_MULTIPLIER,
  repayHustleLoan,
  repayLoan,
  repayVentureLoan,
  resolveMarginCall,
  runExchangeDay,
  runSideHustleDay,
  runVentureDay,
  sellAsset,
  startSideHustle,
  startVenture,
  tickPrices,
  toggleLawyerRetainer,
  upgradeExchange,
} from './gameModel';

interface GameContextValue {
  portfolio: Portfolio;
  assets: Asset[];
  exchange: Exchange;
  hustle: SideHustle;
  venture: Venture;
  events: MarketEvent[];
  bankrupt: boolean;
  age: number;
  daysElapsed: number;
  buy: (assetId: string, quantity: number, leverage: number) => void;
  sell: (assetId: string, quantity: number, leverage: number) => void;
  purchaseExchange: () => void;
  upgradeExchangeTier: () => void;
  hire: () => void;
  fire: () => void;
  payDownLoan: (amount: number) => void;
  startHustle: (typeId: string) => void;
  hireHustle: () => void;
  fireHustle: () => void;
  payDownHustleLoan: (amount: number) => void;
  startVentureBusiness: (typeId: string) => void;
  hireVenture: () => void;
  fireVenture: () => void;
  payDownVentureLoan: (amount: number) => void;
  toggleVentureLawyer: () => void;
  tick: () => void;
  restart: () => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const SAVE_KEY = 'market-tycoon:save';
/** Bump when the shape of SaveData changes in a way old saves can't satisfy; mismatched saves are discarded. */
const SAVE_VERSION = 4;

interface SaveData {
  version: number;
  portfolio: Portfolio;
  assets: Asset[];
  exchange: Exchange;
  hustle: SideHustle;
  venture: Venture;
  events: MarketEvent[];
  bankrupt: boolean;
  daysElapsed: number;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(() => createInitialAssets());
  const [portfolio, setPortfolio] = useState<Portfolio>(() => createInitialPortfolio());
  const [exchange, setExchange] = useState<Exchange>(() => createInitialExchange());
  const [hustle, setHustle] = useState<SideHustle>(() => createInitialSideHustle());
  const [venture, setVenture] = useState<Venture>(() => createInitialVenture());
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [bankrupt, setBankrupt] = useState(false);
  const [daysElapsed, setDaysElapsed] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then((raw) => {
        if (!raw) return;
        const data: SaveData = JSON.parse(raw);
        if (data.version !== SAVE_VERSION) return;
        setAssets(data.assets);
        setPortfolio(data.portfolio);
        setExchange(data.exchange);
        setHustle(data.hustle);
        setVenture(data.venture);
        setEvents(data.events);
        setBankrupt(data.bankrupt);
        setDaysElapsed(data.daysElapsed);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const data: SaveData = {
      version: SAVE_VERSION,
      portfolio,
      assets,
      exchange,
      hustle,
      venture,
      events,
      bankrupt,
      daysElapsed,
    };
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data)).catch(() => {});
  }, [hydrated, portfolio, assets, exchange, hustle, venture, events, bankrupt, daysElapsed]);

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

  const startHustle = useCallback(
    (typeId: string) => {
      const result = startSideHustle(portfolio, hustle, typeId);
      setPortfolio(result.portfolio);
      setHustle(result.hustle);
    },
    [portfolio, hustle]
  );

  const hireHustle = useCallback(() => setHustle((h) => hireHustleEmployee(h)), []);
  const fireHustle = useCallback(() => setHustle((h) => fireHustleEmployee(h)), []);

  const payDownHustleLoan = useCallback(
    (amount: number) => {
      const result = repayHustleLoan(portfolio, hustle, amount);
      setPortfolio(result.portfolio);
      setHustle(result.hustle);
    },
    [portfolio, hustle]
  );

  const startVentureBusiness = useCallback(
    (typeId: string) => {
      const result = startVenture(portfolio, venture, typeId);
      setPortfolio(result.portfolio);
      setVenture(result.venture);
    },
    [portfolio, venture]
  );

  const hireVenture = useCallback(() => setVenture((v) => hireVentureEmployee(v)), []);
  const fireVenture = useCallback(() => setVenture((v) => fireVentureEmployee(v)), []);
  const toggleVentureLawyer = useCallback(() => setVenture((v) => toggleLawyerRetainer(v)), []);

  const payDownVentureLoan = useCallback(
    (amount: number) => {
      const result = repayVentureLoan(portfolio, venture, amount);
      setPortfolio(result.portfolio);
      setVenture(result.venture);
    },
    [portfolio, venture]
  );

  const tick = useCallback(() => {
    const nextAssets = tickPrices(assets);
    const event = generateEvent(nextAssets);
    const { portfolio: afterMarginCall, liquidatedSymbols } = resolveMarginCall(
      portfolio,
      nextAssets,
      exchange,
      hustle,
      venture
    );
    const { portfolio: afterBusiness, exchange: nextExchange, result: businessResult } = runExchangeDay(
      afterMarginCall,
      exchange
    );
    const { portfolio: afterHustle, hustle: nextHustle, result: hustleResult } = runSideHustleDay(
      afterBusiness,
      hustle
    );
    const { portfolio: afterVenture, venture: nextVenture, result: ventureResult } = runVentureDay(
      afterHustle,
      venture
    );

    setAssets(nextAssets);
    setPortfolio(afterVenture);
    setExchange(nextExchange);
    setHustle(nextHustle);
    setVenture(nextVenture);
    setDaysElapsed((d) => d + 1);

    const liquidationEvents: MarketEvent[] = liquidatedSymbols.map((symbol, i) => ({
      id: `${Date.now()}-liq-${i}`,
      message: `Margin call: ${symbol} position force-liquidated.`,
    }));
    const rugPullEvents: MarketEvent[] = nextAssets
      .filter((a) => a.rugged)
      .map((a, i) => ({
        id: `${Date.now()}-rug-${i}`,
        message: `${a.symbol} just got rug-pulled! Price collapsed.`,
        assetId: a.id,
      }));
    const jackpotEvents: MarketEvent[] = nextAssets
      .filter((a) => a.jackpot)
      .map((a, i) => ({
        id: `${Date.now()}-jackpot-${i}`,
        message: `${a.symbol} JACKPOT! Price mooned ${MEME_JACKPOT_MULTIPLIER}x — one in ten thousand.`,
        assetId: a.id,
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

    const hustleEvents: MarketEvent[] = [];
    if (hustleResult) {
      if (hustleResult.mishap) {
        hustleEvents.push({ id: `${Date.now()}-hustle-mishap`, message: hustleResult.mishap.message });
      }
      if (hustleResult.net >= 0) {
        hustleEvents.push({
          id: `${Date.now()}-hustle`,
          message: `Side hustle day: +$${hustleResult.net.toFixed(0)} profit.`,
        });
      } else {
        hustleEvents.push({
          id: `${Date.now()}-hustle`,
          message: `Side hustle day: -$${Math.abs(hustleResult.net).toFixed(0)} loss.`,
        });
      }
      if (hustleResult.loanTaken > 0) {
        hustleEvents.push({
          id: `${Date.now()}-hustle-loan`,
          message: `Took an emergency loan of $${hustleResult.loanTaken.toFixed(0)} to cover the side hustle's costs.`,
        });
      }
    }

    const ventureEvents: MarketEvent[] = [];
    if (ventureResult) {
      if (ventureResult.mishap) {
        ventureEvents.push({ id: `${Date.now()}-venture-mishap`, message: ventureResult.mishap.message });
      }
      if (ventureResult.net >= 0) {
        ventureEvents.push({
          id: `${Date.now()}-venture`,
          message: `Business day: +$${ventureResult.net.toFixed(0)} profit.`,
        });
      } else {
        ventureEvents.push({
          id: `${Date.now()}-venture`,
          message: `Business day: -$${Math.abs(ventureResult.net).toFixed(0)} loss.`,
        });
      }
      if (ventureResult.loanTaken > 0) {
        ventureEvents.push({
          id: `${Date.now()}-venture-loan`,
          message: `Took an emergency loan of $${ventureResult.loanTaken.toFixed(0)} to cover the business's costs.`,
        });
      }
    }

    const newEvents = [
      ...liquidationEvents,
      ...rugPullEvents,
      ...jackpotEvents,
      ...businessEvents,
      ...hustleEvents,
      ...ventureEvents,
      ...(event ? [event] : []),
    ];
    if (newEvents.length > 0) {
      setEvents((e) => [...newEvents, ...e].slice(0, 20));
    }

    if (isBankrupt(afterVenture, nextAssets, nextExchange, nextHustle, nextVenture)) setBankrupt(true);
  }, [assets, portfolio, exchange, hustle, venture]);

  const restart = useCallback(() => {
    setAssets(createInitialAssets());
    setPortfolio(createInitialPortfolio());
    setExchange(createInitialExchange());
    setHustle(createInitialSideHustle());
    setVenture(createInitialVenture());
    setEvents([]);
    setBankrupt(false);
    setDaysElapsed(0);
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
  }, []);

  const age = getAge(daysElapsed);

  const value = useMemo(
    () => ({
      portfolio,
      assets,
      exchange,
      hustle,
      venture,
      events,
      bankrupt,
      age,
      daysElapsed,
      buy,
      sell,
      purchaseExchange,
      upgradeExchangeTier,
      hire,
      fire,
      payDownLoan,
      startHustle,
      hireHustle,
      fireHustle,
      payDownHustleLoan,
      startVentureBusiness,
      hireVenture,
      fireVenture,
      payDownVentureLoan,
      toggleVentureLawyer,
      tick,
      restart,
    }),
    [
      portfolio,
      assets,
      exchange,
      hustle,
      venture,
      events,
      bankrupt,
      age,
      daysElapsed,
      buy,
      sell,
      purchaseExchange,
      upgradeExchangeTier,
      hire,
      fire,
      payDownLoan,
      startHustle,
      hireHustle,
      fireHustle,
      payDownHustleLoan,
      startVentureBusiness,
      hireVenture,
      fireVenture,
      payDownVentureLoan,
      toggleVentureLawyer,
      tick,
      restart,
    ]
  );

  if (!hydrated) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading save...</Text>
      </View>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { fontSize: 14, color: '#666' },
});

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
