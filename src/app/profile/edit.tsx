import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const customerId = await AsyncStorage.getItem("customerId");
        if (!customerId) {
          Alert.alert("Error", "Customer ID not found. Please login again.");
          return;
        }
        const response = await fetch(`${API_URL}/api/users/${customerId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile");
        }
        setName(data.name || "");
        setMobile(data.mobile || "");
        setEmail(data.email || "");
      } catch (error) {
        console.log("Load Profile Error:", error);
        Alert.alert("Error", "Unable to load profile details.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    try {
      setSaving(true);
      const customerId = await AsyncStorage.getItem("customerId");
      if (!customerId) {
        Alert.alert("Error", "Customer ID not found. Please login again.");
        return;
      }
      const response = await fetch(`${API_URL}/api/users/${customerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }
      Alert.alert("Success", "Profile updated successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Update Profile Error:", error);
      Alert.alert("Error", "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your account details</Text>
          </View>
        </View>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name.trim() ? name.trim().charAt(0).toUpperCase() : "S"}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.changePhoto}>Change Photo</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={mobile}
            editable={false}
            placeholder="Enter mobile number"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>
            Mobile number cannot be changed.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },
  content: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  backText: {
    fontSize: 32,
    lineHeight: 34,
    color: "#191522",
    marginTop: -3,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#191522",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 25,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E9D9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#7B2CBF",
  },
  changePhoto: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B3CC4",
    marginTop: 10,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#25202F",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E1DFE7",
    borderRadius: 12,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#191522",
    marginBottom: 18,
  },
  disabledInput: {
    backgroundColor: "#F1F0F4",
    color: "#888",
  },
  helperText: {
    fontSize: 11,
    color: "#999",
    marginTop: -13,
    marginBottom: 18,
  },
  saveButton: {
    height: 54,
    marginHorizontal: 20,
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
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
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },
});
