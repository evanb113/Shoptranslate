/**
 * PLACEHOLDER game engine.
 *
 * This file defines the API surface that the screens (Portfolio, AssetDetail,
 * Bankruptcy) and GameContext are wired against. Replace the contents of
 * this file with your real gameModel.ts. As long as the exported types and
 * function signatures below stay the same, the screens won't need changes.
 * If your real signatures differ, update GameContext.tsx to match.
 */

export type AssetType = 'stock' | 'crypto' | 'commodity' | 'bond';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  volatility: number;
}

/** quantity > 0 is a long position, quantity < 0 is a short position. */
export interface Holding {
  assetId: string;
  quantity: number;
  avgCost: number;
  marginPosted: number;
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
}

export interface MarketEvent {
  id: string;
  message: string;
  assetId?: string;
}

export interface MarginCallResult {
  triggered: boolean;
  amountDue: number;
}

const STARTING_CASH = 10000;

export const LEVERAGE_OPTIONS = [1, 2, 4, 10] as const;
export type Leverage = (typeof LEVERAGE_OPTIONS)[number];

/** Fraction of total leveraged exposure that equity must stay above before a margin call fires. */
export const MAINTENANCE_MARGIN_RATIO = 0.25;

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function createInitialAssets(): Asset[] {
  return [
    { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 190, volatility: 0.02 },
    { id: 'tsla', symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 250, volatility: 0.05 },
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 65000, volatility: 0.08 },
    { id: 'gold', symbol: 'GOLD', name: 'Gold', type: 'commodity', price: 2300, volatility: 0.01 },
  ];
}

export function createInitialPortfolio(startingCash: number = STARTING_CASH): Portfolio {
  return { cash: startingCash, holdings: [] };
}

export function getHolding(portfolio: Portfolio, assetId: string): Holding | undefined {
  return portfolio.holdings.find((h) => h.assetId === assetId);
}

export function getUnrealizedPnL(holding: Holding, currentPrice: number): number {
  return (currentPrice - holding.avgCost) * holding.quantity;
}

/** Equity contributed by one position: the margin you put down plus its unrealized P&L. */
export function getHoldingEquity(holding: Holding, currentPrice: number): number {
  return holding.marginPosted + getUnrealizedPnL(holding, currentPrice);
}

export function getNetWorth(portfolio: Portfolio, assets: Asset[], exchange?: Exchange): number {
  const positionsEquity = portfolio.holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.assetId);
    return asset ? sum + getHoldingEquity(h, asset.price) : sum;
  }, 0);
  return portfolio.cash + positionsEquity - (exchange?.loanBalance ?? 0);
}

export function getMarginUsed(portfolio: Portfolio): number {
  return portfolio.holdings.reduce((sum, h) => sum + h.marginPosted, 0);
}

export function getTotalExposure(portfolio: Portfolio, assets: Asset[]): number {
  return portfolio.holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.assetId);
    return asset ? sum + Math.abs(h.quantity) * asset.price : sum;
  }, 0);
}

/**
 * Adjusts a position by a signed share delta (+buy / -sell) at the given leverage.
 * Crossing through zero closes the existing side and opens the opposite side
 * (covering a short then going long, or selling a long into a fresh short).
 */
export function trade(portfolio: Portfolio, asset: Asset, deltaQuantity: number, leverage: number): Portfolio {
  if (deltaQuantity === 0) return portfolio;

  const existing = getHolding(portfolio, asset.id) ?? {
    assetId: asset.id,
    quantity: 0,
    avgCost: asset.price,
    marginPosted: 0,
  };

  let { quantity, avgCost, marginPosted } = existing;
  let cash = portfolio.cash;
  const sameDirection = quantity === 0 || sign(quantity) === sign(deltaQuantity);

  if (sameDirection) {
    const addQty = Math.abs(deltaQuantity);
    const addMargin = (addQty * asset.price) / leverage;
    if (addMargin > cash) return portfolio;

    const newQuantity = quantity + deltaQuantity;
    avgCost = (avgCost * Math.abs(quantity) + asset.price * addQty) / Math.abs(newQuantity);
    cash -= addMargin;
    marginPosted += addMargin;
    quantity = newQuantity;
  } else {
    const closeQty = Math.min(Math.abs(deltaQuantity), Math.abs(quantity));
    const proportion = closeQty / Math.abs(quantity);
    const releasedMargin = marginPosted * proportion;
    const realizedPnL = (asset.price - avgCost) * closeQty * sign(quantity);

    cash += releasedMargin + realizedPnL;
    marginPosted -= releasedMargin;
    quantity += sign(deltaQuantity) * closeQty;

    const remainder = Math.abs(deltaQuantity) - closeQty;
    if (remainder > 0) {
      const addMargin = (remainder * asset.price) / leverage;
      if (addMargin <= cash) {
        cash -= addMargin;
        avgCost = asset.price;
        marginPosted = addMargin;
        quantity = sign(deltaQuantity) * remainder;
      }
    }
  }

  const holdings =
    quantity === 0
      ? portfolio.holdings.filter((h) => h.assetId !== asset.id)
      : portfolio.holdings.some((h) => h.assetId === asset.id)
        ? portfolio.holdings.map((h) =>
            h.assetId === asset.id ? { assetId: asset.id, quantity, avgCost, marginPosted } : h
          )
        : [...portfolio.holdings, { assetId: asset.id, quantity, avgCost, marginPosted }];

  return { cash, holdings };
}

export function buyAsset(portfolio: Portfolio, asset: Asset, quantity: number, leverage: number = 1): Portfolio {
  return trade(portfolio, asset, Math.abs(quantity), leverage);
}

export function sellAsset(portfolio: Portfolio, asset: Asset, quantity: number, leverage: number = 1): Portfolio {
  return trade(portfolio, asset, -Math.abs(quantity), leverage);
}

export function checkMarginCall(portfolio: Portfolio, assets: Asset[], exchange?: Exchange): MarginCallResult {
  const exposure = getTotalExposure(portfolio, assets);
  if (exposure === 0) return { triggered: false, amountDue: 0 };

  const equity = getNetWorth(portfolio, assets, exchange);
  const required = exposure * MAINTENANCE_MARGIN_RATIO;
  return equity < required ? { triggered: true, amountDue: required - equity } : { triggered: false, amountDue: 0 };
}

/** Force-closes the worst-performing leveraged position(s) until the margin call clears. */
export function resolveMarginCall(
  portfolio: Portfolio,
  assets: Asset[],
  exchange?: Exchange
): { portfolio: Portfolio; liquidatedSymbols: string[] } {
  let current = portfolio;
  const liquidatedSymbols: string[] = [];

  while (checkMarginCall(current, assets, exchange).triggered && current.holdings.length > 0) {
    let worst: Holding | undefined;
    let worstPnL = Infinity;
    for (const h of current.holdings) {
      const asset = assets.find((a) => a.id === h.assetId);
      if (!asset) continue;
      const pnl = getUnrealizedPnL(h, asset.price);
      if (pnl < worstPnL) {
        worstPnL = pnl;
        worst = h;
      }
    }
    if (!worst) break;

    const asset = assets.find((a) => a.id === worst!.assetId)!;
    current = trade(current, asset, -worst.quantity, 1);
    liquidatedSymbols.push(asset.symbol);
  }

  return { portfolio: current, liquidatedSymbols };
}

export function isBankrupt(portfolio: Portfolio, assets: Asset[], exchange?: Exchange): boolean {
  return getNetWorth(portfolio, assets, exchange) <= 0;
}

// --- Exchange (building/brokerage business) ---

export interface Exchange {
  owned: boolean;
  /** Index into EXCHANGE_TIERS — which building/location is currently owned. */
  tier: number;
  employees: number;
  loanBalance: number;
}

/**
 * Each tier is a different building in a different part of New York. Upgrading
 * moves the business to a bigger, more expensive location, raises headcount
 * capacity and per-employee revenue, but also lets employees take bigger swings —
 * the revenue multiplier range widens and skews further negative, so high tiers
 * can post much larger profits *or* much larger losses on a bad day.
 */
export interface ExchangeTier {
  name: string;
  location: string;
  /** Cash cost to move into this tier (tier 0's is the initial purchase price). */
  upgradeCost: number;
  rentPerDay: number;
  payrollPerEmployee: number;
  suppliesPerEmployee: number;
  maxEmployees: number;
  baseRevenuePerEmployee: number;
  /** [min, max] multiplier applied to base revenue per employee each day. */
  revenueMultiplierRange: [number, number];
}

export const EXCHANGE_TIERS: ExchangeTier[] = [
  {
    name: 'Outer Borough Storefront',
    location: 'Queens',
    upgradeCost: 2_000_000,
    rentPerDay: 5_000,
    payrollPerEmployee: 300,
    suppliesPerEmployee: 50,
    maxEmployees: 20,
    baseRevenuePerEmployee: 500,
    revenueMultiplierRange: [0.3, 1.7],
  },
  {
    name: 'Midtown Office',
    location: 'Manhattan',
    upgradeCost: 10_000_000,
    rentPerDay: 15_000,
    payrollPerEmployee: 450,
    suppliesPerEmployee: 80,
    maxEmployees: 35,
    baseRevenuePerEmployee: 650,
    revenueMultiplierRange: [0.0, 2.2],
  },
  {
    name: 'Financial District Tower',
    location: 'Lower Manhattan',
    upgradeCost: 50_000_000,
    rentPerDay: 35_000,
    payrollPerEmployee: 650,
    suppliesPerEmployee: 120,
    maxEmployees: 60,
    baseRevenuePerEmployee: 850,
    revenueMultiplierRange: [-0.5, 3.0],
  },
  {
    name: 'Park Avenue Headquarters',
    location: 'Manhattan',
    upgradeCost: 250_000_000,
    rentPerDay: 80_000,
    payrollPerEmployee: 900,
    suppliesPerEmployee: 180,
    maxEmployees: 100,
    baseRevenuePerEmployee: 1100,
    revenueMultiplierRange: [-1.5, 4.0],
  },
  {
    name: 'Wall Street Penthouse',
    location: 'Lower Manhattan',
    upgradeCost: 1_000_000_000,
    rentPerDay: 200_000,
    payrollPerEmployee: 1300,
    suppliesPerEmployee: 260,
    maxEmployees: 150,
    baseRevenuePerEmployee: 1500,
    revenueMultiplierRange: [-3.0, 6.0],
  },
];

export const EXCHANGE_PRICE = EXCHANGE_TIERS[0].upgradeCost;
export const EXCHANGE_UNLOCK_CASH = 3_000_000;
/** Daily compounding rate on any emergency loan balance — deliberately punishing. */
export const LOAN_INTEREST_RATE = 0.2;

export function createInitialExchange(): Exchange {
  return { owned: false, tier: 0, employees: 0, loanBalance: 0 };
}

export function canBuyExchange(portfolio: Portfolio): boolean {
  return portfolio.cash >= EXCHANGE_UNLOCK_CASH;
}

export function buyExchange(portfolio: Portfolio, exchange: Exchange): { portfolio: Portfolio; exchange: Exchange } {
  if (exchange.owned || portfolio.cash < EXCHANGE_PRICE) return { portfolio, exchange };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - EXCHANGE_PRICE },
    exchange: { ...exchange, owned: true },
  };
}

export function canUpgradeExchange(portfolio: Portfolio, exchange: Exchange): boolean {
  if (!exchange.owned) return false;
  const nextTier = exchange.tier + 1;
  if (nextTier >= EXCHANGE_TIERS.length) return false;
  return portfolio.cash >= EXCHANGE_TIERS[nextTier].upgradeCost;
}

/** Moves the business to the next tier's building/location, deducting that tier's upgrade cost. */
export function upgradeExchange(portfolio: Portfolio, exchange: Exchange): { portfolio: Portfolio; exchange: Exchange } {
  if (!canUpgradeExchange(portfolio, exchange)) return { portfolio, exchange };
  const nextTier = exchange.tier + 1;
  const cost = EXCHANGE_TIERS[nextTier].upgradeCost;
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - cost },
    exchange: { ...exchange, tier: nextTier },
  };
}

export function hireEmployee(exchange: Exchange): Exchange {
  const maxEmployees = EXCHANGE_TIERS[exchange.tier].maxEmployees;
  if (!exchange.owned || exchange.employees >= maxEmployees) return exchange;
  return { ...exchange, employees: exchange.employees + 1 };
}

export function fireEmployee(exchange: Exchange): Exchange {
  if (!exchange.owned || exchange.employees <= 0) return exchange;
  return { ...exchange, employees: exchange.employees - 1 };
}

export interface ExchangeDayResult {
  revenue: number;
  expenses: number;
  net: number;
  loanTaken: number;
}

/**
 * Runs one day of business: revenue swings randomly within the current tier's
 * range (wider and more downside-prone at fancier locations, since employees
 * are making bigger bets), fixed rent + per-employee payroll/supplies are
 * always due. Any shortfall is covered by an emergency loan at a punishing
 * interest rate; existing debt compounds daily.
 */
export function runExchangeDay(
  portfolio: Portfolio,
  exchange: Exchange
): { portfolio: Portfolio; exchange: Exchange; result: ExchangeDayResult | null } {
  if (!exchange.owned) return { portfolio, exchange, result: null };

  const tier = EXCHANGE_TIERS[exchange.tier];
  const [minMultiplier, maxMultiplier] = tier.revenueMultiplierRange;
  const revenueMultiplier = minMultiplier + Math.random() * (maxMultiplier - minMultiplier);
  const revenue = Math.round(exchange.employees * tier.baseRevenuePerEmployee * revenueMultiplier);
  const expenses = Math.round(
    tier.rentPerDay + exchange.employees * (tier.payrollPerEmployee + tier.suppliesPerEmployee)
  );
  const net = revenue - expenses;

  let cash = portfolio.cash + net;
  let loanTaken = 0;
  if (cash < 0) {
    loanTaken = -cash;
    cash = 0;
  }

  const loanBalance = (exchange.loanBalance + loanTaken) * (1 + LOAN_INTEREST_RATE);

  return {
    portfolio: { ...portfolio, cash },
    exchange: { ...exchange, loanBalance },
    result: { revenue, expenses, net, loanTaken },
  };
}

export function repayLoan(
  portfolio: Portfolio,
  exchange: Exchange,
  amount: number
): { portfolio: Portfolio; exchange: Exchange } {
  const payment = Math.max(0, Math.min(amount, portfolio.cash, exchange.loanBalance));
  if (payment <= 0) return { portfolio, exchange };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - payment },
    exchange: { ...exchange, loanBalance: exchange.loanBalance - payment },
  };
}

export function tickPrices(assets: Asset[]): Asset[] {
  return assets.map((asset) => {
    const change = (Math.random() * 2 - 1) * asset.volatility;
    const price = Math.max(0.01, asset.price * (1 + change));
    return { ...asset, price: Math.round(price * 100) / 100 };
  });
}

export function generateEvent(assets: Asset[]): MarketEvent | null {
  if (Math.random() > 0.3) return null;
  const asset = assets[Math.floor(Math.random() * assets.length)];
  return { id: `${Date.now()}`, message: `${asset.symbol} is making headlines.`, assetId: asset.id };
}
