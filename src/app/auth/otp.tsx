import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

export default function OTPScreen() {
  const router = useRouter();

  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(56);
  const [loading, setLoading] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const isValidOTP = otp.every((digit) => digit !== "");

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const updateOTP = (index: number, value: string) => {
    const numberOnly = value.replace(/[^0-9]/g, "");

    if (!numberOnly) {
      const newOTP = [...otp];
      newOTP[index] = "";
      setOtp(newOTP);
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = numberOnly.slice(-1);
    setOtp(newOTP);

    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || loading) return;

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
        Alert.alert("Error", data.message || "Failed to resend OTP");
        return;
      }

      setOtp(["", "", "", ""]);
      setTimer(56);

      inputRefs.current[0]?.focus();

      Alert.alert("OTP Sent", "A new OTP has been sent.");
    } catch (error) {
      console.error(error);

      Alert.alert("Connection Error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isValidOTP || loading) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          otp: otp.join(""),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Verification Failed", data.message || "Invalid OTP");
        return;
      }

      await AsyncStorage.setItem("authToken", "logged_in");
      await AsyncStorage.setItem("customerMobile", mobile);
      await AsyncStorage.setItem("customerId", String(data.user.id));

      router.replace("/location" as any);
    } catch (error) {
      console.error(error);

      Alert.alert("Connection Error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>

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

          <Text style={styles.title}>We just sent an SMS</Text>

          <Text style={styles.subtitle}>
            Enter the 4-digit verification code we sent to
          </Text>

          <View style={styles.mobileRow}>
            <Text style={styles.mobileNumber}>+91 {mobile}</Text>

            <Pressable onPress={() => router.back()}>
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit !== "" && styles.otpInputFilled]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => updateOTP(index, value)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                textAlign="center"
                selectionColor="#5B3CC4"
              />
            ))}
          </View>

          <Pressable
            style={[
              styles.verifyButton,
              (!isValidOTP || loading) && styles.disabledButton,
            ]}
            disabled={!isValidOTP || loading}
            onPress={handleVerify}
          >
            <Text style={styles.verifyText}>
              {loading ? "Verifying..." : "Verify"}
            </Text>
          </Pressable>

          <View style={styles.resendSection}>
            <Text style={styles.resendTitle}>Didn't receive code?</Text>

            {timer > 0 ? (
              <Text style={styles.timerText}>
                Resend OTP in 00:
                {timer.toString().padStart(2, "0")} sec
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            )}
          </View>
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
    paddingTop: 70,
    paddingBottom: 35,
    justifyContent: "center",
  },

  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F2FF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backText: {
    fontSize: 32,
    lineHeight: 36,
    color: "#5B3CC4",
    fontWeight: "400",
    marginTop: -2,
  },

  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  logoText: {
    fontSize: 31,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#181824",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#777784",
    textAlign: "center",
    marginTop: 9,
  },

  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  mobileNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#252531",
  },

  editIcon: {
    fontSize: 21,
    color: "#5B3CC4",
    marginLeft: 9,
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 30,
  },

  otpInput: {
    width: 58,
    height: 58,
    borderWidth: 1.5,
    borderColor: "#D9D5F5",
    borderRadius: 12,
    backgroundColor: "#FAF9FF",
    fontSize: 22,
    fontWeight: "700",
    color: "#22222D",
  },

  otpInputFilled: {
    borderColor: "#5B3CC4",
    backgroundColor: "#F8F5FF",
  },

  verifyButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
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

  verifyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  resendSection: {
    alignItems: "center",
    marginTop: 20,
  },

  resendTitle: {
    fontSize: 13,
    color: "#9999A3",
  },

  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888892",
    marginTop: 6,
  },

  resendText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B3CC4",
  },
});
