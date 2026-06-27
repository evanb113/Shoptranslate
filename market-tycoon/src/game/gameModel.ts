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

export interface Holding {
  assetId: string;
  quantity: number;
  avgCost: number;
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
  marginUsed: number;
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

export function createInitialAssets(): Asset[] {
  return [
    { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 190, volatility: 0.02 },
    { id: 'tsla', symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 250, volatility: 0.05 },
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 65000, volatility: 0.08 },
    { id: 'gold', symbol: 'GOLD', name: 'Gold', type: 'commodity', price: 2300, volatility: 0.01 },
  ];
}

export function createInitialPortfolio(startingCash: number = STARTING_CASH): Portfolio {
  return { cash: startingCash, holdings: [], marginUsed: 0 };
}

export function getHolding(portfolio: Portfolio, assetId: string): Holding | undefined {
  return portfolio.holdings.find((h) => h.assetId === assetId);
}

export function getHoldingValue(holding: Holding, asset: Asset): number {
  return holding.quantity * asset.price;
}

export function getNetWorth(portfolio: Portfolio, assets: Asset[]): number {
  const holdingsValue = portfolio.holdings.reduce((sum, h) => {
    const asset = assets.find((a) => a.id === h.assetId);
    return asset ? sum + getHoldingValue(h, asset) : sum;
  }, 0);
  return portfolio.cash + holdingsValue - portfolio.marginUsed;
}

export function buyAsset(portfolio: Portfolio, asset: Asset, quantity: number): Portfolio {
  const cost = asset.price * quantity;
  if (quantity <= 0 || cost > portfolio.cash) return portfolio;

  const existing = getHolding(portfolio, asset.id);
  const holdings = existing
    ? portfolio.holdings.map((h) =>
        h.assetId === asset.id
          ? {
              ...h,
              quantity: h.quantity + quantity,
              avgCost: (h.avgCost * h.quantity + cost) / (h.quantity + quantity),
            }
          : h
      )
    : [...portfolio.holdings, { assetId: asset.id, quantity, avgCost: asset.price }];

  return { ...portfolio, cash: portfolio.cash - cost, holdings };
}

export function sellAsset(portfolio: Portfolio, asset: Asset, quantity: number): Portfolio {
  const existing = getHolding(portfolio, asset.id);
  if (!existing || quantity <= 0 || quantity > existing.quantity) return portfolio;

  const proceeds = asset.price * quantity;
  const remaining = existing.quantity - quantity;
  const holdings = remaining > 0
    ? portfolio.holdings.map((h) => (h.assetId === asset.id ? { ...h, quantity: remaining } : h))
    : portfolio.holdings.filter((h) => h.assetId !== asset.id);

  return { ...portfolio, cash: portfolio.cash + proceeds, holdings };
}

export function checkMarginCall(portfolio: Portfolio, assets: Asset[]): MarginCallResult {
  const netWorth = getNetWorth(portfolio, assets);
  if (portfolio.marginUsed > 0 && netWorth < portfolio.marginUsed * 1.25) {
    return { triggered: true, amountDue: portfolio.marginUsed };
  }
  return { triggered: false, amountDue: 0 };
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
