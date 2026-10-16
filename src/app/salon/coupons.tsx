import { API_URL } from "@/constants/api";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type Offer = {
  id: number;
  title: string;
  description?: string;
  discount: number;
  isActive: boolean;
};
type Salon = {
  id: number;
  name: string;
};
export default function CouponsScreen() {
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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      if (!salonId) {
        setOffers([]);
        return;
      }
      const [offerResponse, salonResponse, serviceResponse] = await Promise.all(
        [
          fetch(`${API_URL}/api/offers/${salonId}`),
          fetch(`${API_URL}/api/salons`),
          fetch(`${API_URL}/api/services/${salonId}`),
        ],
      );
      const offerData = await offerResponse.json();
      const salonData = await salonResponse.json();
      const serviceData = await serviceResponse.json();
      const selectedIds = serviceIds
        ? serviceIds.split(",").filter(Boolean).map(Number)
        : [];
      const total = Array.isArray(serviceData)
        ? serviceData
            .filter((service: any) => selectedIds.includes(Number(service.id)))
            .reduce(
              (sum: number, service: any) => sum + Number(service.price || 0),
              0,
            )
        : 0;
      setServiceTotal(total);
      if (Array.isArray(offerData)) {
        const salonOffers = offerData.sort(
          (a: Offer, b: Offer) => Number(b.discount) - Number(a.discount),
        );
        setOffers(salonOffers);
      } else {
        setOffers([]);
      }
      if (Array.isArray(salonData)) {
        const selectedSalon = salonData.find(
          (item: Salon) => Number(item.id) === Number(salonId),
        );
        if (selectedSalon) {
          setSalon(selectedSalon);
        }
      }
    } catch (error) {
      console.error("Coupons Error:", error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [salonId]);
  useFocusEffect(
    useCallback(() => {
      loadOffers();
    }, [loadOffers]),
  );
  const getMinAmount = (offer: Offer, index: number) => {
    const title = offer.title.toLowerCase();
    if (title.includes("haircut")) return 500;
    if (title.includes("facial")) return 300;
    if (title.includes("color")) return 200;
    return [500, 300, 200][index] ?? 250;
  };
  const isOfferValid = (offer: Offer, index: number) => {
    return (
      offer.isActive === true && serviceTotal >= getMinAmount(offer, index)
    );
  };
  const handleApply = (offer: Offer, index: number) => {
    if (!isOfferValid(offer, index)) return;
    router.replace({
      pathname: "/booking/summary",
      params: {
        salonId: salonId || "",
        serviceIds: serviceIds || "",
        date: date || "",
        time: time || "",
        staffId: staffId || "",
        staffName: staffName || "",
        offerId: String(offer.id),
      },
    } as any);
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading coupons...</Text>
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
        <Text style={styles.title}>Coupons & Offers</Text>
        <Text style={styles.subtitle}>
          {salon?.name || "Salon"} offers available for you
        </Text>
        {offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No offers available</Text>
            <Text style={styles.emptyText}>
              This salon currently has no offers.
            </Text>
          </View>
        ) : (
          offers.map((offer, index) => {
            const isValid = isOfferValid(offer, index);
            const isApplied = Number(offerId) === Number(offer.id);
            return (
              <View
                key={offer.id}
                style={[styles.offerCard, !isValid && styles.disabledCard]}
              >
                <View style={styles.offerMainRow}>
                  <View style={styles.offerDiscountBox}>
                    <Text
                      style={[
                        styles.offerDiscount,
                        !isValid && styles.disabledText,
                      ]}
                    >
                      {offer.discount}%
                    </Text>
                    <Text
                      style={[styles.offerOff, !isValid && styles.disabledText]}
                    >
                      OFF
                    </Text>
                  </View>
                  <View style={styles.offerInfo}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.offerTitle,
                          !isValid && styles.disabledText,
                        ]}
                        numberOfLines={2}
                      >
                        {offer.title}
                      </Text>
                      {index === 0 && isValid && (
                        <View style={styles.bestBadge}>
                          <Text style={styles.bestBadgeText}>BEST</Text>
                        </View>
                      )}
                    </View>
                    {!!offer.description && (
                      <Text
                        style={[
                          styles.description,
                          !isValid && styles.disabledText,
                        ]}
                        numberOfLines={2}
                      >
                        {offer.description}
                      </Text>
                    )}
                    {!isValid && (
                      <Text style={styles.invalidText}>Not available</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      !isValid && styles.applyButtonDisabled,
                      isApplied && styles.applyButtonApplied,
                    ]}
                    activeOpacity={0.8}
                    disabled={!isValid}
                    onPress={() => handleApply(offer, index)}
                  >
                    <Text
                      style={[
                        styles.applyButtonText,
                        !isValid && styles.applyButtonTextDisabled,
                        isApplied && styles.applyButtonTextApplied,
                      ]}
                    >
                      {isApplied ? "APPLIED" : "APPLY"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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

  applyButtonTextApplied: {
    color: "#FFFFFF",
  },
  offerCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEF2",
  },
  disabledCard: {
    opacity: 0.65,
  },
  offerMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerDiscountBox: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  offerDiscount: {
    fontSize: 17,
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
    marginLeft: 12,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  offerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#222",
  },
  bestBadge: {
    backgroundColor: "#EDE6FF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 6,
  },
  bestBadgeText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  description: {
    marginTop: 5,
    fontSize: 11,
    color: "#777",
    lineHeight: 16,
  },
  conditionText: {
    marginTop: 5,
    fontSize: 10,
    color: "#777",
    fontWeight: "600",
  },
  invalidText: {
    color: "#999",
  },
  disabledText: {
    color: "#999",
  },
  applyButton: {
    minWidth: 78,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  applyButtonDisabled: {
    borderColor: "#BDBDBD",
    backgroundColor: "#F1F1F1",
  },
  applyButtonApplied: {
    backgroundColor: "#5B3CC4",
  },
  applyButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  applyButtonTextDisabled: {
    color: "#999",
  },
  emptyCard: {
    backgroundColor: "#FAFAFC",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEEEF2",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  emptyText: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
    textAlign: "center",
  },
});
