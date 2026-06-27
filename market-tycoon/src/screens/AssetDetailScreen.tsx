import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import { getHolding } from '../game/gameModel';

type Props = NativeStackScreenProps<RootStackParamList, 'AssetDetail'>;

export default function AssetDetailScreen({ route }: Props) {
  const { assetId } = route.params;
  const { assets, portfolio, buy, sell } = useGame();
  const [quantityText, setQuantityText] = useState('1');

  const asset = assets.find((a) => a.id === assetId);
  const holding = asset ? getHolding(portfolio, asset.id) : undefined;

  if (!asset) {
    return (
      <View style={styles.container}>
        <Text>Asset not found.</Text>
      </View>
    );
  }

  const quantity = Math.max(0, Math.floor(Number(quantityText) || 0));
  const cost = quantity * asset.price;

  const handleBuy = () => {
    if (quantity <= 0) return;
    if (cost > portfolio.cash) {
      Alert.alert('Insufficient cash', `You need $${cost.toFixed(2)} but only have $${portfolio.cash.toFixed(2)}.`);
      return;
    }
    buy(asset.id, quantity);
  };

  const handleSell = () => {
    if (quantity <= 0) return;
    if (!holding || quantity > holding.quantity) {
      Alert.alert('Not enough shares', `You only own ${holding?.quantity ?? 0} shares of ${asset.symbol}.`);
      return;
    }
    sell(asset.id, quantity);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{asset.name}</Text>
      <Text style={styles.symbol}>{asset.symbol}</Text>
      <Text style={styles.price}>${asset.price.toFixed(2)}</Text>

      <View style={styles.holdingBox}>
        <Text style={styles.holdingText}>
          You own: {holding?.quantity ?? 0} shares
          {holding ? ` (avg $${holding.avgCost.toFixed(2)})` : ''}
        </Text>
        <Text style={styles.holdingText}>Cash available: ${portfolio.cash.toFixed(2)}</Text>
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={quantityText}
          onChangeText={setQuantityText}
        />
        <Text style={styles.estimate}>Est. total: ${cost.toFixed(2)}</Text>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.buyButton]} onPress={handleBuy}>
            <Text style={styles.buttonText}>Buy</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.sellButton]} onPress={handleSell}>
            <Text style={styles.buttonText}>Sell</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  name: { fontSize: 20, fontWeight: '600' },
  symbol: { fontSize: 14, color: '#666', marginBottom: 8 },
  price: { fontSize: 36, fontWeight: '700', marginBottom: 16 },
  holdingBox: { backgroundColor: '#f5f5f7', borderRadius: 8, padding: 12, marginBottom: 24 },
  holdingText: { fontSize: 14, color: '#333' },
  controls: { marginTop: 8 },
  label: { fontSize: 14, color: '#666', marginBottom: 4 },
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
