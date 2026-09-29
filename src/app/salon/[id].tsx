import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SalonDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [isFavorite, setIsFavorite] = useState(false);
  const [salon, setSalon] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalonDetails = useCallback(async () => {
    try {
      setLoading(true);

      const salonId = String(id);
      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        setIsFavorite(false);
      }

      const [
        salonsResponse,
        servicesResponse,
        staffResponse,
        favoriteResponse,
        offersResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/salons`),
        fetch(`${API_URL}/api/services/${salonId}`),
        fetch(`${API_URL}/api/staff/${salonId}`),
        fetch(`${API_URL}/api/favorites/${customerId}`),
        fetch(`${API_URL}/api/offers/${salonId}`),
      ]);

      const salonsData = await salonsResponse.json();
      const servicesData = await servicesResponse.json();
      const staffData = await staffResponse.json();
      const offersData = await offersResponse.json();

      if (favoriteResponse.ok) {
        const favoritesData = await favoriteResponse.json();

        const alreadyFavorite = favoritesData.some(
          (item: any) => String(item.salonId) === salonId,
        );

        setIsFavorite(alreadyFavorite);
      }

      if (!salonsResponse.ok) {
        throw new Error(salonsData?.message || "Failed to fetch salon details");
      }

      if (!servicesResponse.ok) {
        throw new Error(servicesData?.message || "Failed to fetch services");
      }

      if (!staffResponse.ok) {
        throw new Error(staffData?.message || "Failed to fetch staff");
      }

      if (!Array.isArray(salonsData)) {
        throw new Error("Invalid salon response");
      }

      const selectedSalon = salonsData.find(
        (item: any) => String(item.id) === salonId,
      );

      if (!selectedSalon) {
        throw new Error("Salon not found");
      }

      setSalon({
        ...selectedSalon,
        rating: Number(selectedSalon.rating) || 0,
        reviewCount: Number(selectedSalon.reviewCount) || 0,
        image: selectedSalon.image || null,
        location:
          selectedSalon.address ||
          [selectedSalon.city, selectedSalon.state].filter(Boolean).join(", "),
      });

      setServices(
        Array.isArray(servicesData)
          ? servicesData
              .filter((service: any) => service.isActive === true)
              .map((service: any) => ({
                id: service.id,
                name: service.name,
                duration: `${service.duration} min`,
                price: `₹${service.price}`,
                icon: service.icon || "💇",
              }))
          : [],
      );

      setStaffMembers(
        Array.isArray(staffData)
          ? staffData
              .filter(
                (staff: any) =>
                  String(staff.status || "").toUpperCase() === "AVAILABLE",
              )
              .map((staff: any) => ({
                id: staff.id,
                name: staff.name,
                role: staff.role,
              }))
          : [],
      );

      setOffers(
        Array.isArray(offersData)
          ? offersData.filter((offer: any) => offer.isActive === true)
          : [],
      );
    } catch (error) {
      console.log("Fetch Salon Details Error:", error);
      setSalon(null);
      setServices([]);
      setStaffMembers([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleFavorite = async () => {
    console.log("FAVORITE BUTTON PRESSED");

    try {
      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        return;
      }
      const salonId = Number(id);

      console.log("userId:", customerId);
      console.log("salonId:", salonId);

      if (isFavorite) {
        console.log("REMOVING FAVORITE");

        const response = await fetch(
          `${API_URL}/api/favorites/${customerId}/${salonId}`,
          {
            method: "DELETE",
          },
        );

        console.log("DELETE STATUS:", response.status);
        console.log("DELETE RESPONSE:", await response.text());

        if (response.ok) {
          setIsFavorite(false);
        }
      } else {
        console.log("ADDING FAVORITE");

        const response = await fetch(`${API_URL}/api/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: Number(customerId),
            salonId,
          }),
        });

        console.log("POST STATUS:", response.status);
        console.log("POST RESPONSE:", await response.text());

        if (response.ok) {
          setIsFavorite(true);
        }
      }
    } catch (error) {
      console.log("FAVORITE ERROR:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchSalonDetails();
      }
    }, [id, fetchSalonDetails]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading salon...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!salon) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Salon not found</Text>

          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* IMAGE HEADER */}
      <View style={styles.imageContainer}>
        {salon.image ? (
          <Image
            source={{
              uri: salon.image,
            }}
            style={styles.salonMainImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Pressable style={styles.favoriteButton} onPress={handleFavorite}>
          <Text style={styles.favoriteText}>{isFavorite ? "♥" : "♡"}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.salonName}>{salon.name}</Text>
            <Text style={styles.location}>📍 {salon.location}</Text>
          </View>

          <View style={styles.ratingBox}>
            <Text style={styles.rating}>★ {salon.rating}</Text>
          </View>
        </View>

        <Text style={styles.reviews}>{salon.reviewCount} reviews</Text>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <Text style={styles.description}>
            {salon.description ||
              `${salon.name} provides professional beauty and grooming services. Choose your preferred service and book an available time slot.`}
          </Text>
        </View>

        {/* OFFERS */}
        {offers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Offers</Text>

              <Text style={styles.serviceCount}>{offers.length} offers</Text>
            </View>

            {/* Show only first offer */}
            <View style={styles.offerCard}>
              <View style={styles.offerDiscountBox}>
                <Text style={styles.offerDiscount}>{offers[0].discount}%</Text>

                <Text style={styles.offerOff}>OFF</Text>
              </View>

              <View style={styles.offerInfo}>
                <Text style={styles.offerTitle}>{offers[0].title}</Text>

                <Text style={styles.offerDescription}>
                  {offers[0].description}
                </Text>
              </View>
            </View>

            {/* View All Coupons */}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/salon/coupons",
                  params: {
                    salonId: String(salon.id),
                  },
                } as any)
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                marginTop: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#5B3CC4",
                }}
              >
                View all coupons
              </Text>

              <Text
                style={{
                  fontSize: 21,
                  color: "#5B3CC4",
                  marginLeft: 4,
                  marginTop: -2,
                }}
              >
                ›
              </Text>
            </Pressable>
          </View>
        )}

        {/* SERVICES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>

            <Text style={styles.serviceCount}>{services.length} services</Text>
          </View>

          {services.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No services available</Text>
            </View>
          ) : (
            services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceEmoji}>{service.icon}</Text>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>

                  <Text style={styles.duration}>{service.duration}</Text>
                </View>

                <Text style={styles.servicePrice}>{service.price}</Text>
              </View>
            ))
          )}
        </View>

        {/* AVAILABLE STAFF */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Staff</Text>

            <Text style={styles.serviceCount}>{staffMembers.length} staff</Text>
          </View>

          {staffMembers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No staff available</Text>
            </View>
          ) : (
            staffMembers.map((staff) => (
              <View key={staff.id} style={styles.staffCard}>
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffAvatarText}>
                    {staff.name.charAt(0)}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staff.name}</Text>

                  <Text style={styles.staffRole}>{staff.role}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* BOOK BUTTON */}
        <Pressable
          style={styles.bookButton}
          onPress={() =>
            router.push(`/booking/service?salonId=${salon.id}` as any)
          }
        >
          <Text style={styles.bookButtonText}>Select Service</Text>
        </Pressable>

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

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
  },

  errorButton: {
    marginTop: 18,
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
  },

  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  imageContainer: {
    height: 270,
    position: "relative",
    backgroundColor: "#E7E1F2",
  },

  salonMainImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F1F8",
  },

  imagePlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A8499",
  },

  staffCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  staffAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  staffInfo: {
    marginLeft: 13,
  },

  staffName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  staffRole: {
    marginTop: 5,
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  backButton: {
    position: "absolute",
    left: 18,
    top: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 100,
  },

  backText: {
    fontSize: 34,
    lineHeight: 38,
    color: "#222",
    marginTop: -5,
  },

  favoriteButton: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 100,
  },

  favoriteText: {
    fontSize: 27,
    color: "#222",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  titleContainer: {
    flex: 1,
  },

  salonName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#191522",
  },

  location: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  ratingBox: {
    backgroundColor: "#FFF4D6",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  rating: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A6A00",
  },

  reviews: {
    marginTop: 6,
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#191522",
  },

  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 21,
    color: "#666",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  serviceCount: {
    fontSize: 12,
    color: "#777",
  },

  /* OFFERS */

  offerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  offerDiscountBox: {
    width: 65,
    height: 65,
    borderRadius: 14,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  offerDiscount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  offerOff: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7A6BC4",
    marginTop: 2,
  },

  offerInfo: {
    flex: 1,
    marginLeft: 13,
  },

  offerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  offerDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },

  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceEmoji: {
    fontSize: 22,
  },

  serviceInfo: {
    flex: 1,
    marginLeft: 13,
  },

  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  duration: {
    marginTop: 5,
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  servicePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B3CC4",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
  },

  emptyText: {
    fontSize: 12,
    color: "#888",
  },

  bookButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
