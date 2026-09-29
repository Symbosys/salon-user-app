import { useFocusEffect, useRouter } from "expo-router";
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

import { API_URL } from "@/constants/api";
import { SafeAreaView } from "react-native-safe-area-context";

type Offer = {
  id: number;
  salonId: number;
  title: string;
  description: string;
  discount: number;
  isActive: boolean;
  salon: {
    id: number;
    name: string;
    address: string;
    city: string;
  };
};

export default function OffersScreen() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/offers`);

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to fetch offers");
      }

      setOffers(data);
    } catch (error) {
      console.log("Fetch Offers Error:", error);

      setOffers([]);

      Alert.alert("Error", "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Offers & Coupons</Text>

          <View style={styles.headerSpace} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.title}>Exclusive Offers 🎉</Text>

          <Text style={styles.subtitle}>
            Save more on your salon bookings with these special offers.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#5B3CC4" />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎁</Text>

            <Text style={styles.emptyTitle}>No offers available</Text>

            <Text style={styles.emptyText}>
              There are no active offers right now.
            </Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerTop}>
                <View style={styles.discountBox}>
                  <Text style={styles.discountText}>{offer.discount}% OFF</Text>

                  <Text style={styles.offText}>OFFER</Text>
                </View>

                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>

                  <Text style={styles.offerDescription}>
                    {offer.description}
                  </Text>

                  <Text style={styles.salonName}>
                    {offer.salon?.name || "Salon"}
                  </Text>

                  <Text style={styles.salonLocation}>
                    {offer.salon?.city || ""}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.bottomRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Offer</Text>

                  <Text style={styles.code}>{offer.discount}% OFF</Text>
                </View>

                <TouchableOpacity
                  style={styles.applyButton}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/salon/${offer.salonId}` as any)}
                >
                  <Text style={styles.applyText}>Use Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 25 }} />
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

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 32,
    color: "#222222",
    lineHeight: 34,
    marginTop: -3,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222222",
  },

  headerSpace: {
    width: 40,
  },

  intro: {
    marginTop: 15,
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    lineHeight: 20,
  },

  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#777777",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
  },

  offerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,

    elevation: 3,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  offerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  discountBox: {
    width: 100,
    height: 78,
    borderRadius: 14,
    backgroundColor: "#F0ECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  discountText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  offText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7A6BC4",
    marginTop: 3,
  },

  offerInfo: {
    flex: 1,
  },

  offerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 5,
  },

  offerDescription: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 18,
  },

  salonName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B3CC4",
    marginTop: 8,
  },

  salonLocation: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 15,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  codeBox: {
    flex: 1,
  },

  codeLabel: {
    fontSize: 11,
    color: "#999999",
    marginBottom: 2,
  },

  code: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333333",
  },

  applyButton: {
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },

  applyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
