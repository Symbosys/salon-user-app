import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { API_URL } from "@/constants/api";
import { setupCustomerNotificationTapHandler } from "@/services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
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
import { AppState, useColorScheme } from "react-native";
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    const unsubscribe = setupCustomerNotificationTapHandler();
    return unsubscribe;
  }, []);
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthCheck />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="salon/[id]" />
        <Stack.Screen name="account-suspended" />
      </Stack>
    </ThemeProvider>
  );
}
function AuthCheck() {
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    let isMounted = true;
    const checkRoute = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const firstSegment = segments[0];
        const isAuthScreen = firstSegment === "auth";
        const isLocationScreen = firstSegment === "location";
        const isTabsScreen = firstSegment === "(tabs)";
        const isSuspendedScreen = firstSegment === "account-suspended";
        if (!token) {
          if (!isAuthScreen) {
            router.replace("/auth/login");
          }
          return;
        }
        const customerId = await AsyncStorage.getItem("customerId");
        console.log("AUTH TOKEN:", token);
        console.log("CUSTOMER ID:", customerId);
        if (customerId) {
          try {
            const statusUrl = `${API_URL}/api/auth/status/${customerId}`;
            console.log("STATUS API:", statusUrl);
            const statusResponse = await fetch(statusUrl);
            const statusData = await statusResponse.json();
            console.log("STATUS RESPONSE:", statusResponse.status);
            console.log("STATUS DATA:", statusData);
            if (statusResponse.ok) {
              if (statusData.status === "SUSPENDED") {
                console.log("ACCOUNT IS SUSPENDED");
                if (!isSuspendedScreen && isMounted) {
                  router.replace("/account-suspended");
                }
                return;
              }
              console.log("ACCOUNT STATUS:", statusData.status);
            }
          } catch (statusError) {
            console.log("ACCOUNT STATUS ERROR:", statusError);
          }
        }
        const locationSaved = await AsyncStorage.getItem("userLocationSaved");
        if (locationSaved !== "true") {
          if (!isLocationScreen && !isSuspendedScreen) {
            router.replace("/location");
          }
          return;
        }
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse && isMounted) {
          const responseId = lastResponse.notification.request.identifier;
          const handledId = await AsyncStorage.getItem(
            "lastHandledNotificationId",
          );
          if (responseId !== handledId) {
            const data = lastResponse.notification.request.content.data;
            const type = String(data?.type || "").toUpperCase();
            const screen = String(data?.screen || "").toLowerCase();
            const isOffer =
              type === "NEW_OFFER" || screen === "offer" || screen === "offers";
            const isBooking =
              type.includes("BOOKING") ||
              screen === "bookings" ||
              screen === "booking";
            if (isOffer || isBooking) {
              await AsyncStorage.setItem(
                "lastHandledNotificationId",
                responseId,
              );
              await Notifications.clearLastNotificationResponseAsync();
              if (isOffer) {
                router.replace("/offers" as any);
              } else {
                const isCancelled =
                  type.includes("CANCEL") || screen === "rejected";
                router.replace(
                  isCancelled
                    ? ("/(tabs)/bookings?tab=rejected" as any)
                    : ("/(tabs)/bookings" as any),
                );
              }
              return;
            }
          }
        }
        if (isAuthScreen || isLocationScreen) {
          router.replace("/(tabs)");
          return;
        }
        if (isTabsScreen) {
          return;
        }
      } catch (error) {
        console.log("Route check error:", error);
      }
    };
    checkRoute();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkRoute();
      }
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [segments]);
  return null;
}
