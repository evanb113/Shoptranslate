import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import { LEVERAGE_OPTIONS, formatPrice, getHolding, getUnrealizedPnL } from '../game/gameModel';

type Props = NativeStackScreenProps<RootStackParamList, 'AssetDetail'>;

export default function AssetDetailScreen({ route }: Props) {
  const { assetId } = route.params;
  const { assets, portfolio, buy, sell } = useGame();
  const [quantityText, setQuantityText] = useState('1');
  const [leverage, setLeverage] = useState<number>(1);

  const asset = assets.find((a) => a.id === assetId);

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text>Asset not found.</Text>
      </View>
    );
  }

  const holding = getHolding(portfolio, asset.id);
  const quantity = Math.max(0, Math.floor(Number(quantityText) || 0));
  const marginRequired = (quantity * asset.price) / leverage;

  const positionLabel = !holding
    ? 'No position'
    : holding.quantity > 0
      ? `Long ${holding.quantity} shares`
      : `Short ${Math.abs(holding.quantity)} shares`;

  const unrealizedPnL = holding ? getUnrealizedPnL(holding, asset.price) : 0;

  const handleBuy = () => {
    if (quantity <= 0) return;
    buy(asset.id, quantity, leverage);
  };

  const handleSell = () => {
    if (quantity <= 0) return;
    sell(asset.id, quantity, leverage);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{asset.name}</Text>
      <View style={styles.symbolRow}>
        <Text style={styles.symbol}>{asset.symbol}</Text>
        {asset.type === 'memecoin' && <Text style={styles.memeTag}>MEME</Text>}
        {asset.rugged && <Text style={styles.ruggedTag}>JUST RUGGED</Text>}
        {asset.jackpot && <Text style={styles.jackpotTag}>JACKPOT!</Text>}
      </View>
      <Text style={styles.price}>${formatPrice(asset.price)}</Text>

      <View style={styles.holdingBox}>
        <Text style={styles.holdingText}>{positionLabel}</Text>
        {holding && (
          <>
            <Text style={styles.holdingText}>Avg entry: ${formatPrice(holding.avgCost)}</Text>
            <Text style={[styles.holdingText, unrealizedPnL >= 0 ? styles.gain : styles.loss]}>
              Unrealized P&L: {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
            </Text>
            <Text style={styles.holdingText}>Margin posted: ${holding.marginPosted.toFixed(2)}</Text>
          </>
        )}
        <Text style={styles.holdingText}>Cash available: ${portfolio.cash.toFixed(2)}</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>Leverage</Text>
        <View style={styles.leverageRow}>
          {LEVERAGE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.leverageButton, leverage === option && styles.leverageButtonActive]}
              onPress={() => setLeverage(option)}
            >
              <Text style={[styles.leverageButtonText, leverage === option && styles.leverageButtonTextActive]}>
                {option}x
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={quantityText}
          onChangeText={setQuantityText}
        />
        <Text style={styles.estimate}>Margin required to open: ${marginRequired.toFixed(2)}</Text>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.buyButton]} onPress={handleBuy}>
            <Text style={styles.buttonText}>Buy / Cover</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.sellButton]} onPress={handleSell}>
            <Text style={styles.buttonText}>Sell / Short</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  name: { fontSize: 20, fontWeight: '600' },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  symbol: { fontSize: 14, color: '#666' },
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
  jackpotTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5c4500',
    backgroundColor: '#ffd54f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  price: { fontSize: 36, fontWeight: '700', marginBottom: 16 },
  holdingBox: { backgroundColor: '#f5f5f7', borderRadius: 8, padding: 12, marginBottom: 24 },
  holdingText: { fontSize: 14, color: '#333', marginBottom: 2 },
  gain: { color: '#1f8f4d', fontWeight: '600' },
  loss: { color: '#c0392b', fontWeight: '600' },
  controls: { marginTop: 8 },
  label: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 8 },
  leverageRow: { flexDirection: 'row', gap: 8 },
  leverageButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  leverageButtonActive: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  leverageButtonText: { fontSize: 14, color: '#333', fontWeight: '600' },
  leverageButtonTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  estimate: { marginTop: 8, color: '#333' },
  buttonRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buyButton: { backgroundColor: '#1f8f4d' },
  sellButton: { backgroundColor: '#c0392b' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
