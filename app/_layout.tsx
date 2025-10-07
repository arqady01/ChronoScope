import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Platform, StyleSheet } from 'react-native';

import { HeaderBackButton } from '@react-navigation/elements';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { ScheduleProvider } from '@/providers/schedule-provider';
import { Fonts } from '@/constants/theme';
import '@/global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GluestackUIProvider mode="dark">
      <ScheduleProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen
              name="settings"
              options={{
                title: '设置',
                headerShadowVisible: false,
                headerBackTitleVisible: false,
                headerTintColor: '#1E202A',
                headerTitleStyle: {
                  fontFamily: Fonts.rounded,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1E202A',
                },
                headerBlurEffect: 'systemMaterialLight',
                headerBackground: () => (
                  <BlurView tint="light" intensity={30} style={StyleSheet.absoluteFill} />
                ),
                headerLeft: (props) => (
                  <HeaderBackButton {...props} labelVisible={false} tintColor="#1E202A" />
                ),
                headerTitleAlign: 'center',
                headerStyle: {
                  backgroundColor: '#F4F6FC',
                  height: Platform.OS === 'ios' ? 60 : 52,
                },
                headerTitleContainerStyle: {
                  paddingTop: Platform.OS === 'ios' ? 0 : 0,
                  paddingBottom: 0,
                },
                headerBackButtonDisplayMode: 'minimal',
                headerBackTitle: '',
                headerStatusBarHeight: Platform.OS === 'ios' ? 0 : undefined,
              }}
            />
            <Stack.Screen name="statistics" options={{ headerShown: false, title: '统计总览' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ScheduleProvider>
    </GluestackUIProvider>
  );
}
