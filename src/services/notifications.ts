import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { API_URL } from "@/constants/api";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission was not granted.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const devicePushToken = await Notifications.getDevicePushTokenAsync();

    const fcmToken = devicePushToken.data;

    console.log("FCM DEVICE TOKEN:", fcmToken);

    // -----------------------------------------
    // GET LOGGED-IN CUSTOMER
    // -----------------------------------------
    const customerId = await AsyncStorage.getItem("customerId");

    if (!customerId) {
      console.log("Customer ID not found.");
      return fcmToken;
    }

    // -----------------------------------------
    // SAVE FCM TOKEN TO BACKEND
    // -----------------------------------------
    const response = await fetch(`${API_URL}/api/notifications/device-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: Platform.OS,
        deviceType: Device.deviceName || "Android Device",
        userId: Number(customerId),
      }),
    });

    const data = await response.json();

    console.log("FCM TOKEN REGISTER RESPONSE:", response.status);
    console.log("FCM TOKEN REGISTER DATA:", data);

    if (!response.ok) {
      console.log("Failed to register FCM token.");
    }

    return fcmToken;
  } catch (error) {
    console.error("FCM registration error:", error);
    return null;
  }
}

export function setupCustomerNotificationTapHandler() {
  const handleNotification = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    const type = String(data?.type || "").toUpperCase();
    const screen = String(data?.screen || "").toLowerCase();

    console.log("CUSTOMER NOTIFICATION TAPPED:", data);

    // CUSTOMER ACCOUNT SUSPENDED
    if (type === "CUSTOMER_ACCOUNT_SUSPENDED") {
      router.replace("/account-suspended" as any);
      return;
    }

    // CUSTOMER ACCOUNT REACTIVATED
    if (type === "CUSTOMER_ACCOUNT_REACTIVATED") {
      router.replace("/(tabs)" as any);
      return;
    }

    if (type === "SERVICE_COMPLETED" || type === "BOOKING_COMPLETED") {
      router.replace("/(tabs)/bookings?tab=completed" as any);
      return;
    }

    // BOOKINGS

    if (
      type.includes("BOOKING") ||
      screen === "bookings" ||
      screen === "booking" ||
      screen === "confirmed" ||
      screen === "completed" ||
      screen === "rejected"
    ) {
      const isCompleted = type.includes("COMPLETE") || screen === "completed";

      const isRejected =
        type.includes("CANCEL") ||
        type.includes("REJECT") ||
        screen === "rejected";

      const isConfirmed =
        type.includes("ACCEPT") ||
        type.includes("CONFIRM") ||
        screen === "confirmed";

      if (isCompleted) {
        router.replace("/(tabs)/bookings?tab=completed" as any);
      } else if (isRejected) {
        router.replace("/(tabs)/bookings?tab=rejected" as any);
      } else if (isConfirmed) {
        router.replace("/(tabs)/bookings?tab=confirmed" as any);
      } else {
        router.replace("/(tabs)/bookings" as any);
      }

      return;
    }

    // OFFERS
    if (type === "NEW_OFFER" || screen === "offer" || screen === "offers") {
      router.navigate("/(tabs)");
      router.push("/offers" as any);
    }
  };

  const subscription =
    Notifications.addNotificationResponseReceivedListener(handleNotification);

  // Handle notification tapped while app was closed
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleNotification(response);
      Notifications.clearLastNotificationResponseAsync();
    }
  });

  return () => subscription.remove();
}
