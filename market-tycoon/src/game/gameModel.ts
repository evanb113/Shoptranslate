/**
 * PLACEHOLDER game engine.
 *
 * This file defines the API surface that the screens (Portfolio, AssetDetail,
 * Bankruptcy) and GameContext are wired against. Replace the contents of
 * this file with your real gameModel.ts. As long as the exported types and
 * function signatures below stay the same, the screens won't need changes.
 * If your real signatures differ, update GameContext.tsx to match.
 */

export type AssetType = 'stock' | 'crypto' | 'memecoin' | 'commodity' | 'bond';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  /**
   * For normal assets: the symmetric daily swing range (+/- volatility).
   * For meme coins: a per-coin intensity multiplier applied to the shared
   * meme swing/rug-pull mechanics — bigger means wilder.
   */
  volatility: number;
  /** True only on the tick a meme coin just got rug-pulled — transient, for event/UI flagging. */
  rugged?: boolean;
  /** True only on the tick a meme coin just hit its 1-in-10,000 jackpot — transient, for event/UI flagging. */
  jackpot?: boolean;
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

export const STARTING_CASH = 1000;

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
    { id: 'eth', symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3200, volatility: 0.07 },
    { id: 'sol', symbol: 'SOL', name: 'Solana', type: 'crypto', price: 145, volatility: 0.09 },
    { id: 'gold', symbol: 'GOLD', name: 'Gold', type: 'commodity', price: 2300, volatility: 0.01 },
    { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', type: 'memecoin', price: 0.15, volatility: 0.8 },
    { id: 'shib', symbol: 'SHIB', name: 'Shiba Inu', type: 'memecoin', price: 0.000022, volatility: 1.0 },
    { id: 'pepe', symbol: 'PEPE', name: 'Pepe', type: 'memecoin', price: 0.0000095, volatility: 1.3 },
    { id: 'bonk', symbol: 'BONK', name: 'Bonk', type: 'memecoin', price: 0.000018, volatility: 1.15 },
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

export function getNetWorth(
  portfolio: Portfolio,
  assets: Asset[],
  exchange?: Exchange,
  hustle?: SideHustle,
  venture?: Venture
): number {
  const positionsEquity = portfolio.holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.assetId);
    return asset ? sum + getHoldingEquity(h, asset.price) : sum;
  }, 0);
  return (
    portfolio.cash +
    positionsEquity -
    (exchange?.loanBalance ?? 0) -
    (hustle?.loanBalance ?? 0) -
    (venture?.loanBalance ?? 0)
  );
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

export function checkMarginCall(
  portfolio: Portfolio,
  assets: Asset[],
  exchange?: Exchange,
  hustle?: SideHustle,
  venture?: Venture
): MarginCallResult {
  const exposure = getTotalExposure(portfolio, assets);
  if (exposure === 0) return { triggered: false, amountDue: 0 };

  const equity = getNetWorth(portfolio, assets, exchange, hustle, venture);
  const required = exposure * MAINTENANCE_MARGIN_RATIO;
  return equity < required ? { triggered: true, amountDue: required - equity } : { triggered: false, amountDue: 0 };
}

/** Force-closes the worst-performing leveraged position(s) until the margin call clears. */
export function resolveMarginCall(
  portfolio: Portfolio,
  assets: Asset[],
  exchange?: Exchange,
  hustle?: SideHustle,
  venture?: Venture
): { portfolio: Portfolio; liquidatedSymbols: string[] } {
  let current = portfolio;
  const liquidatedSymbols: string[] = [];

  while (checkMarginCall(current, assets, exchange, hustle, venture).triggered && current.holdings.length > 0) {
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

export function isBankrupt(
  portfolio: Portfolio,
  assets: Asset[],
  exchange?: Exchange,
  hustle?: SideHustle,
  venture?: Venture
): boolean {
  return getNetWorth(portfolio, assets, exchange, hustle, venture) <= 0;
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

// --- Side Hustle (cheap, risky early-game odd-jobs business, before you can afford the Exchange) ---

export interface SideHustleType {
  id: string;
  name: string;
  description: string;
  startupCost: number;
  supplyCostPerEmployee: number;
  payrollPerEmployee: number;
  baseRevenuePerEmployee: number;
  /** [min, max] multiplier applied to base revenue per employee on a normal (no mishap) day. */
  revenueMultiplierRange: [number, number];
  maxEmployees: number;
}

/**
 * Deliberately cheap to start (so a player with $1,000 can actually afford one) but run on
 * thin margins — a single bad day can wipe out several good ones. This is meant to feel like
 * a tough, scrappy grind, not a safe income stream.
 */
export const SIDE_HUSTLES: SideHustleType[] = [
  {
    id: 'driveway',
    name: 'Driveway Cleaning',
    description: 'Pressure-wash driveways around the neighborhood.',
    startupCost: 150,
    supplyCostPerEmployee: 15,
    payrollPerEmployee: 40,
    baseRevenuePerEmployee: 70,
    revenueMultiplierRange: [0.2, 1.6],
    maxEmployees: 4,
  },
  {
    id: 'windows',
    name: 'Window Washing',
    description: 'Wash storefront and house windows.',
    startupCost: 300,
    supplyCostPerEmployee: 20,
    payrollPerEmployee: 55,
    baseRevenuePerEmployee: 95,
    revenueMultiplierRange: [0.1, 1.8],
    maxEmployees: 6,
  },
  {
    id: 'lawn',
    name: 'Lawn Mowing',
    description: 'Mow lawns block by block, all season long.',
    startupCost: 500,
    supplyCostPerEmployee: 25,
    payrollPerEmployee: 70,
    baseRevenuePerEmployee: 130,
    revenueMultiplierRange: [0.0, 2.0],
    maxEmployees: 8,
  },
];

export interface SideHustle {
  typeId: string | null;
  employees: number;
  loanBalance: number;
}

export function createInitialSideHustle(): SideHustle {
  return { typeId: null, employees: 0, loanBalance: 0 };
}

export function getSideHustleType(hustle: SideHustle): SideHustleType | undefined {
  return SIDE_HUSTLES.find((h) => h.id === hustle.typeId);
}

export function startSideHustle(
  portfolio: Portfolio,
  hustle: SideHustle,
  typeId: string
): { portfolio: Portfolio; hustle: SideHustle } {
  if (hustle.typeId) return { portfolio, hustle };
  const type = SIDE_HUSTLES.find((h) => h.id === typeId);
  if (!type || portfolio.cash < type.startupCost) return { portfolio, hustle };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - type.startupCost },
    hustle: { ...hustle, typeId },
  };
}

export function hireHustleEmployee(hustle: SideHustle): SideHustle {
  const type = getSideHustleType(hustle);
  if (!type || hustle.employees >= type.maxEmployees) return hustle;
  return { ...hustle, employees: hustle.employees + 1 };
}

export function fireHustleEmployee(hustle: SideHustle): SideHustle {
  if (hustle.employees <= 0) return hustle;
  return { ...hustle, employees: hustle.employees - 1 };
}

export function repayHustleLoan(
  portfolio: Portfolio,
  hustle: SideHustle,
  amount: number
): { portfolio: Portfolio; hustle: SideHustle } {
  const payment = Math.max(0, Math.min(amount, portfolio.cash, hustle.loanBalance));
  if (payment <= 0) return { portfolio, hustle };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - payment },
    hustle: { ...hustle, loanBalance: hustle.loanBalance - payment },
  };
}

export interface SideHustleMishap {
  message: string;
  cost: number;
}

export interface SideHustleDayResult {
  revenue: number;
  expenses: number;
  net: number;
  loanTaken: number;
  mishap?: SideHustleMishap;
}

/** Chance per day that something goes wrong on the job. Deliberately high — this is meant to feel tough. */
const HUSTLE_MISHAP_CHANCE = 0.18;
const HUSTLE_MISHAP_ADDRESSES = [
  '42 Maple St',
  '118 Birch Ave',
  '7 Linden Ct',
  '230 Oak Blvd',
  '15 Cedar Ln',
  '88 Hawthorne Dr',
];

function randomHustleAddress(): string {
  return HUSTLE_MISHAP_ADDRESSES[Math.floor(Math.random() * HUSTLE_MISHAP_ADDRESSES.length)];
}

/**
 * Runs one day of the side hustle. Most days are a normal (if thin-margin) day of work, but
 * there's a real chance something goes wrong: an employee no-shows and the day is a wash, an
 * employee skims cash from the till, or a job goes bad (e.g. a broken window) and the business
 * eats the repair cost on top of lost revenue. A bad-enough day pushes cash negative, financed
 * by the same kind of emergency loan the Exchange uses — so one mishap can bury the business in
 * debt for a day or two until it's paid back down.
 */
export function runSideHustleDay(
  portfolio: Portfolio,
  hustle: SideHustle
): { portfolio: Portfolio; hustle: SideHustle; result: SideHustleDayResult | null } {
  const type = getSideHustleType(hustle);
  if (!type || hustle.employees === 0) return { portfolio, hustle, result: null };

  let mishap: SideHustleMishap | undefined;
  let revenueMultiplier: number;

  const roll = Math.random();
  if (roll < HUSTLE_MISHAP_CHANCE * 0.35) {
    revenueMultiplier = 0;
    mishap = { message: `An employee didn't show up today — ${type.name} earned nothing.`, cost: 0 };
  } else if (roll < HUSTLE_MISHAP_CHANCE * 0.65) {
    const stolen = Math.round(30 + Math.random() * 120);
    revenueMultiplier = 0.3;
    mishap = { message: `An employee was caught skimming $${stolen} from the till.`, cost: stolen };
  } else if (roll < HUSTLE_MISHAP_CHANCE) {
    const cost = Math.round(80 + Math.random() * 220);
    revenueMultiplier = 0.5;
    mishap = {
      message: `A job at ${randomHustleAddress()} went wrong — something got broken. Repairs will cost $${cost}.`,
      cost,
    };
  } else {
    const [minM, maxM] = type.revenueMultiplierRange;
    revenueMultiplier = minM + Math.random() * (maxM - minM);
  }

  const revenue = Math.round(hustle.employees * type.baseRevenuePerEmployee * revenueMultiplier);
  const supplyCost = Math.round(hustle.employees * type.supplyCostPerEmployee);
  const payroll = Math.round(hustle.employees * type.payrollPerEmployee);
  const mishapCost = mishap?.cost ?? 0;
  const expenses = supplyCost + payroll + mishapCost;
  const net = revenue - expenses;

  let cash = portfolio.cash + net;
  let loanTaken = 0;
  if (cash < 0) {
    loanTaken = -cash;
    cash = 0;
  }

  const loanBalance = (hustle.loanBalance + loanTaken) * (1 + LOAN_INTEREST_RATE);

  return {
    portfolio: { ...portfolio, cash },
    hustle: { ...hustle, loanBalance },
    result: { revenue, expenses, net, loanTaken, mishap },
  };
}

// --- Venture (mid/late-game businesses: construction, collision repair, mechanic work) ---

export interface VentureType {
  id: string;
  name: string;
  description: string;
  startupCost: number;
  supplyCostPerEmployee: number;
  payrollPerEmployee: number;
  baseRevenuePerEmployee: number;
  /** [min, max] multiplier applied to base revenue per employee on a normal (no mishap) day. */
  revenueMultiplierRange: [number, number];
  maxEmployees: number;
  /** [min, max] settlement/judgment cost if a lawsuit hits. */
  lawsuitCostRange: [number, number];
  /** Daily cost to keep a lawyer on retainer, which cuts lawsuit costs sharply when one hits. */
  retainerCostPerDay: number;
}

/**
 * Bigger bets than a Side Hustle: pricier to start, higher revenue ceiling, but wider downside
 * swings and a real risk of getting sued over a botched job — construction accidents, a collision
 * repair gone wrong, a mechanic's mistake causing a wreck. A lawyer on retainer doesn't stop
 * lawsuits, but it knocks most of the settlement down.
 */
export const VENTURES: VentureType[] = [
  {
    id: 'construction',
    name: 'Construction Crew',
    description: 'Take on additions, remodels, and small build jobs around town.',
    startupCost: 25_000,
    supplyCostPerEmployee: 220,
    payrollPerEmployee: 380,
    baseRevenuePerEmployee: 750,
    revenueMultiplierRange: [0.0, 2.0],
    maxEmployees: 12,
    lawsuitCostRange: [4_000, 25_000],
    retainerCostPerDay: 150,
  },
  {
    id: 'collision',
    name: 'Collision Repair Shop',
    description: 'Bodywork and paint jobs for wrecked cars.',
    startupCost: 60_000,
    supplyCostPerEmployee: 300,
    payrollPerEmployee: 480,
    baseRevenuePerEmployee: 1_000,
    revenueMultiplierRange: [-0.2, 2.4],
    maxEmployees: 18,
    lawsuitCostRange: [7_000, 40_000],
    retainerCostPerDay: 280,
  },
  {
    id: 'mechanic',
    name: 'Auto Mechanic Garage',
    description: 'Engine, transmission, and brake work on customer cars.',
    startupCost: 100_000,
    supplyCostPerEmployee: 380,
    payrollPerEmployee: 600,
    baseRevenuePerEmployee: 1_300,
    revenueMultiplierRange: [-0.3, 2.8],
    maxEmployees: 24,
    lawsuitCostRange: [10_000, 60_000],
    retainerCostPerDay: 400,
  },
];

/** Cash needed before the Venture tier even shows up — keeps it a step up from the Side Hustle. */
export const VENTURE_UNLOCK_CASH = 20_000;

export interface Venture {
  typeId: string | null;
  employees: number;
  loanBalance: number;
  lawyerRetainer: boolean;
}

export function createInitialVenture(): Venture {
  return { typeId: null, employees: 0, loanBalance: 0, lawyerRetainer: false };
}

export function getVentureType(venture: Venture): VentureType | undefined {
  return VENTURES.find((v) => v.id === venture.typeId);
}

export function startVenture(
  portfolio: Portfolio,
  venture: Venture,
  typeId: string
): { portfolio: Portfolio; venture: Venture } {
  if (venture.typeId) return { portfolio, venture };
  const type = VENTURES.find((v) => v.id === typeId);
  if (!type || portfolio.cash < type.startupCost) return { portfolio, venture };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - type.startupCost },
    venture: { ...venture, typeId },
  };
}

export function hireVentureEmployee(venture: Venture): Venture {
  const type = getVentureType(venture);
  if (!type || venture.employees >= type.maxEmployees) return venture;
  return { ...venture, employees: venture.employees + 1 };
}

export function fireVentureEmployee(venture: Venture): Venture {
  if (venture.employees <= 0) return venture;
  return { ...venture, employees: venture.employees - 1 };
}

export function toggleLawyerRetainer(venture: Venture): Venture {
  if (!venture.typeId) return venture;
  return { ...venture, lawyerRetainer: !venture.lawyerRetainer };
}

export function repayVentureLoan(
  portfolio: Portfolio,
  venture: Venture,
  amount: number
): { portfolio: Portfolio; venture: Venture } {
  const payment = Math.max(0, Math.min(amount, portfolio.cash, venture.loanBalance));
  if (payment <= 0) return { portfolio, venture };
  return {
    portfolio: { ...portfolio, cash: portfolio.cash - payment },
    venture: { ...venture, loanBalance: venture.loanBalance - payment },
  };
}

export interface VentureMishap {
  message: string;
  cost: number;
}

export interface VentureDayResult {
  revenue: number;
  expenses: number;
  net: number;
  loanTaken: number;
  mishap?: VentureMishap;
}

/** Chance per day that something goes wrong. Higher than a Side Hustle — bigger crews, bigger risk. */
const VENTURE_MISHAP_CHANCE = 0.22;
const VENTURE_MISHAP_ADDRESSES = [
  '42 Maple St',
  '118 Birch Ave',
  '7 Linden Ct',
  '230 Oak Blvd',
  '15 Cedar Ln',
  '88 Hawthorne Dr',
];

function randomVentureAddress(): string {
  return VENTURE_MISHAP_ADDRESSES[Math.floor(Math.random() * VENTURE_MISHAP_ADDRESSES.length)];
}

/**
 * Runs one day of the venture. Same shape as a Side Hustle day (no-show, theft, property damage,
 * or a normal day) plus a fourth, venture-only mishap: a lawsuit. A lawyer on retainer costs money
 * every day whether or not anything happens, but cuts a lawsuit's settlement down sharply when one
 * lands — without one, a single lawsuit can bury the business in debt for a long time.
 */
export function runVentureDay(
  portfolio: Portfolio,
  venture: Venture
): { portfolio: Portfolio; venture: Venture; result: VentureDayResult | null } {
  const type = getVentureType(venture);
  if (!type || venture.employees === 0) return { portfolio, venture, result: null };

  let mishap: VentureMishap | undefined;
  let revenueMultiplier: number;

  const roll = Math.random();
  if (roll < VENTURE_MISHAP_CHANCE * 0.25) {
    revenueMultiplier = 0;
    mishap = { message: `An employee didn't show up today — ${type.name} earned nothing.`, cost: 0 };
  } else if (roll < VENTURE_MISHAP_CHANCE * 0.5) {
    const stolen = Math.round(50 + Math.random() * 300);
    revenueMultiplier = 0.3;
    mishap = { message: `An employee was caught skimming $${stolen} from the business.`, cost: stolen };
  } else if (roll < VENTURE_MISHAP_CHANCE * 0.75) {
    const cost = Math.round(200 + Math.random() * 800);
    revenueMultiplier = 0.5;
    mishap = {
      message: `A job at ${randomVentureAddress()} went wrong — equipment was damaged. Repairs will cost $${cost}.`,
      cost,
    };
  } else if (roll < VENTURE_MISHAP_CHANCE) {
    const [minLawsuit, maxLawsuit] = type.lawsuitCostRange;
    let cost = Math.round(minLawsuit + Math.random() * (maxLawsuit - minLawsuit));
    revenueMultiplier = 0.4;
    if (venture.lawyerRetainer) {
      cost = Math.round(cost * 0.35);
      mishap = {
        message: `A client at ${randomVentureAddress()} is suing over a botched job. Your lawyer negotiated the settlement down to $${cost}.`,
        cost,
      };
    } else {
      mishap = {
        message: `A client at ${randomVentureAddress()} is suing over a botched job. Without a lawyer on retainer, the settlement costs $${cost}.`,
        cost,
      };
    }
  } else {
    const [minM, maxM] = type.revenueMultiplierRange;
    revenueMultiplier = minM + Math.random() * (maxM - minM);
  }

  const revenue = Math.round(venture.employees * type.baseRevenuePerEmployee * revenueMultiplier);
  const supplyCost = Math.round(venture.employees * type.supplyCostPerEmployee);
  const payroll = Math.round(venture.employees * type.payrollPerEmployee);
  const retainerFee = venture.lawyerRetainer ? type.retainerCostPerDay : 0;
  const mishapCost = mishap?.cost ?? 0;
  const expenses = supplyCost + payroll + retainerFee + mishapCost;
  const net = revenue - expenses;

  let cash = portfolio.cash + net;
  let loanTaken = 0;
  if (cash < 0) {
    loanTaken = -cash;
    cash = 0;
  }

  const loanBalance = (venture.loanBalance + loanTaken) * (1 + LOAN_INTEREST_RATE);

  return {
    portfolio: { ...portfolio, cash },
    venture: { ...venture, loanBalance },
    result: { revenue, expenses, net, loanTaken, mishap },
  };
}

/** Daily chance (before per-coin intensity scaling) that a meme coin gets rug-pulled. */
export const MEME_RUG_PULL_CHANCE = 0.04;
/** Fraction of price wiped out by a rug pull. */
export const MEME_RUG_PULL_DROP_RANGE: [number, number] = [0.7, 0.97];
/** Overall daily swing range for meme coins on an ordinary (non-rug, non-jackpot) day.
 * Deliberately skewed negative — like real meme coins, the typical day quietly bleeds
 * value; the "get rich quick" outcome lives almost entirely in the jackpot below. */
export const MEME_DAILY_CHANGE_RANGE: [number, number] = [-0.08, 0.3];
/** Vanishingly rare per-day chance of hitting the jackpot — most meme coin
 * get-rich-quick stories never happen; the rare one that does is enormous. */
export const MEME_JACKPOT_CHANCE = 1 / 10000;
/** Price multiplier on a jackpot hit. */
export const MEME_JACKPOT_MULTIPLIER = 2000;
/** Hard ceiling on meme coin price — without one, compounding days (or a jackpot hit)
 * can run away toward float overflow (Infinity/NaN). No real instrument needs to go
 * higher than this for the game to feel rewarding. */
export const MEME_PRICE_CAP = 1_000_000;

/**
 * Meme coin price action: ordinary days quietly bleed value more often than not (so
 * holding long-term is a loser on average, like real degenerate meme bets), a small
 * daily chance of a rug pull wipes out 70-97% of the price in one tick, and a
 * vanishingly rare (1-in-10,000) jackpot delivers the legendary 2000x moonshot that
 * everyone's chasing but almost nobody actually hits.
 */
function tickMemeCoin(asset: Asset): Asset {
  const intensity = asset.volatility || 1;
  const [minDrop, maxDrop] = MEME_RUG_PULL_DROP_RANGE;
  const [minChange, maxChange] = MEME_DAILY_CHANGE_RANGE;

  if (Math.random() < MEME_JACKPOT_CHANCE) {
    const price = asset.price * MEME_JACKPOT_MULTIPLIER;
    return { ...asset, price: roundPrice(Math.min(price, MEME_PRICE_CAP)), rugged: false, jackpot: true };
  }

  if (Math.random() < MEME_RUG_PULL_CHANCE * intensity) {
    const drop = minDrop + Math.random() * (maxDrop - minDrop);
    const price = Math.max(0, asset.price * (1 - drop));
    return { ...asset, price: roundPrice(Math.min(price, MEME_PRICE_CAP)), rugged: true, jackpot: false };
  }

  const roll = Math.random();
  let changePct: number;
  if (roll < 0.65) {
    changePct = minChange + Math.random() * 0.1; // most days: a small grinding loss
  } else if (roll < 0.9) {
    changePct = minChange + Math.random() * 0.2; // less common: roughly flat chop
  } else {
    changePct = minChange + Math.random() * (maxChange - minChange); // rare: a real (but modest) pump
  }
  changePct *= intensity;

  const price = Math.max(0, asset.price * (1 + changePct));
  return { ...asset, price: roundPrice(Math.min(price, MEME_PRICE_CAP)), rugged: false, jackpot: false };
}

function roundPrice(price: number): number {
  if (price <= 0) return 0;
  if (price >= 1) return Math.round(price * 100) / 100;
  if (price >= 0.01) return Math.round(price * 10000) / 10000;
  // Sub-cent meme coin prices need a magnitude-aware decimal count: a fixed
  // 8-decimal grid is fine near $0.00001, but becomes a large fraction of the
  // price itself after enough compounding drops, distorting the actual % change.
  const magnitude = Math.floor(Math.log10(price));
  const decimals = Math.min(18, -magnitude + 4);
  const factor = 10 ** decimals;
  return Math.round(price * factor) / factor;
}

/** Formats a per-unit asset price, using extra decimal places for sub-cent meme coins. */
export function formatPrice(price: number): string {
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

export function tickPrices(assets: Asset[]): Asset[] {
  return assets.map((asset) => {
    if (asset.type === 'memecoin') return tickMemeCoin(asset);
    const change = (Math.random() * 2 - 1) * asset.volatility;
    const price = Math.max(0.01, asset.price * (1 + change));
    return { ...asset, price: Math.round(price * 100) / 100 };
  });
}

/** The character's age the day they open the letter and start playing. */
export const STARTING_AGE = 18;
/** In-game days per year of character age — a full year of "Next Day" taps before a birthday. */
export const DAYS_PER_YEAR = 365;

/** Current character age, derived from total days elapsed since the letter was opened. */
export function getAge(daysElapsed: number): number {
  return STARTING_AGE + Math.floor(daysElapsed / DAYS_PER_YEAR);
}

/** Days survived in the character's current year of age — for a "X / 365" progress readout. */
export function getDaysIntoCurrentYear(daysElapsed: number): number {
  return daysElapsed % DAYS_PER_YEAR;
}

export function generateEvent(assets: Asset[]): MarketEvent | null {
  if (Math.random() > 0.3) return null;
  const asset = assets[Math.floor(Math.random() * assets.length)];
  const message =
    asset.type === 'memecoin' ? `${asset.symbol} is trending on social media.` : `${asset.symbol} is making headlines.`;
  return { id: `${Date.now()}`, message, assetId: asset.id };
}
