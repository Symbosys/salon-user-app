import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchProfile = useCallback(async () => {
    try {
      const customerId = await AsyncStorage.getItem("customerId");
      if (!customerId) {
        Alert.alert("Error", "Customer ID not found. Please login again.");
        return;
      }
      const response = await fetch(`${API_URL}/api/users/${customerId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch profile");
      }
      setProfile(data);
    } catch (error) {
      console.log("Fetch Profile Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove([
            "authToken",
            "customerId",
            "customerMobile",
            "userLocation",
            "userLocationSaved",
          ]);
          router.replace("/auth/login" as any);
        },
      },
    ]);
  };
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Manage your account</Text>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {loading ? "Loading..." : profile?.name || "User"}
            </Text>
            <Text style={styles.phone}>
              {profile?.mobile ? `+91 ${profile.mobile}` : ""}
            </Text>
            <Text style={styles.email}>
              {profile?.email || "No email added"}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/profile/edit" as any)}
          >
            <Text style={styles.edit}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/bookings" as any)}
          >
            <View style={styles.iconBox}>
              <Text>📅</Text>
            </View>
            <Text style={styles.menuText}>My Bookings</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.line} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push("/profile/favorites" as any)}
          >
            <View style={styles.iconBox}>
              <Text>❤️</Text>
            </View>
            <Text style={styles.menuText}>Favorite Salons</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                "Help & Support",
                "For support, please contact our support team.",
              )
            }
          >
            <View style={styles.iconBox}>
              <Text>❓</Text>
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.line} />
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                "Terms & Privacy",
                "Terms and privacy details will be available here.",
              )
            }
          >
            <View style={styles.iconBox}>
              <Text>📄</Text>
            </View>
            <Text style={styles.menuText}>Terms & Privacy</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>SalonApp v1.0.0</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#191522",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
  },
  profileCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#E9D9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#7B2CBF",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
  },
  phone: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  email: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  edit: {
    color: "#7B2CBF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F4EEFC",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    marginLeft: 13,
    fontSize: 15,
    fontWeight: "600",
    color: "#25202F",
  },
  arrow: {
    fontSize: 26,
    color: "#999",
  },
  line: {
    height: 1,
    backgroundColor: "#EEEEEE",
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: "#E0D5E8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutText: {
    color: "#D64545",
    fontSize: 15,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 18,
    marginBottom: 30,
  },
});
