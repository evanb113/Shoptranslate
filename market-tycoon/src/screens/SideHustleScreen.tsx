import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../game/GameContext';
import { getSideHustleType, SIDE_HUSTLES } from '../game/gameModel';

type Props = NativeStackScreenProps<RootStackParamList, 'SideHustle'>;

export default function SideHustleScreen({}: Props) {
  const { portfolio, hustle, startHustle, hireHustle, fireHustle, payDownHustleLoan } = useGame();
  const [repayAmount, setRepayAmount] = useState('');

  if (!hustle.typeId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Start a Side Hustle</Text>
        <Text style={styles.body}>
          Before you can afford a real exchange, odd jobs can build up some early cash. Each hustle has its own
          startup cost, supplies, and payroll — and bad days happen: no-shows, theft, and jobs gone wrong can all
          push you into debt.
        </Text>
        {SIDE_HUSTLES.map((type) => {
          const affordable = portfolio.cash >= type.startupCost;
          return (
            <View key={type.id} style={styles.card}>
              <Text style={styles.cardTitle}>{type.name}</Text>
              <Text style={styles.hint}>{type.description}</Text>
              <Text style={styles.hint}>
                Startup ${type.startupCost.toLocaleString()} · Supplies ${type.supplyCostPerEmployee}/employee ·
                Payroll ${type.payrollPerEmployee}/employee
              </Text>
              <Pressable
                style={[styles.button, !affordable && styles.buttonDisabled]}
                disabled={!affordable}
                onPress={() => startHustle(type.id)}
              >
                <Text style={styles.buttonText}>Start (${type.startupCost.toLocaleString()})</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  const type = getSideHustleType(hustle);
  if (!type) return null;

  const dailyExpenses = hustle.employees * (type.supplyCostPerEmployee + type.payrollPerEmployee);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type.name}</Text>
      <Text style={styles.hint}>{type.description}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Employees</Text>
        <View style={styles.stepperRow}>
          <Pressable style={styles.stepperButton} onPress={fireHustle}>
            <Text style={styles.stepperButtonText}>-</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{hustle.employees}</Text>
          <Pressable style={styles.stepperButton} onPress={hireHustle}>
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Max {type.maxEmployees} here. More employees mean more potential revenue, but also more payroll and
          supplies due every day — and more exposure when a job goes wrong.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily fixed costs</Text>
        <Text style={styles.body}>
          Supplies ${(hustle.employees * type.supplyCostPerEmployee).toLocaleString()} + payroll $
          {(hustle.employees * type.payrollPerEmployee).toLocaleString()} = ${dailyExpenses.toLocaleString()}/day
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Loan Balance</Text>
        <Text style={[styles.loanValue, hustle.loanBalance > 0 && styles.loanWarning]}>
          ${hustle.loanBalance.toFixed(2)}
        </Text>
        {hustle.loanBalance > 0 && (
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
                    payDownHustleLoan(amount);
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
