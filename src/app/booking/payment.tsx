import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const paymentMethods = [
  {
    id: "upi",
    title: "UPI",
    subtitle: "Google Pay, PhonePe, Paytm",
    icon: "◉",
  },
  {
    id: "card",
    title: "Credit / Debit Card",
    subtitle: "Visa, Mastercard, RuPay",
    icon: "▣",
  },
];

export default function PaymentScreen() {
  const router = useRouter();

  const {
    salonId,
    serviceIds,
    date,
    time,
    staffId,
    staffName,
    bookingFee,
    discountAmount,
  } = useLocalSearchParams<{
    salonId?: string;
    serviceIds?: string;
    date?: string;
    time?: string;
    staffId?: string;
    staffName?: string;
    bookingFee?: string;
    discountAmount?: string;
  }>();

  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Payment is only for booking fee
  const amount = Number(bookingFee || 0);

  const createBooking = async () => {
    try {
      setLoading(true);

      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        Alert.alert(
          "Booking Error",
          "Customer ID not found. Please login again.",
        );
        setLoading(false);
        return;
      }

      const serviceIdArray = serviceIds
        ? serviceIds
            .split(",")
            .map((id) => Number(id))
            .filter((id) => !isNaN(id))
        : [];

      if (!salonId || serviceIdArray.length === 0 || !date || !time) {
        Alert.alert("Booking Error", "Required booking details are missing.");

        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: Number(customerId),
          salonId: Number(salonId),
          serviceIds: serviceIdArray,
          staffId: staffId ? Number(staffId) : null,
          date,
          time,

          // Booking fee DB me save karne ke liye
          bookingFee: amount,

          // Selected offer discount
          discount: Number(discountAmount || 0),

          // Selected payment method
          paymentMethod: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Booking API Error:", data);

        Alert.alert(
          "Booking Failed",
          data.message || "Unable to create booking.",
        );

        setLoading(false);
        return;
      }

      console.log("Booking Created:", data);

      router.push({
        pathname: "/booking/success",
        params: {
          salonId: salonId || "",
          serviceIds: serviceIds || "",
          date: date || "",
          time: time || "",
          staffId: staffId || "",
          staffName: staffName || "",
          bookingFee: String(amount),
          paymentMethod: selectedMethod,
          bookingId: data.booking?.bookingId || "",
        },
      } as any);
    } catch (error) {
      console.error("Create Booking Error:", error);

      Alert.alert("Booking Failed", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (paymentFailed) {
      createBooking();
      return;
    }

    // Dummy payment failure for current UI flow
    setPaymentFailed(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Payment</Text>

        <Text style={styles.subtitle}>
          Pay only the booking fee to confirm your appointment
        </Text>

        {/* Payment Failed */}
        {paymentFailed && (
          <View style={styles.failedCard}>
            <View style={styles.failedIcon}>
              <Text style={styles.failedIconText}>!</Text>
            </View>

            <View style={styles.failedContent}>
              <Text style={styles.failedTitle}>Payment Failed</Text>

              <Text style={styles.failedText}>
                We couldn't process your payment. Please try again.
              </Text>
            </View>
          </View>
        )}

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>

          <Text style={styles.amount}>₹{amount}</Text>

          <Text style={styles.amountInfo}>Booking fee only</Text>
        </View>

        {/* Payment Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ</Text>

          <Text style={styles.infoText}>
            You are only paying the booking fee now. The service amount will be
            paid at the salon.
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Payment Method</Text>

        {paymentMethods.map((method) => {
          const selected = selectedMethod === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentCard,
                selected && styles.selectedPaymentCard,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedMethod(method.id);
                setPaymentFailed(false);
              }}
            >
              <View
                style={[
                  styles.methodIcon,
                  selected && styles.selectedMethodIcon,
                ]}
              >
                <Text
                  style={[
                    styles.methodIconText,
                    selected && styles.selectedMethodIconText,
                  ]}
                >
                  {method.icon}
                </Text>
              </View>

              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>{method.title}</Text>

                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>

              <View style={[styles.radio, selected && styles.selectedRadio]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* UPI Info */}
        {selectedMethod === "upi" && (
          <View style={styles.upiInfoCard}>
            <Text style={styles.infoIcon}>🔒</Text>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Secure UPI Payment</Text>

              <Text style={styles.upiInfoText}>
                You will be redirected to your UPI app to complete the payment
                securely.
              </Text>
            </View>
          </View>
        )}

        {/* Price Details */}
        <Text style={styles.sectionTitle}>Price Details</Text>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Booking Fee</Text>

            <Text style={styles.priceValue}>₹{amount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Pay Now</Text>

            <Text style={styles.totalValue}>₹{amount}</Text>
          </View>
        </View>

        {/* Pay / Retry */}
        <TouchableOpacity
          style={[
            styles.payButton,
            paymentFailed && styles.retryButton,
            loading && styles.disabledButton,
          ]}
          activeOpacity={0.8}
          disabled={loading}
          onPress={handlePayment}
        >
          <Text style={styles.payButtonText}>
            {loading
              ? "Creating Booking..."
              : paymentFailed
                ? "Retry Payment"
                : `Pay ₹${amount}`}
          </Text>
        </TouchableOpacity>

        <Text style={styles.secureText}>
          🔒 Your payment information is secure
        </Text>

        <View style={{ height: 30 }} />
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  backText: {
    fontSize: 34,
    color: "#222",
    marginTop: -5,
  },

  title: {
    marginTop: 22,
    fontSize: 28,
    fontWeight: "800",
    color: "#191522",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#777",
  },

  failedCard: {
    marginTop: 18,
    backgroundColor: "#FFF3F3",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD7D7",
  },

  failedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFE0E0",
    alignItems: "center",
    justifyContent: "center",
  },

  failedIconText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#D64545",
  },

  failedContent: {
    flex: 1,
    marginLeft: 12,
  },

  failedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#C43D3D",
  },

  failedText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#8A6060",
    marginTop: 3,
  },

  amountCard: {
    marginTop: 22,
    backgroundColor: "#5B3CC4",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  amountLabel: {
    color: "#DDD4F8",
    fontSize: 12,
    fontWeight: "600",
  },

  amount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    marginTop: 5,
  },

  amountInfo: {
    color: "#DDD4F8",
    fontSize: 11,
    marginTop: 4,
  },

  infoCard: {
    marginTop: 14,
    backgroundColor: "#F1EDFF",
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    fontSize: 18,
    marginRight: 9,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B6082",
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 13,
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
  },

  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  selectedPaymentCard: {
    borderColor: "#5B3CC4",
    backgroundColor: "#FAF8FF",
    borderWidth: 1.5,
    elevation: 3,
  },

  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1EFF5",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedMethodIcon: {
    backgroundColor: "#EAE3FF",
  },

  methodIconText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#777",
  },

  selectedMethodIconText: {
    color: "#5B3CC4",
  },

  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },

  methodTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  methodSubtitle: {
    marginTop: 4,
    fontSize: 11,
    color: "#888",
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#C8C5D0",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedRadio: {
    borderColor: "#5B3CC4",
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#5B3CC4",
  },

  upiInfoCard: {
    backgroundColor: "#F1EDFF",
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4D3A8A",
  },

  upiInfoText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B6082",
  },

  priceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#EEEEF2",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  priceLabel: {
    fontSize: 13,
    color: "#777",
  },

  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEF2",
    marginVertical: 5,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  payButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  retryButton: {
    backgroundColor: "#5B3CC4",
  },

  disabledButton: {
    opacity: 0.6,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secureText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 11,
    color: "#999",
  },
});
