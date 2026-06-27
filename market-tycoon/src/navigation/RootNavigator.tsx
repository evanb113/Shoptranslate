import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import PortfolioScreen from '../screens/PortfolioScreen';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import BankruptcyScreen from '../screens/BankruptcyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Portfolio">
        <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
        <Stack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ title: 'Asset' }} />
        <Stack.Screen
          name="Bankruptcy"
          component={BankruptcyScreen}
          options={{ title: 'Bankrupt', headerLeft: () => null, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
