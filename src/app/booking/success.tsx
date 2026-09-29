import { API_URL } from "@/constants/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SuccessScreen() {
  const router = useRouter();

  const { salonId, serviceIds, date, time, staffName, bookingId } =
    useLocalSearchParams<{
      salonId?: string;
      serviceIds?: string;
      date?: string;
      time?: string;
      staffName?: string;
      bookingId?: string;
    }>();

  const [salonName, setSalonName] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [payAtSalon, setPayAtSalon] = useState(0);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookingDetails = async () => {
      try {
        // ================= BOOKING / QR CODE =================
        if (bookingId) {
          try {
            const bookingResponse = await fetch(
              `${API_URL}/api/bookings/by-booking-id/${bookingId}`,
            );

            const bookingData = await bookingResponse.json();

            if (bookingResponse.ok) {
              setQrCode(bookingData.qrCode || "");
            }
          } catch (qrError) {
            console.error("QR Code Error:", qrError);
          }
        }

        // ================= SALON DETAILS =================
        if (salonId) {
          const salonResponse = await fetch(`${API_URL}/api/salons`);
          const salonsData = await salonResponse.json();

          if (Array.isArray(salonsData)) {
            const salon = salonsData.find(
              (item: any) => Number(item.id) === Number(salonId),
            );

            if (salon) {
              setSalonName(salon.name || "Salon");
            }
          }
        }

        // ================= SELECTED SERVICES =================
        if (salonId && serviceIds) {
          const serviceIdArray = serviceIds
            .split(",")
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));

          const serviceResponse = await fetch(
            `${API_URL}/api/services/${salonId}`,
          );

          const serviceData = await serviceResponse.json();

          if (Array.isArray(serviceData)) {
            const selectedServicesData = serviceData.filter((service: any) =>
              serviceIdArray.includes(Number(service.id)),
            );

            const selectedServices = selectedServicesData.map(
              (service: any) => service.name,
            );

            setServices(selectedServices);

            // ================= TOTAL SERVICE AMOUNT =================
            const serviceTotal = selectedServicesData.reduce(
              (total: number, service: any) =>
                total + Number(service.price || 0),
              0,
            );

            setTotalAmount(serviceTotal);

            // ================= ACTIVE OFFER =================
            let discount = 0;
            let discountValue = 0;

            try {
              const offerResponse = await fetch(
                `${API_URL}/api/offers/${salonId}`,
              );

              const offerData = await offerResponse.json();

              if (Array.isArray(offerData)) {
                const activeOffer = offerData.find(
                  (offer: any) => offer.isActive === true,
                );

                if (activeOffer) {
                  discount = Number(activeOffer.discount || 0);

                  discountValue = (serviceTotal * discount) / 100;
                }
              }
            } catch (offerError) {
              console.error("Offer Error:", offerError);
            }

            setDiscountPercent(discount);
            setDiscountAmount(discountValue);

            // ================= PAY AT SALON =================
            setPayAtSalon(serviceTotal - discountValue);
          }
        }
      } catch (error) {
        console.error("Load Success Details Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBookingDetails();
  }, [salonId, serviceIds, bookingId]);

  // ================= DATE FORMAT =================
  const formatDate = (value?: string) => {
    if (!value) return "-";

    const dateObject = new Date(value);

    if (isNaN(dateObject.getTime())) {
      return value;
    }

    return dateObject.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const hasStaff = !!staffName;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ================= SUCCESS ICON ================= */}
        <View style={styles.successCircle}>
          <Text style={styles.check}>✓</Text>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>

        <Text style={styles.subtitle}>
          Your appointment has been booked successfully.
        </Text>

        {/* ================= SALON DETAILS ================= */}
        <View style={styles.card}>
          <Text style={styles.salonName}>{salonName}</Text>

          {/* Booking ID */}
          <View style={styles.row}>
            <Text style={styles.label}>Booking ID</Text>

            <Text style={styles.value}>{bookingId || "-"}</Text>
          </View>

          {/* Services */}
          <View style={styles.serviceRow}>
            <Text style={styles.label}>Services</Text>

            <View style={styles.servicesContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#5B3CC4" />
              ) : services.length > 0 ? (
                services.map((service, index) => (
                  <Text key={index} style={styles.serviceValue}>
                    {service}
                  </Text>
                ))
              ) : (
                <Text style={styles.value}>-</Text>
              )}
            </View>
          </View>

          {/* Date */}
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>

            <Text style={styles.value}>{formatDate(date)}</Text>
          </View>

          {/* Time */}
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>

            <Text style={styles.value}>{time || "-"}</Text>
          </View>

          {/* Staff */}
          {hasStaff && (
            <View style={styles.row}>
              <Text style={styles.label}>Staff</Text>

              <Text style={styles.value}>{staffName}</Text>
            </View>
          )}

          {/* ================= SALON PAYMENT ================= */}
          <View style={styles.divider} />

          <Text style={styles.paymentTitle}>Payment at Salon</Text>

          {/* Total Amount */}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>

            {loading ? (
              <ActivityIndicator size="small" color="#5B3CC4" />
            ) : (
              <Text style={styles.paymentValue}>₹{totalAmount.toFixed(2)}</Text>
            )}
          </View>

          {/* Discount */}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Discount</Text>

            <Text style={styles.discountPercent}>{discountPercent}%</Text>
          </View>

          {/* Discount Amount */}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Discount Amount</Text>

            <Text style={styles.discountAmount}>
              -₹{discountAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Pay at Salon */}
          <View style={styles.payAtSalonRow}>
            <Text style={styles.payAtSalonLabel}>Pay at Salon</Text>

            {loading ? (
              <ActivityIndicator size="small" color="#5B3CC4" />
            ) : (
              <Text style={styles.payAtSalonAmount}>
                ₹{payAtSalon.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* ================= BACKEND QR CARD ================= */}
        <View style={styles.qrCard}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>

          <Text style={styles.bookingId}>{bookingId || "-"}</Text>

          <Text style={styles.qrInstruction}>
            Show this QR code at the salon
          </Text>

          <View style={styles.qrContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#5B3CC4" />
            ) : qrCode ? (
              <QRCode
                value={qrCode}
                size={82}
                backgroundColor="#FFFFFF"
                color="#111111"
              />
            ) : (
              <Text style={styles.noQrText}>QR Code not available</Text>
            )}
          </View>

          <Text style={styles.qrFooter}>Scan to verify your booking</Text>
        </View>

        {/* ================= BUTTONS ================= */}
        <TouchableOpacity
          style={styles.bookingButton}
          activeOpacity={0.8}
          onPress={() => router.push("/bookings" as any)}
        >
          <Text style={styles.bookingButtonText}>View My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          activeOpacity={0.8}
          onPress={() => router.replace("/(tabs)" as any)}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F7FF",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 25,
    alignItems: "center",
  },

  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  check: {
    fontSize: 40,
    fontWeight: "700",
    color: "#6B32C9",
    marginTop: -4,
  },

  title: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222",
  },

  subtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 7,
    marginBottom: 20,
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 14,
  },

  salonName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  label: {
    fontSize: 11,
    color: "#888",
  },

  value: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },

  servicesContainer: {
    maxWidth: "65%",
    alignItems: "flex-end",
  },

  serviceValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
    textAlign: "right",
    marginBottom: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },

  paymentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
    marginBottom: 14,
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  paymentLabel: {
    fontSize: 12,
    color: "#777",
  },

  paymentValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  discountPercent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A9B5F",
  },

  discountAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A9B5F",
  },

  payAtSalonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  payAtSalonLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  payAtSalonAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  qrCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 16,
  },

  bookingIdLabel: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
  },

  bookingId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6540D2",
  },

  qrInstruction: {
    fontSize: 10,
    color: "#888",
    marginTop: 12,
    marginBottom: 12,
  },

  qrContainer: {
    width: 94,
    height: 94,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  qrText: {
    fontSize: 6,
    lineHeight: 8,
    color: "#111",
    textAlign: "center",
  },

  noQrText: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
  },

  qrFooter: {
    fontSize: 9,
    color: "#999",
    marginTop: 9,
  },

  bookingButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    marginBottom: 10,
  },

  bookingButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  homeButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDD5FF",
    alignItems: "center",
    justifyContent: "center",
  },

  homeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3CC4",
  },
});
