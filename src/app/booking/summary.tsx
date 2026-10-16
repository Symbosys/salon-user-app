import { API_URL } from "@/constants/api";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type Service = {
  id: number;
  name: string;
  price: number;
  duration: number;
  icon?: string;
};
type Salon = {
  id: number;
  name: string;
  address: string;
  city: string;
  category?: string;
};
type Offer = {
  id: number;
  title: string;
  description?: string;
  discount: number;
  isActive: boolean;
};
export default function BookingSummaryScreen() {
  const router = useRouter();
  const { salonId, serviceIds, date, time, staffId, staffName, offerId } =
    useLocalSearchParams<{
      salonId?: string;
      serviceIds?: string;
      date?: string;
      time?: string;
      staffId?: string;
      staffName?: string;
      offerId?: string;
    }>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedServiceIds = serviceIds
    ? serviceIds.split(",").filter(Boolean).map(Number)
    : [];
  const fetchSummaryData = useCallback(async () => {
    try {
      setLoading(true);
      if (!salonId) {
        setLoading(false);
        return;
      }
      const salonResponse = await fetch(`${API_URL}/api/salons`);
      const salonData = await salonResponse.json();
      if (Array.isArray(salonData)) {
        const selectedSalon = salonData.find(
          (item: any) => Number(item.id) === Number(salonId),
        );
        if (selectedSalon) {
          setSalon(selectedSalon);
        }
      }
      const serviceResponse = await fetch(`${API_URL}/api/services/${salonId}`);
      const serviceData = await serviceResponse.json();
      if (Array.isArray(serviceData)) {
        const selectedServices = serviceData.filter((service: any) =>
          selectedServiceIds.includes(Number(service.id)),
        );
        setServices(selectedServices);
      }
      const offerResponse = await fetch(`${API_URL}/api/offers/${salonId}`);
      const offerData = await offerResponse.json();
      if (Array.isArray(offerData)) {
        const activeOffers = offerData
          .filter((item: Offer) => item.isActive === true)
          .sort(
            (a: Offer, b: Offer) => Number(b.discount) - Number(a.discount),
          );
        setOffers(activeOffers);
        const currentServiceTotal = serviceData
          .filter((service: any) =>
            selectedServiceIds.includes(Number(service.id)),
          )
          .reduce(
            (total: number, service: any) => total + Number(service.price || 0),
            0,
          );
        const getMinAmount = (offer: Offer, index: number) => {
          const title = offer.title.toLowerCase();
          if (title.includes("haircut")) return 500;
          if (title.includes("facial")) return 300;
          if (title.includes("color")) return 200;
          return [500, 300, 200][index] ?? 250;
        };
        const eligibleOffers = activeOffers.filter(
          (offer: Offer, index: number) =>
            currentServiceTotal >= getMinAmount(offer, index),
        );
        const appliedOffer = eligibleOffers.find(
          (offer: Offer) => Number(offer.id) === Number(offerId),
        );
        if (appliedOffer) {
          setSelectedOfferId(appliedOffer.id);
        } else if (eligibleOffers.length > 0) {
          setSelectedOfferId(eligibleOffers[0].id);
        } else {
          setSelectedOfferId(null);
        }
      }
    } catch (error) {
      console.error("Summary Data Error:", error);
      Alert.alert("Error", "Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  }, [salonId, selectedServiceIds.join(","), offerId]);
  useFocusEffect(
    useCallback(() => {
      fetchSummaryData();
    }, [fetchSummaryData]),
  );
  const serviceTotal = services.reduce(
    (total, service) => total + Number(service.price),
    0,
  );
  const bookingFee = services.length > 0 ? 10 + (services.length - 1) * 2 : 0;
  const selectedOffer =
    offers.find((offer) => offer.id === selectedOfferId) || null;
  const discountAmount = selectedOffer
    ? (serviceTotal * Number(selectedOffer.discount)) / 100
    : 0;
  const salonPayable = serviceTotal - discountAmount;
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
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
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Booking Summary</Text>
        <Text style={styles.subtitle}>Review your appointment details</Text>
        <View style={styles.salonCard}>
          <View style={styles.salonIcon}>
            <Text style={styles.salonEmoji}>💇‍♀️</Text>
          </View>
          <View style={styles.salonInfo}>
            <Text style={styles.salonName}>{salon?.name || "Salon"}</Text>
            <Text style={styles.location}>
              📍 {salon?.address || "Unavailable Address"}
            </Text>
            <View style={styles.ratingRow}>
              <Text style={styles.rating}>★ 4.8</Text>
              <Text style={styles.reviews}>120 reviews</Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Appointment Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.serviceHeaderRow}>
            <Text style={styles.label}>Services</Text>
            <Text style={styles.label}>Price</Text>
          </View>
          {services.map((service, index) => (
            <View key={service.id}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceIcon}>{service.icon || "💇"}</Text>
                  <View>
                    <Text style={styles.value}>{service.name}</Text>
                    <Text style={styles.duration}>{service.duration} min</Text>
                  </View>
                </View>
                <Text style={styles.price}>₹{service.price}</Text>
              </View>
              {index < services.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{formattedDate}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>{time || "-"}</Text>
            </View>
          </View>
          {!!staffName && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.label}>Staff</Text>
                  <Text style={styles.value}>{staffName}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        <Text style={styles.sectionTitle}>Salon Bill</Text>
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Amount</Text>
            <Text style={styles.priceValue}>₹{serviceTotal.toFixed(2)}</Text>
          </View>
          {offers.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.offerSectionTitle}>Offers & Coupons</Text>
              {(() => {
                const bestOffer =
                  selectedOffer ||
                  offers.find((offer, index) => {
                    const title = offer.title.toLowerCase();
                    const minAmount = title.includes("haircut")
                      ? 500
                      : title.includes("facial")
                        ? 300
                        : title.includes("color")
                          ? 200
                          : ([500, 300, 200][index] ?? 250);
                    return offer.isActive && serviceTotal >= minAmount;
                  });
                if (!bestOffer) {
                  return (
                    <View style={styles.noEligibleOfferCard}>
                      <Text style={styles.noEligibleOfferText}>
                        No coupon is applicable to this booking.
                      </Text>
                    </View>
                  );
                }
                return (
                  <View style={styles.offerCard}>
                    <View style={styles.offerLeft}>
                      <View style={styles.offerDiscountBox}>
                        <Text style={styles.offerDiscount}>
                          {bestOffer.discount}%
                        </Text>
                        <Text style={styles.offerOff}>OFF</Text>
                      </View>
                      <View style={styles.offerInfo}>
                        <View style={styles.offerTitleRow}>
                          <Text style={styles.offerTitle}>
                            {bestOffer.title}
                          </Text>
                          <View style={styles.bestOfferBadge}>
                            <Text style={styles.bestOfferText}>BEST</Text>
                          </View>
                        </View>
                        {!!bestOffer.description && (
                          <Text style={styles.offerDescription}>
                            {bestOffer.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })()}
              <TouchableOpacity
                style={styles.viewAllCouponsButton}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/salon/coupons",
                    params: {
                      salonId: salonId || "",
                      serviceIds: serviceIds || "",
                      date: date || "",
                      time: time || "",
                      staffId: staffId || "",
                      staffName: staffName || "",
                      offerId: selectedOfferId ? String(selectedOfferId) : "",
                    },
                  } as any)
                }
              >
                <Text style={styles.viewAllCouponsText}>View all coupons</Text>
                <Text style={styles.viewAllCouponsArrow}>›</Text>
              </TouchableOpacity>
            </>
          )}
          {selectedOffer && (
            <View style={styles.discountRow}>
              <Text style={styles.priceLabel}>Coupon Discount</Text>
              <Text style={styles.discountValue}>
                -₹{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Salon Payable</Text>
            <Text style={styles.totalValue}>₹{salonPayable.toFixed(2)}</Text>
          </View>
          <Text style={styles.salonBillNote}>
            This amount will be paid at the salon.
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Booking Fee</Text>
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Booking Fee</Text>
            <Text style={styles.priceValue}>₹{bookingFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Pay Now</Text>
            <Text style={styles.totalValue}>₹{bookingFee}</Text>
          </View>
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>ℹ</Text>
          <Text style={styles.noteText}>
            You only need to pay the booking fee now. The service amount will be
            paid at the salon.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.paymentButton}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/booking/payment",
              params: {
                salonId: salonId || "",
                serviceIds: serviceIds || "",
                date: date || "",
                time: time || "",
                staffId: staffId || "",
                staffName: staffName || "",
                bookingFee: String(bookingFee),
                discountAmount: String(discountAmount),
              },
            } as any)
          }
        >
          <Text style={styles.paymentButtonText}>
            Pay ₹{bookingFee} Booking Fee
          </Text>
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#777",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  backText: {
    fontSize: 30,
    color: "#5B3CC4",
    lineHeight: 32,
    marginTop: -3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 6,
    marginBottom: 20,
  },
  salonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 24,
  },
  salonIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  salonEmoji: {
    fontSize: 26,
  },
  salonInfo: {
    marginLeft: 13,
    flex: 1,
  },
  salonName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  location: {
    fontSize: 11,
    color: "#777",
    marginTop: 5,
    fontWeight: "500",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  rating: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  reviews: {
    fontSize: 10,
    color: "#888",
    marginLeft: 7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 24,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  serviceIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  duration: {
    fontSize: 10,
    color: "#888",
    marginTop: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 42,
  },
  label: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 8,
  },
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  priceLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  offerSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
    marginBottom: 10,
  },
  offerCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: 14,
    padding: 11,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
  },
  selectedOfferCard: {
    borderColor: "#5B3CC4",
    backgroundColor: "#FAF8FF",
  },
  offerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  offerDiscountBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  offerDiscount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  offerOff: {
    fontSize: 8,
    fontWeight: "700",
    color: "#7A6BC4",
  },
  offerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  offerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
  },
  offerDescription: {
    marginTop: 3,
    fontSize: 10,
    color: "#777",
  },
  bestOfferBadge: {
    backgroundColor: "#EDE6FF",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 5,
  },
  bestOfferText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  offerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#C8C5D0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },
  noEligibleOfferCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EEEEF2",
    marginBottom: 8,
  },
  noEligibleOfferText: {
    fontSize: 11,
    color: "#888",
    textAlign: "center",
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  discountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
  },
  selectedOfferRadio: {
    borderColor: "#5B3CC4",
  },
  offerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5B3CC4",
  },
  viewAllCouponsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    paddingVertical: 10,
  },
  viewAllCouponsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  viewAllCouponsArrow: {
    fontSize: 21,
    color: "#5B3CC4",
    marginLeft: 4,
    marginTop: -2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 3,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  totalValue: {
    fontSize: 21,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  salonBillNote: {
    fontSize: 11,
    color: "#888",
    marginTop: 10,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F6FF",
    borderWidth: 1,
    borderColor: "#E5DEFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  noteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: "#666",
    lineHeight: 17,
  },
  paymentButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  paymentButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
