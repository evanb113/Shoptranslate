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

export function getNetWorth(portfolio: Portfolio, assets: Asset[]): number {
  const positionsEquity = portfolio.holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.assetId);
    return asset ? sum + getHoldingEquity(h, asset.price) : sum;
  }, 0);
  return portfolio.cash + positionsEquity;
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

export function checkMarginCall(portfolio: Portfolio, assets: Asset[]): MarginCallResult {
  const exposure = getTotalExposure(portfolio, assets);
  if (exposure === 0) return { triggered: false, amountDue: 0 };

  const equity = getNetWorth(portfolio, assets);
  const required = exposure * MAINTENANCE_MARGIN_RATIO;
  return equity < required ? { triggered: true, amountDue: required - equity } : { triggered: false, amountDue: 0 };
}

/** Force-closes the worst-performing leveraged position(s) until the margin call clears. */
export function resolveMarginCall(
  portfolio: Portfolio,
  assets: Asset[]
): { portfolio: Portfolio; liquidatedSymbols: string[] } {
  let current = portfolio;
  const liquidatedSymbols: string[] = [];

  while (checkMarginCall(current, assets).triggered && current.holdings.length > 0) {
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

export function isBankrupt(portfolio: Portfolio, assets: Asset[]): boolean {
  return getNetWorth(portfolio, assets) <= 0;
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
