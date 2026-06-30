import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import { getVentureType, VENTURE_UNLOCK_CASH, VENTURES } from '../game/gameModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Venture'>;

export default function VentureScreen({}: Props) {
  const {
    portfolio,
    venture,
    startVentureBusiness,
    hireVenture,
    fireVenture,
    payDownVentureLoan,
    toggleVentureLawyer,
  } = useGame();
  const [repayAmount, setRepayAmount] = useState('');

  if (!venture.typeId) {
    const unlocked = portfolio.cash >= VENTURE_UNLOCK_CASH;

    if (!unlocked) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Bigger Business</Text>
          <Text style={styles.body}>
            Once you've got some real capital behind you, you can open a bigger business — construction,
            collision repair, or mechanic work — with a much higher ceiling than odd jobs, but bigger downside
            swings too, including the risk of getting sued over a botched job.
          </Text>
          <Text style={styles.progress}>
            Cash: ${portfolio.cash.toFixed(2)} / ${VENTURE_UNLOCK_CASH.toLocaleString()}
          </Text>
          <Text style={styles.locked}>Keep growing your cash to unlock this tier.</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Open a Business</Text>
        <Text style={styles.body}>
          Bigger crews, bigger revenue — but bigger fixed costs and a real risk of a lawsuit landing on you
          after a bad job. A lawyer on retainer doesn't stop lawsuits, but it knocks most of the settlement down.
        </Text>
        {VENTURES.map((type) => {
          const affordable = portfolio.cash >= type.startupCost;
          return (
            <View key={type.id} style={styles.card}>
              <Text style={styles.cardTitle}>{type.name}</Text>
              <Text style={styles.hint}>{type.description}</Text>
              <Text style={styles.hint}>
                Startup ${type.startupCost.toLocaleString()} · Supplies ${type.supplyCostPerEmployee}/employee ·
                Payroll ${type.payrollPerEmployee}/employee
              </Text>
              <Text style={styles.hint}>
                Lawsuit risk: ${type.lawsuitCostRange[0].toLocaleString()}–${type.lawsuitCostRange[1].toLocaleString()}{' '}
                · Lawyer retainer ${type.retainerCostPerDay}/day
              </Text>
              <Pressable
                style={[styles.button, !affordable && styles.buttonDisabled]}
                disabled={!affordable}
                onPress={() => startVentureBusiness(type.id)}
              >
                <Text style={styles.buttonText}>Start (${type.startupCost.toLocaleString()})</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  const type = getVentureType(venture);
  if (!type) return null;

  const retainerFee = venture.lawyerRetainer ? type.retainerCostPerDay : 0;
  const dailyExpenses = venture.employees * (type.supplyCostPerEmployee + type.payrollPerEmployee) + retainerFee;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type.name}</Text>
      <Text style={styles.hint}>{type.description}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Employees</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={fireVenture}>
            <Text style={styles.stepperButtonText}>-</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{venture.employees}</Text>
          <Pressable style={styles.stepperButton} onPress={hireVenture}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Max {type.maxEmployees} here. More employees mean more potential revenue, but also more payroll and
          supplies due every day — and more exposure when a job goes wrong.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Lawyer on Retainer</Text>
        <View style={styles.switchRow}>
          <Switch value={venture.lawyerRetainer} onValueChange={toggleVentureLawyer} />
          <Text style={styles.hint}>${type.retainerCostPerDay}/day</Text>
        </View>
        <Text style={styles.hint}>
          Doesn't stop a lawsuit, but cuts the settlement down sharply when one hits. Without one, a single
          lawsuit can bury the business in debt for a long time.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily fixed costs</Text>
        <Text style={styles.body}>
          Supplies ${(venture.employees * type.supplyCostPerEmployee).toLocaleString()} + payroll $
          {(venture.employees * type.payrollPerEmployee).toLocaleString()}
          {venture.lawyerRetainer ? ` + retainer $${retainerFee.toLocaleString()}` : ''} = $
          {dailyExpenses.toLocaleString()}/day
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Loan Balance</Text>
        <Text style={[styles.loanValue, venture.loanBalance > 0 && styles.loanWarning]}>
          ${venture.loanBalance.toFixed(2)}
        </Text>
        {venture.loanBalance > 0 && (
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
                    payDownVentureLoan(amount);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  scrollContent: { paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700' },
  body: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12 },
  progress: { fontSize: 14, color: '#666', marginBottom: 16 },
  locked: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  card: { backgroundColor: '#f7f7f8', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardLabel: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600', textTransform: 'uppercase' },
  hint: { fontSize: 12, color: '#888', marginBottom: 4 },
  button: { backgroundColor: '#1f6feb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#a9c6f5' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
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
});
