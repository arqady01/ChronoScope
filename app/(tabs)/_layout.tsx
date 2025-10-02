import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

const TAB_INACTIVE_COLOR = '#B9B9B9';
const TAB_ACTIVE_COLOR = '#000000';
const HOME_ACTIVE_GRADIENT = [
  { offset: '0%', color: '#FFAE58' },
  { offset: '45%', color: '#735BF2' },
  { offset: '100%', color: '#146BC2' },
];
const HOME_GRADIENT_ID = 'homeTabGradient';

function HomeTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const textColor = color ?? (focused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR);

  return (
    <View style={styles.iconLabelContainer}>
      <Svg width={30} height={30} viewBox="0 0 28 28">
        {focused ? (
          <Defs>
            <LinearGradient id={HOME_GRADIENT_ID} x1="15%" y1="0%" x2="85%" y2="100%">
              {HOME_ACTIVE_GRADIENT.map((stop) => (
                <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
              ))}
            </LinearGradient>
          </Defs>
        ) : null}

        <Circle
          cx={14}
          cy={14}
          r={9.6}
          stroke={focused ? `url(#${HOME_GRADIENT_ID})` : TAB_INACTIVE_COLOR}
          strokeWidth={1.8}
          strokeOpacity={focused ? 1 : 0.9}
          fill="none"
        />

        <Path
          d="M14 6.2l2.07 4.44 4.9.35-3.74 3.17 1.16 4.88L14 16.96l-4.39 2.08 1.16-4.88-3.74-3.17 4.9-.35L14 6.2z"
          fill={focused ? `url(#${HOME_GRADIENT_ID})` : TAB_INACTIVE_COLOR}
          fillOpacity={focused ? 1 : 0.9}
        />

        <Path
          d="M6.2 18.4c2.8-3.4 12.8-3.4 15.6 0"
          stroke={focused ? `url(#${HOME_GRADIENT_ID})` : TAB_INACTIVE_COLOR}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={focused ? 0.7 : 0.6}
          fill="none"
        />

        <Circle
          cx={20.4}
          cy={9.6}
          r={1.4}
          fill={focused ? `url(#${HOME_GRADIENT_ID})` : TAB_INACTIVE_COLOR}
          fillOpacity={focused ? 0.85 : 0.6}
        />
      </Svg>
      <Text style={[styles.tabLabel, { color: textColor }]}>日历</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 6,
          paddingBottom: 18,
        },
        tabBarBackground: () => (
          <BlurView tint="light" intensity={20} style={StyleSheet.absoluteFill} />
        ),
      }}>
      <Tabs.Screen
        name="placeholder"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconLabelContainer}>
              <IconSymbol
                size={28}
                name="bubble.left.and.bubble.right.fill"
                color={color}
              />
              <Text style={[styles.tabLabel, { color: color as string }]}>酒馆</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <HomeTabIcon focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconLabelContainer}>
              <IconSymbol size={28} name="person.circle.fill" color={color} />
              <Text style={[styles.tabLabel, { color: color as string }]}>我的</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
