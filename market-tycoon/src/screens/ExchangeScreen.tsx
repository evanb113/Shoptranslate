import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import { EXCHANGE_PRICE, EXCHANGE_TIERS, EXCHANGE_UNLOCK_CASH } from '../game/gameModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Exchange'>;

export default function ExchangeScreen({}: Props) {
  const { portfolio, exchange, purchaseExchange, upgradeExchangeTier, hire, fire, payDownLoan } = useGame();
  const [repayAmount, setRepayAmount] = useState('');

  if (!exchange.owned) {
    const unlocked = portfolio.cash >= EXCHANGE_UNLOCK_CASH;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Run a Stock Exchange</Text>
        <Text style={styles.body}>
          Owning an exchange building earns daily revenue from your employees, but it isn’t free money — rent,
          payroll, and supplies are due every day, and bad days happen. Reach ${EXCHANGE_UNLOCK_CASH.toLocaleString()}
          {' '}in cash to unlock the purchase.
        </Text>
        <Text style={styles.progress}>
          Cash: ${portfolio.cash.toFixed(2)} / ${EXCHANGE_UNLOCK_CASH.toLocaleString()}
        </Text>
        {unlocked ? (
          <Pressable
            style={[styles.button, portfolio.cash < EXCHANGE_PRICE && styles.buttonDisabled]}
            disabled={portfolio.cash < EXCHANGE_PRICE}
            onPress={purchaseExchange}
          >
            <Text style={styles.buttonText}>Buy Exchange (${EXCHANGE_PRICE.toLocaleString()})</Text>
          </Pressable>
        ) : (
          <Text style={styles.locked}>Keep growing your net worth to unlock this purchase.</Text>
        )}
      </View>
    );
  }

  const tier = EXCHANGE_TIERS[exchange.tier];
  const nextTier = EXCHANGE_TIERS[exchange.tier + 1];
  const dailyExpenses = tier.rentPerDay + exchange.employees * (tier.payrollPerEmployee + tier.suppliesPerEmployee);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tier.name}</Text>
      <Text style={styles.locationLabel}>{tier.location}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Employees</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={fire}>
            <Text style={styles.stepperButtonText}>-</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{exchange.employees}</Text>
          <Pressable style={styles.stepperButton} onPress={hire}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Max {tier.maxEmployees} here. More employees mean more potential revenue, but also more payroll and
          supplies due every day.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily fixed costs</Text>
        <Text style={styles.body}>
          Rent ${tier.rentPerDay.toLocaleString()} + payroll/supplies ${(
            exchange.employees * (tier.payrollPerEmployee + tier.suppliesPerEmployee)
          ).toLocaleString()} = ${dailyExpenses.toLocaleString()}/day
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Loan Balance</Text>
        <Text style={[styles.loanValue, exchange.loanBalance > 0 && styles.loanWarning]}>
          ${exchange.loanBalance.toFixed(2)}
        </Text>
        {exchange.loanBalance > 0 && (
          <>
            <Text style={styles.hint}>
              Emergency loans accrue interest daily. Pay it down before it compounds out of control.
            </Text>
            <View style={styles.repayRow}>
              <TextInput
                style={styles.input}
                placeholder="Amount"
                keyboardType="numeric"
                value={repayAmount}
                onChangeText={setRepayAmount}
              />
              <Pressable
                style={styles.button}
                onPress={() => {
                  const amount = parseFloat(repayAmount);
                  if (!isNaN(amount) && amount > 0) {
                    payDownLoan(amount);
                    setRepayAmount('');
                  }
                }}
              >
                <Text style={styles.buttonText}>Repay</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {nextTier && (
        <View style={styles.upgradeCard}>
          <Text style={styles.cardLabel}>Next Upgrade</Text>
          <Text style={styles.upgradeName}>
            {nextTier.name} — {nextTier.location}
          </Text>
          <Text style={styles.hint}>
            Cap raises to {nextTier.maxEmployees} employees and revenue per employee rises to $
            {nextTier.baseRevenuePerEmployee}, but your team starts making bigger bets — daily swings range from{' '}
            {Math.round(nextTier.revenueMultiplierRange[0] * 100)}% to{' '}
            {Math.round(nextTier.revenueMultiplierRange[1] * 100)}% of base revenue per employee, so bad days can
            cost a lot more too.
          </Text>
          <Pressable
            style={[styles.button, styles.upgradeButton, portfolio.cash < nextTier.upgradeCost && styles.buttonDisabled]}
            disabled={portfolio.cash < nextTier.upgradeCost}
            onPress={upgradeExchangeTier}
          >
            <Text style={styles.buttonText}>Move &amp; Upgrade (${nextTier.upgradeCost.toLocaleString()})</Text>
          </Pressable>
        </View>
      )}
      {!nextTier && <Text style={styles.maxedOut}>You're at the top — Wall Street Penthouse. No further upgrades.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  locationLabel: { fontSize: 14, color: '#888', marginBottom: 12 },
  body: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12 },
  progress: { fontSize: 14, color: '#666', marginBottom: 16 },
  locked: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  button: { backgroundColor: '#1f6feb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#a9c6f5' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#f7f7f8', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  stepperValue: { fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  hint: { fontSize: 12, color: '#888' },
  loanValue: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  loanWarning: { color: '#c0392b' },
  repayRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  upgradeCard: { backgroundColor: '#fff7e6', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ffe2a8' },
  upgradeName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  upgradeButton: { marginTop: 12 },
  maxedOut: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
