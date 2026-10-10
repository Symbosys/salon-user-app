import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationScreen() {
  const router = useRouter();

  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleAllowLocation = async () => {
    if (loadingLocation) return;

    setLoadingLocation(true);

    try {
      // Ask location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please allow location access to find nearby salons.",
        );
        return;
      }

      // Get phone GPS location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Send coordinates to our backend
      const response = await fetch(`${API_URL}/api/location/reverse-geocode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Ola Maps Error:", data);

        Alert.alert(
          "Location Error",
          "Unable to detect your location. Please try again.",
        );
        return;
      }

      // First result from Ola Maps
      const address = data?.result;

      if (!address) {
        Alert.alert(
          "Location Error",
          "Unable to find your area. Please try again.",
        );
        return;
      }

      // Find address components
      const components = address.address_components || [];

      console.log("========== ADDRESS COMPONENTS ==========");
      console.dir(components, { depth: null });
      console.log("========================================");

      const getComponent = (type: string) => {
        const component = components.find((item: any) =>
          item.types?.includes(type),
        );

        return component?.long_name || "";
      };

      // Area / locality priority
      const locality =
        getComponent("sublocality") ||
        getComponent("neighborhood") ||
        getComponent("sublocality_level_3") ||
        getComponent("locality") ||
        "";

      const city =
        getComponent("locality") ||
        getComponent("administrative_area_level_2") ||
        "";

      const state = getComponent("administrative_area_level_1");

      const pincode = getComponent("postal_code");

      const detectedLocation = {
        latitude,
        longitude,
        locality: address.formatted_address || "",
        city,
        state,
        pincode,
        address: address.formatted_address || "",
      };

      console.log("========== DETECTED LOCATION ==========");
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);
      console.log("Locality / Area:", locality);
      console.log("City:", city);
      console.log("State:", state);
      console.log("Pincode:", pincode);
      console.log("Full Address:", address.formatted_address);
      console.log("========================================");

      // Save location
      await AsyncStorage.setItem(
        "userLocation",
        JSON.stringify(detectedLocation),
      );

      await AsyncStorage.setItem("userLocationSaved", "true");

      // Go directly to Home
      router.replace("/(tabs)" as any);
    } catch (error) {
      console.error("Location Error:", error);

      Alert.alert(
        "Location Error",
        "Unable to detect your current location. Please try again.",
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Location Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.locationIcon}>📍</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Allow Location Access</Text>

        <Text style={styles.subtitle}>
          We need your location to show nearby salons and available appointments
          in your area.
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <Text style={styles.infoIcon}>📍</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Find salons near you</Text>

            <Text style={styles.infoText}>
              Your location helps us show the salons closest to you.
            </Text>
          </View>
        </View>

        {/* Allow Location */}
        <TouchableOpacity
          style={[styles.allowButton, loadingLocation && styles.disabledButton]}
          activeOpacity={0.8}
          onPress={handleAllowLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.loadingButtonText}>
                Detecting Location...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonIcon}>📍</Text>

              <Text style={styles.allowButtonText}>Allow Location</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomText}>
          Your location will be used to show nearby salons.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },

  locationIcon: {
    fontSize: 50,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#191522",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#777",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 340,
  },

  infoCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F7FC",
    borderRadius: 18,
    padding: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#EEEAF7",
  },

  infoIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EDE6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  infoIcon: {
    fontSize: 23,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#191522",
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#777",
    marginTop: 4,
  },

  allowButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#5B3CC4",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  disabledButton: {
    backgroundColor: "#CFC7E8",
  },

  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  allowButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  loadingButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 9,
  },

  bottomText: {
    fontSize: 11,
    color: "#999",
    marginTop: 18,
    textAlign: "center",
  },
});
