import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <AuthCheck />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="salon/[id]" />
      </Stack>
    </ThemeProvider>
  );
}

function AuthCheck() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkRoute = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");

        const firstSegment = segments[0];

        const isAuthScreen = firstSegment === "auth";
        const isLocationScreen = firstSegment === "location";
        const isTabsScreen = firstSegment === "(tabs)";

        // Not logged in
        if (!token) {
          if (!isAuthScreen) {
            router.replace("/auth/login");
          }
          return;
        }

        // Logged in but location not saved
        const locationSaved = await AsyncStorage.getItem("userLocationSaved");

        if (locationSaved !== "true") {
          if (!isLocationScreen) {
            router.replace("/location");
          }
          return;
        }

        // Logged in + location saved
        if (isAuthScreen || isLocationScreen) {
          router.replace("/(tabs)");
        }

        // Already on Home
        if (isTabsScreen) {
          return;
        }
      } catch (error) {
        console.log("Route check error:", error);
      }
    };

    checkRoute();
  }, [segments]);

  return null;
}
