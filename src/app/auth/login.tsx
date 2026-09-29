import { API_URL } from "@/constants/api";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidMobile =
    /^[6-9]\d{9}$/.test(mobile) && !/^(\d)\1{9}$/.test(mobile);

  const handleContinue = async () => {
    if (!isValidMobile || loading) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to send OTP");
        return;
      }

      router.push({
        pathname: "/auth/otp",
        params: {
          mobile,
        },
      } as any);
    } catch (error) {
      console.error(error);

      Alert.alert("Connection Error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>S</Text>
          </View>

          <Text style={styles.title}>Welcome to SalonApp</Text>

          <Text style={styles.subtitle}>
            Book your salon appointment in just a few steps
          </Text>

          <Text style={styles.label}>Mobile Number</Text>

          <View style={styles.phoneInput}>
            <Text style={styles.countryCode}>+91</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter mobile number"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(text) => {
                const numbersOnly = text.replace(/[^0-9]/g, "");
                setMobile(numbersOnly);
              }}
            />
          </View>

          {mobile.length > 0 && !isValidMobile && (
            <Text style={styles.errorText}>
              Please enter a valid 10-digit mobile number
            </Text>
          )}

          <Pressable
            style={[
              styles.button,
              (!isValidMobile || loading) && styles.disabledButton,
            ]}
            disabled={!isValidMobile || loading}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Continue"}
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: "center",
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },

  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#222222",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#777777",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 34,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 9,
  },

  phoneInput: {
    height: 54,
    borderWidth: 1,
    borderColor: "#E2E2E7",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFC",
  },

  countryCode: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333333",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#DDDDDD",
  },

  input: {
    flex: 1,
    height: 54,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#222222",
  },

  errorText: {
    fontSize: 12,
    color: "#D64545",
    marginTop: 7,
    marginLeft: 2,
  },

  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  disabledButton: {
    backgroundColor: "#CFC7E8",
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  terms: {
    fontSize: 11,
    lineHeight: 17,
    color: "#999999",
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 20,
  },
});
