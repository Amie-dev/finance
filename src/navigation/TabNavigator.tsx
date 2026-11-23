import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '@/theme';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { AccountListScreen } from '@/screens/accounts/AccountListScreen';
import { TransactionListScreen } from '@/screens/transactions/TransactionListScreen';
import { BudgetListScreen } from '@/screens/budgets/BudgetListScreen';
import { AnalyticsScreen } from '@/screens/analytics/AnalyticsScreen';
import {
  LayoutDashboard,
  Landmark,
  Receipt,
  Target,
  PieChart,
} from 'lucide-react-native';

export type RootTabParamList = {
  Dashboard: undefined;
  Accounts: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Analytics: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootNavigator: React.FC = () => {
  const { colors, typography } = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: typography.sizes.xs,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Accounts"
          component={AccountListScreen}
          options={{
            tabBarLabel: 'Accounts',
            tabBarIcon: ({ color, size }) => <Landmark size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Transactions"
          component={TransactionListScreen}
          options={{
            tabBarLabel: 'Ledger',
            tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Budgets"
          component={BudgetListScreen}
          options={{
            tabBarLabel: 'Budgets',
            tabBarIcon: ({ color, size }) => <Target size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
