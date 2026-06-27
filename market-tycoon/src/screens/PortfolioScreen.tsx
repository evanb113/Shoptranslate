import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import {
  EXCHANGE_TIERS,
  EXCHANGE_UNLOCK_CASH,
  formatPrice,
  getMarginUsed,
  getNetWorth,
  getUnrealizedPnL,
} from '../game/gameModel';
import { useTutorial } from '../onboarding/TutorialContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Portfolio'>;

export default function PortfolioScreen({ navigation }: Props) {
  const { portfolio, assets, exchange, events, bankrupt, tick } = useGame();
  const { openTutorial } = useTutorial();

  useEffect(() => {
    if (bankrupt) {
      navigation.replace('Bankruptcy');
    }
  }, [bankrupt, navigation]);

  const netWorth = getNetWorth(portfolio, assets, exchange);
  const marginUsed = getMarginUsed(portfolio);
  const exchangeUnlocked = exchange.owned || portfolio.cash >= EXCHANGE_UNLOCK_CASH;

  const holdingsWithAssets = portfolio.holdings
    .map((holding) => {
      const asset = assets.find((a) => a.id === holding.assetId);
      return asset ? { holding, asset } : null;
    })
    .filter((item): item is { holding: typeof portfolio.holdings[number]; asset: typeof assets[number] } => item !== null);

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={styles.summary}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>${netWorth.toFixed(2)}</Text>
          <Text style={styles.cashLabel}>Cash: ${portfolio.cash.toFixed(2)} · Margin used: ${marginUsed.toFixed(2)}</Text>
        </View>
        <Pressable onPress={openTutorial}>
          <Text style={styles.helpLink}>How to Play</Text>
        </Pressable>
      </View>

      <Pressable style={styles.exchangeCard} onPress={() => navigation.navigate('Exchange')}>
        <Text style={styles.exchangeCardTitle}>
          {exchange.owned
            ? EXCHANGE_TIERS[exchange.tier].name
            : exchangeUnlocked
              ? 'Exchange Unlocked!'
              : 'Exchange (Locked)'}
        </Text>
        <Text style={styles.exchangeCardSubtitle}>
          {exchange.owned
            ? `${EXCHANGE_TIERS[exchange.tier].location} · ${exchange.employees} employees · Loan: $${exchange.loanBalance.toFixed(0)}`
            : exchangeUnlocked
              ? 'Tap to buy a building and start earning.'
              : `Reach $${EXCHANGE_UNLOCK_CASH.toLocaleString()} cash to unlock`}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Holdings</Text>
      <FlatList
        data={holdingsWithAssets}
        keyExtractor={(item) => item.asset.id}
        ListEmptyComponent={<Text style={styles.empty}>No holdings yet. Tap an asset to buy.</Text>}
        renderItem={({ item }) => {
          const pnl = getUnrealizedPnL(item.holding, item.asset.price);
          const isShort = item.holding.quantity < 0;
          return (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('AssetDetail', { assetId: item.asset.id })}
            >
              <View>
                <Text style={styles.symbol}>
                  {item.asset.symbol} {isShort ? '(Short)' : ''}
                </Text>
                <Text style={styles.qty}>
                  {Math.abs(item.holding.quantity)} shares @ ${formatPrice(item.holding.avgCost)}
                </Text>
              </View>
              <Text style={[styles.value, pnl >= 0 ? styles.gain : styles.loss]}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </Text>
            </Pressable>
          );
        }}
      />

      <Text style={styles.sectionTitle}>Market</Text>
      <FlatList
        data={assets}
        keyExtractor={(asset) => asset.id}
        renderItem={({ item: asset }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
          >
            <View style={styles.symbolRow}>
              <Text style={styles.symbol}>{asset.symbol}</Text>
              {asset.type === 'memecoin' && <Text style={styles.memeTag}>MEME</Text>}
              {asset.rugged && <Text style={styles.ruggedTag}>RUGGED</Text>}
            </View>
            <Text style={styles.value}>${formatPrice(asset.price)}</Text>
          </Pressable>
        )}
      />

      {events.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Events</Text>
          <FlatList
            data={events.slice(0, 3)}
            keyExtractor={(event) => event.id}
            renderItem={({ item }) => <Text style={styles.eventText}>{item.message}</Text>}
          />
        </>
      )}

      <Pressable style={styles.tickButton} onPress={tick}>
        <Text style={styles.tickButtonText}>Next Day</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  summary: { flex: 1 },
  helpLink: { color: '#1f6feb', fontWeight: '600', fontSize: 14, marginTop: 4 },
  netWorthLabel: { fontSize: 14, color: '#666' },
  netWorthValue: { fontSize: 32, fontWeight: '700' },
  cashLabel: { fontSize: 14, color: '#333', marginTop: 4 },
  exchangeCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#cdddff',
  },
  exchangeCardTitle: { fontSize: 15, fontWeight: '700', color: '#1f3a8f' },
  exchangeCardSubtitle: { fontSize: 12, color: '#445', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  empty: { color: '#999', paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  symbol: { fontSize: 16, fontWeight: '600' },
  memeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a4ec9',
    backgroundColor: '#efe3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ruggedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#c0392b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qty: { fontSize: 12, color: '#666' },
  value: { fontSize: 16 },
  gain: { color: '#1f8f4d', fontWeight: '600' },
  loss: { color: '#c0392b', fontWeight: '600' },
  eventText: { fontSize: 13, color: '#a85b00', paddingVertical: 4 },
  tickButton: {
    marginTop: 16,
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  tickButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
