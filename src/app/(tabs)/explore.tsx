import { API_URL } from "@/constants/api";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
export default function ExploreScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [salons, setSalons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchSalons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/salons`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to fetch salons");
      }
      const formattedSalons = data.map((salon: any) => {
        const salonServices = Array.isArray(salon.services)
          ? salon.services
              .filter((service: any) => service.isActive === true)
              .map((service: any) => service.name)
              .filter(Boolean)
          : [];
        const prices = Array.isArray(salon.services)
          ? salon.services
              .map((service: any) => Number(service.price))
              .filter((price: number) => Number.isFinite(price) && price >= 0)
          : [];
        const startingPrice =
          prices.length > 0 ? `₹${Math.min(...prices)}` : "";
        return {
          id: salon.id,
          name: salon.name,
          category: salon.category || "",
          services: salonServices,
          location: salon.address || salon.city || "",
          rating: Number(salon.rating) || 0,
          reviews: Number(salon.reviewCount) || 0,
          price: startingPrice,
          image: salon.image || null,
          isLive: salon.isLive === true,
          liveOffCount: Number(salon.liveOffCount) || 0,
        };
      });
      const uniqueServices = new Map<string, any>();
      data.forEach((salon: any) => {
        if (!Array.isArray(salon.services)) return;
        salon.services.forEach((service: any) => {
          if (!service?.name) return;
          if (service.isActive !== true) return;
          const name = String(service.name).trim();
          if (!uniqueServices.has(name)) {
            uniqueServices.set(name, {
              id: service.id ?? name,
              name,
              icon: service.icon || "💇",
            });
          }
        });
      });
      setServices(Array.from(uniqueServices.values()));
      setSalons(formattedSalons);
    } catch (error) {
      console.log("Fetch Salons Error:", error);
      setSalons([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to fetch categories");
      }
      const formattedCategories = data.map((category: any) => ({
        id: category.id,
        name: category.name,
        icon: category.icon || "💇",
      }));
      setCategories(formattedCategories);
    } catch (error) {
      console.log("Fetch Categories Error:", error);
      setCategories([]);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      fetchSalons();
      fetchCategories();
    }, [fetchSalons, fetchCategories]),
  );
  const filteredSalons = salons.filter((salon) => {
    const search = searchText.toLowerCase().trim();
    const matchesSearch =
      salon.name.toLowerCase().includes(search) ||
      salon.category.toLowerCase().includes(search) ||
      salon.location.toLowerCase().includes(search) ||
      salon.services.some((service: string) =>
        service.toLowerCase().includes(search),
      );
    const matchesCategory =
      selectedCategory === null || salon.category === selectedCategory;
    const matchesService =
      selectedServices.length === 0 ||
      selectedServices.every((selectedService) =>
        salon.services.includes(selectedService),
      );
    return matchesSearch && matchesCategory && matchesService;
  });
  const sortedSalons = [...filteredSalons].sort(
    (a, b) => a.liveOffCount - b.liveOffCount,
  );
  const handleServicePress = (serviceName: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceName)) {
        return prev.filter((service) => service !== serviceName);
      }
      return [...prev, serviceName];
    });
  };
  const handleCategoryPress = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };
  const clearFilters = () => {
    setSelectedServices([]);
    setSelectedCategory(null);
    setSearchText("");
  };
  const hasActiveFilter =
    selectedServices.length > 0 || selectedCategory !== null;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Find the perfect salon for you</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search salons or services"
            placeholderTextColor="#999"
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              activeOpacity={0.7}
            >
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Services</Text>
            <Text style={styles.sectionSubtitle}>
              What are you looking for?
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesList}
        >
          {services.map((service) => {
            const isSelected = selectedServices.includes(service.name);
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  isSelected && styles.selectedServiceCard,
                ]}
                activeOpacity={0.8}
                onPress={() => handleServicePress(service.name)}
              >
                <View
                  style={[
                    styles.serviceIconBox,
                    isSelected && styles.selectedServiceIconBox,
                  ]}
                >
                  <Text style={styles.serviceEmoji}>{service.icon}</Text>
                  {isSelected && (
                    <View style={styles.serviceCheck}>
                      <Text style={styles.serviceCheckText}>✓</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.serviceName,
                    isSelected && styles.selectedServiceName,
                  ]}
                  numberOfLines={1}
                >
                  {service.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Text style={styles.sectionSubtitle}>Choose your salon type</Text>
          </View>
        </View>
        <View style={styles.categoriesRow}>
          {categories.map((category) => {
            const isSelected = selectedCategory === category.name;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.selectedCategoryCard,
                ]}
                activeOpacity={0.8}
                onPress={() => handleCategoryPress(category.name)}
              >
                <View
                  style={[
                    styles.categoryIconBox,
                    isSelected && styles.selectedCategoryIconBox,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    isSelected && styles.selectedCategoryName,
                  ]}
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
                {isSelected && (
                  <View style={styles.selectedCheck}>
                    <Text style={styles.selectedCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.nearbyHeader}>
          <View style={styles.nearbyTitleRow}>
            <Text style={styles.nearbyTitle}>
              {selectedServices.length > 0 || selectedCategory
                ? "Filtered Salons"
                : "Popular Salons"}
            </Text>
            <Text style={styles.count}>{filteredSalons.length} salons</Text>
          </View>
          {hasActiveFilter && (
            <TouchableOpacity
              style={styles.clearFilterSmall}
              activeOpacity={0.8}
              onPress={clearFilters}
            >
              <Text style={styles.clearFilterSmallText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#5B3CC4" />
            <Text style={styles.loadingText}>Finding salons...</Text>
          </View>
        ) : filteredSalons.length === 0 ? (
          <View style={styles.noResultBox}>
            <View style={styles.noResultIcon}>
              <Text>🔍</Text>
            </View>
            <Text style={styles.noResultTitle}>No salons found</Text>
            <Text style={styles.noResultText}>No matching salon found.</Text>
            {hasActiveFilter || searchText.length > 0 ? (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={clearFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          sortedSalons.map((salon) => (
            <TouchableOpacity
              key={salon.id}
              disabled={!salon.isLive}
              activeOpacity={0.8}
              onPress={() => {
                if (!salon.isLive) return;
                router.push(`/salon/${salon.id}`);
              }}
              style={[
                styles.salonCard,
                !salon.isLive && styles.closedSalonCard,
              ]}
            >
              <View style={styles.salonImageContainer}>
                {salon.image ? (
                  <Image
                    source={{ uri: salon.image }}
                    style={styles.salonImage}
                  />
                ) : (
                  <View style={styles.salonImagePlaceholder}>
                    <Text style={styles.salonImagePlaceholderText}>
                      No Image
                    </Text>
                  </View>
                )}
                <View style={styles.salonCategoryBadge}>
                  <Text style={styles.salonCategoryText}>{salon.category}</Text>
                </View>
              </View>
              <View style={styles.salonInfo}>
                <View style={styles.salonTitleRow}>
                  <Text style={styles.salonName} numberOfLines={1}>
                    {salon.name}
                  </Text>
                  <View style={styles.ratingBox}>
                    <Text style={styles.ratingStar}>★</Text>
                    <Text style={styles.ratingText}>{salon.rating}</Text>
                  </View>
                </View>
                <Text style={styles.salonLocation}>📍 {salon.location}</Text>
                <Text style={styles.salonReviews}>{salon.reviews} reviews</Text>
                <View style={styles.salonBottomRow}>
                  <View>
                    <Text style={styles.startingLabel}>Starting from</Text>
                    <Text style={styles.startingPrice}>
                      {salon.price || "-"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={!salon.isLive}
                    style={[
                      styles.bookButton,
                      !salon.isLive && styles.closedBookButton,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (!salon.isLive) return;
                      router.push(`/salon/${salon.id}` as any);
                    }}
                  >
                    <Text style={styles.bookButtonText}>
                      {salon.isLive ? "Book Now" : "CLOSED"}
                    </Text>
                    {salon.isLive && <Text style={styles.bookArrow}>→</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 35 }} />
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
    paddingBottom: 15,
    backgroundColor: "#F8F7FC",
    zIndex: 10,
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
  searchBox: {
    marginTop: 14,
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#222",
  },
  clearSearch: {
    fontSize: 15,
    color: "#999",
    paddingLeft: 8,
  },
  content: {
    paddingBottom: 30,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#191522",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#8A8792",
    fontWeight: "500",
  },
  servicesList: {
    gap: 10,
    paddingHorizontal: 20,
    paddingRight: 28,
  },
  serviceCard: {
    width: 82,
    alignItems: "center",
    paddingVertical: 2,
  },
  selectedServiceCard: {
    transform: [{ scale: 1.03 }],
  },
  serviceIconBox: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  selectedServiceIconBox: {
    backgroundColor: "#EEE8FF",
    borderWidth: 1.5,
    borderColor: "#5B3CC4",
  },
  serviceEmoji: {
    fontSize: 26,
  },
  serviceName: {
    marginTop: 8,
    fontSize: 11,
    color: "#44404B",
    textAlign: "center",
    fontWeight: "600",
    width: 82,
  },
  selectedServiceName: {
    color: "#5B3CC4",
    fontWeight: "800",
  },
  serviceCheck: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#5B3CC4",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceCheckText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  categoryCard: {
    flex: 1,
    height: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0EEF5",
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  selectedCategoryCard: {
    backgroundColor: "#F1EDFF",
    borderColor: "#5B3CC4",
    borderWidth: 1.5,
  },
  categoryIconBox: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: "#F8F7FC",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCategoryIconBox: {
    backgroundColor: "#E3DBFF",
  },
  categoryEmoji: {
    fontSize: 26,
  },
  categoryName: {
    marginTop: 7,
    fontSize: 10.5,
    color: "#46414E",
    textAlign: "center",
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  selectedCategoryName: {
    color: "#5B3CC4",
    fontWeight: "800",
  },
  selectedCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#5B3CC4",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCheckText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  nearbyHeader: {
    marginTop: 26,
    marginHorizontal: 20,
    marginBottom: 13,
  },
  nearbyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nearbyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#191522",
  },
  count: {
    fontSize: 12,
    color: "#888",
  },
  clearFilterSmall: {
    position: "absolute",
    right: 0,
    top: 30,
    backgroundColor: "#EEE8FF",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
  },
  clearFilterSmallText: {
    color: "#5B3CC4",
    fontSize: 11,
    fontWeight: "800",
  },
  loadingBox: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 9,
    fontSize: 12,
    color: "#777",
  },
  salonCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  salonImageContainer: {
    position: "relative",
  },
  salonImage: {
    width: "100%",
    height: 180,
  },
  salonImagePlaceholder: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F1F8",
  },
  salonImagePlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A8499",
  },
  salonCategoryBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  salonCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  salonInfo: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  salonTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salonName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginRight: 10,
  },
  ratingBox: {
    backgroundColor: "#FFF7E6",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingStar: {
    fontSize: 11,
    color: "#E19A00",
    marginRight: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8A6100",
  },
  salonLocation: {
    marginTop: 8,
    fontSize: 12,
    color: "#66616E",
    fontWeight: "500",
  },
  salonReviews: {
    marginTop: 4,
    fontSize: 11,
    color: "#99949F",
    fontWeight: "500",
  },
  salonBottomRow: {
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  startingLabel: {
    fontSize: 10,
    color: "#99949F",
    marginBottom: 2,
  },
  startingPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  bookButton: {
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  bookArrow: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },
  noResultBox: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 15,
  },
  noResultIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1EDFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  noResultTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#333",
  },
  noResultText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  clearFilterButton: {
    marginTop: 14,
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
  },
  clearFilterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  closedSalonCard: {
    backgroundColor: "#E5E7EB",
    opacity: 0.65,
  },
  closedBookButton: {
    backgroundColor: "#DC2626",
  },
});
