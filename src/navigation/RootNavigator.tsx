import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';
import { base } from '../theme/colors';
import { useAccent } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { accent } = useAccent();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: base.backgroundPrimary },
          headerTintColor: accent,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="CategoryDetail"
          component={CategoryDetailScreen}
          // No header: the screen titles itself, and the system back
          // gesture still returns to home.
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
