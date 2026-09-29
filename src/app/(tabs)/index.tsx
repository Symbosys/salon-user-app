import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Constants from "expo-constants";
import { WebView } from "react-native-webview";

import { SafeAreaView } from "react-native-safe-area-context";

// ============================================================
// API
// ============================================================

import { API_URL } from "@/constants/api";
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsWebApiKey || "";

console.log("GOOGLE MAPS KEY AVAILABLE:", GOOGLE_MAPS_API_KEY.length > 0);

// ============================================================
// UI ICONS
// Names/data come from backend.
// These maps are only for displaying an icon.
// ============================================================

const categoryIcons: Record<string, string> = {
  "Men's Salon": "💇‍♂️",
  "Beauty Parlor": "💄",
  "Unisex Salon": "👫",
};

// ============================================================
// DISTANCE CALCULATION
// ============================================================

const calculateDistance = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const earthRadius = 6371;

  const latDifference = ((latitude2 - latitude1) * Math.PI) / 180;

  const longitudeDifference = ((longitude2 - longitude1) * Math.PI) / 180;

  const a =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos((latitude1 * Math.PI) / 180) *
      Math.cos((latitude2 * Math.PI) / 180) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

// ============================================================
// HOME
// ============================================================

export default function HomeScreen() {
  const router = useRouter();

  // ==========================================================
  // BASIC STATES
  // ==========================================================

  const [searchText, setSearchText] = useState("");

  const [locationName, setLocationName] = useState("Select Location");

  const [userLatitude, setUserLatitude] = useState<number | null>(null);

  const [userLongitude, setUserLongitude] = useState<number | null>(null);

  const [loadingNearby, setLoadingNearby] = useState(true);
  const [salons, setSalons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // ==========================================================
  // FILTER STATES
  // ==========================================================

  const [selectedService, setSelectedService] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ==========================================================
  // LOCATION MODAL
  // ==========================================================

  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const [loadingLocation, setLoadingLocation] = useState(false);

  const [locationError, setLocationError] = useState("");

  const locationWebViewRef = useRef<WebView>(null);

  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(
    null,
  );
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedPincode, setSelectedPincode] = useState("");

  const [locationSearch, setLocationSearch] = useState("");

  const [locationSearchResults, setLocationSearchResults] = useState<
    { description: string; placeId: string }[]
  >([]);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, []),
  );

  // ==========================================================
  // LOAD SALONS FROM BACKEND
  // ==========================================================

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const response = await fetch(`${API_URL}/api/salons`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch salons");
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid salon response");
        }

        const formattedSalons = data
          .filter((salon: any) => salon.isLive === true)
          .map((salon: any) => {
            const salonServices = Array.isArray(salon.services)
              ? salon.services
                  .map((service: any) => service.name)
                  .filter(Boolean)
              : [];

            const prices = Array.isArray(salon.services)
              ? salon.services
                  .map((service: any) => Number(service.price))
                  .filter(
                    (price: number) => Number.isFinite(price) && price >= 0,
                  )
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
              latitude: Number(salon.latitude),
              longitude: Number(salon.longitude),
              image: salon.image || null,
            };
          });

        // Services are taken from the services saved in the backend.
        const uniqueServices = new Map<string, any>();

        data.forEach((salon: any) => {
          if (!Array.isArray(salon.services)) return;

          salon.services.forEach((service: any) => {
            if (!service?.name) return;

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

        // Services come from salon services in the backend.
        setServices(Array.from(uniqueServices.values()));

        // Salons list always comes from /api/salons.
        setSalons(formattedSalons);
      } catch (error) {
        console.log("Fetch Salons Error:", error);
        setSalons([]);
      } finally {
        setLoadingNearby(false);
      }
    };

    fetchSalons();
  }, [refreshKey]);

  // ==========================================================
  // LOAD CATEGORIES FROM BACKEND
  // ==========================================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}/api/categories`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch categories");
        }

        if (!Array.isArray(data)) {
          throw new Error("Invalid category response");
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
    };

    fetchCategories();
  }, [refreshKey]);

  // ==========================================================
  // LOAD SAVED LOCATION
  // ==========================================================

  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const savedLocation = await AsyncStorage.getItem("userLocation");

        if (!savedLocation) {
          setLoadingNearby(false);
          return;
        }

        const location = JSON.parse(savedLocation);

        if (location.address) {
          setLocationName(location.address);
        } else if (location.locality) {
          setLocationName(location.locality);
        } else if (location.city) {
          setLocationName(location.city);
        }

        if (
          typeof location.latitude === "number" &&
          typeof location.longitude === "number"
        ) {
          setUserLatitude(location.latitude);
          setUserLongitude(location.longitude);
        } else {
          // --------------------------------------------------
          // If manual location has no coordinates,
          // try to get coordinates from saved address.
          // --------------------------------------------------

          const addressText = [
            location.houseNumber,
            location.locality,
            location.city,
            location.state,
            location.pincode,
          ]
            .filter(Boolean)
            .join(", ");

          if (addressText) {
            try {
              const results = await Location.geocodeAsync(addressText);

              if (results.length > 0) {
                setUserLatitude(results[0].latitude);
                setUserLongitude(results[0].longitude);
              }
            } catch (error) {
              console.log("Manual location geocoding error:", error);
            }
          }
        }
      } catch (error) {
        console.log("Load Saved Location Error:", error);
      }
    };

    loadSavedLocation();
  }, [refreshKey]);

  // ==========================================================
  // FILTER SALONS
  // ==========================================================

  console.log("SALONS FROM BACKEND:", salons);
  console.log("USER LOCATION:", userLatitude, userLongitude);

  // ==========================================================
  // LOAD NOTIFICATION STATUS
  // ==========================================================

  const fetchNotificationStatus = useCallback(async () => {
    try {
      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/notifications/${customerId}`,
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        return;
      }

      const hasUnread = data.some(
        (notification: any) => notification.isRead === false,
      );

      setHasUnreadNotifications(hasUnread);
    } catch (error) {
      console.log("Fetch Notification Status Error:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotificationStatus();
  }, [fetchNotificationStatus, refreshKey]);

  const filteredSalons = salons.filter((salon) => {
    const search = searchText.toLowerCase().trim();

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const matchesSearch =
      salon.name.toLowerCase().includes(search) ||
      salon.category.toLowerCase().includes(search) ||
      salon.location.toLowerCase().includes(search) ||
      salon.services.some((service: string) =>
        service.toLowerCase().includes(search),
      );

    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    const matchesCategory =
      selectedCategory === null || salon.category === selectedCategory;

    // --------------------------------------------------------
    // SERVICE
    // --------------------------------------------------------

    const matchesService =
      selectedServices.length === 0 ||
      selectedServices.every((selectedService) =>
        salon.services.includes(selectedService),
      );

    // --------------------------------------------------------
    // 5 KM RADIUS
    // --------------------------------------------------------

    let matchesRadius = true;

    if (
      userLatitude !== null &&
      userLongitude !== null &&
      Number.isFinite(salon.latitude) &&
      Number.isFinite(salon.longitude)
    ) {
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        salon.latitude,
        salon.longitude,
      );

      matchesRadius = distance <= 5;
    }

    return matchesSearch && matchesCategory && matchesService && matchesRadius;
  });

  // ==========================================================
  // SERVICE FILTER
  // ==========================================================

  const handleServicePress = (serviceName: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceName)) {
        return prev.filter((service) => service !== serviceName);
      }

      return [...prev, serviceName];
    });
  };

  // ==========================================================
  // CATEGORY FILTER
  // ==========================================================

  const handleCategoryPress = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };

  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSelectedServices([]);
    setSelectedCategory(null);
    setSearchText("");
  };

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  const useCurrentLocation = async () => {
    if (loadingLocation) return;

    setLoadingLocation(true);
    setLocationError("");

    try {
      // Ask location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Please allow location access.");
        return;
      }

      // Get current GPS location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;

      // Send GPS coordinates to backend
      const response = await fetch(`${API_URL}/api/location/reverse-geocode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Ola Maps Error:", data);

        setLocationError("Unable to detect your location. Please try again.");
        return;
      }

      // First result from Ola Maps
      const address = data?.result;

      if (!address) {
        setLocationError("Unable to find your location.");
        return;
      }

      const components = address.address_components || [];

      const getComponent = (type: string) => {
        const component = components.find((item: any) =>
          item.types?.includes(type),
        );

        return component?.long_name || "";
      };

      const city =
        getComponent("locality") ||
        getComponent("administrative_area_level_2") ||
        "";

      const state = getComponent("administrative_area_level_1");

      const pincode = getComponent("postal_code");

      const localAddress = components
        .filter((item: any) => {
          const types = item.types || [];

          return (
            types.includes("route") ||
            types.includes("street_address") ||
            types.includes("premise") ||
            types.includes("subpremise") ||
            types.includes("neighborhood") ||
            types.includes("sublocality")
          );
        })
        .map((item: any) => item.long_name)
        .filter(Boolean)
        .join(", ");

      const detectedLocation = {
        latitude,
        longitude,
        locality: localAddress,
        city,
        state,
        pincode,
        address: localAddress,
      };

      console.log("========== CURRENT LOCATION ==========");
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);
      console.log("City:", city);
      console.log("State:", state);
      console.log("Pincode:", pincode);
      console.log("Full Address:", localAddress);
      console.log("======================================");

      // Save location
      await AsyncStorage.setItem(
        "userLocation",
        JSON.stringify(detectedLocation),
      );

      await AsyncStorage.setItem("userLocationSaved", "true");

      // Update Home location
      setUserLatitude(latitude);
      setUserLongitude(longitude);
      setLocationName(localAddress);

      // Close modal
      setLocationModalVisible(false);
    } catch (error) {
      console.log("Current Location Error:", error);

      setLocationError("Unable to detect your location. Please try again.");
    } finally {
      setLoadingLocation(false);
    }
  };

  // ==========================================================
  // LOCATION MODAL
  // ==========================================================

  const openLocationModal = async () => {
    setLocationError("");
    setLocationModalVisible(true);

    // First try saved location
    if (userLatitude !== null && userLongitude !== null) {
      setSelectedLatitude(userLatitude);
      setSelectedLongitude(userLongitude);
      setSelectedAddress(locationName);
      return;
    }

    // Otherwise automatically detect current location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Please allow location access.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;

      setSelectedLatitude(latitude);
      setSelectedLongitude(longitude);
    } catch (error) {
      console.log("Open Location Error:", error);
      setLocationError("Unable to detect your location.");
    }
  };

  const closeLocationModal = () => {
    if (loadingLocation) return;

    setLocationError("");
    setLocationModalVisible(false);
  };

  // ==========================================================
  // ACTIVE FILTER COUNT
  // ==========================================================

  const hasActiveFilter =
    selectedServices.length > 0 || selectedCategory !== null;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Text style={styles.smallText}>Your location</Text>

            <TouchableOpacity
              style={styles.locationRow}
              activeOpacity={0.7}
              onPress={openLocationModal}
            >
              <Text style={styles.locationPin}>📍</Text>

              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {locationName}
              </Text>

              <View style={styles.arrowContainer}>
                <View style={styles.arrowDown} />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.8}
            onPress={() => {
              router.push("/notifications" as any);
            }}
          >
            <Text style={styles.notificationIcon}>🔔</Text>

            {hasUnreadNotifications && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>

        {/* ==================================================
            WELCOME
        ================================================== */}

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Find your perfect</Text>

          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeTitle}>salon nearby</Text>

            <Text style={styles.sparkle}>✨</Text>
          </View>

          <Text style={styles.welcomeSubtitle}>
            Discover salons, compare prices and book your slot easily.
          </Text>
        </View>

        {/* ==================================================
            SEARCH
        ================================================== */}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            placeholder="Search salons or services"
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
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

        {/* ==================================================
            OFFER
        ================================================== */}

        <TouchableOpacity
          style={styles.offerBanner}
          activeOpacity={0.9}
          onPress={() => router.push("/offers" as any)}
        >
          <View style={styles.offerContent}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerSmall}>SPECIAL OFFER</Text>
            </View>

            <Text style={styles.offerTitle}>Book your salon</Text>

            <Text style={styles.offerTitle}>for just ₹10 fee</Text>

            <View style={styles.offerButton}>
              <Text style={styles.offerButtonText}>Explore Now</Text>

              <Text style={styles.offerButtonArrow}>→</Text>
            </View>
          </View>

          <View style={styles.offerImageCircle}>
            <Text style={styles.offerEmoji}>💇‍♀️</Text>
          </View>
        </TouchableOpacity>

        {/* ==================================================
            CATEGORIES HEADER
        ================================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Categories</Text>

            <Text style={styles.sectionSubtitle}>Choose your salon type</Text>
          </View>
        </View>

        {/* ==================================================
            CATEGORIES
        ================================================== */}

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

        {/* ==================================================
            FILTER INFO
        ================================================== */}

        <View style={styles.nearbyHeader}>
          <View style={styles.nearbyTitleRow}>
            <View>
              <Text style={styles.nearbyTitle}>
                {selectedService || selectedCategory
                  ? "Filtered Salons"
                  : "Nearby Salons"}
              </Text>

              <View style={styles.radiusRow}>
                <Text style={styles.radiusIcon}>📍</Text>

                <Text style={styles.radiusText}>
                  Within 5 km of your location
                </Text>
              </View>
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
        </View>

        {/* ==================================================
            SALON LIST
        ================================================== */}

        {loadingNearby ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#5B3CC4" />

            <Text style={styles.loadingText}>Finding salons near you...</Text>
          </View>
        ) : filteredSalons.length === 0 ? (
          <View style={styles.noResultBox}>
            <View style={styles.noResultIcon}>
              <Text>🔍</Text>
            </View>

            <Text style={styles.noResultTitle}>No salons found</Text>

            <Text style={styles.noResultText}>
              No matching salon found within 5 km.
            </Text>

            {hasActiveFilter && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={clearFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredSalons.map((salon) => {
            let distanceText = "";

            if (
              userLatitude !== null &&
              userLongitude !== null &&
              Number.isFinite(salon.latitude) &&
              Number.isFinite(salon.longitude)
            ) {
              const distance = calculateDistance(
                userLatitude,
                userLongitude,
                salon.latitude,
                salon.longitude,
              );

              distanceText =
                distance < 1
                  ? `${Math.round(distance * 1000)} m away`
                  : `${distance.toFixed(1)} km away`;
            }

            return (
              <TouchableOpacity
                key={salon.id}
                style={styles.salonCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/salon/${salon.id}` as any)}
              >
                <View style={styles.salonImageContainer}>
                  {salon.image ? (
                    <Image
                      source={{
                        uri: salon.image,
                      }}
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
                    <Text style={styles.salonCategoryText}>
                      {salon.category}
                    </Text>
                  </View>

                  {distanceText ? (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>📍 {distanceText}</Text>
                    </View>
                  ) : null}
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

                  <Text style={styles.salonReviews}>
                    {salon.reviews} reviews
                  </Text>

                  <View style={styles.salonBottomRow}>
                    <View>
                      <Text style={styles.startingLabel}>Starting from</Text>

                      <Text style={styles.startingPrice}>{salon.price}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookButton}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/salon/${salon.id}` as any)}
                    >
                      <Text style={styles.bookButtonText}>Book Now</Text>

                      <Text style={styles.bookArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 35 }} />
      </ScrollView>

      {/* ==================================================
          LOCATION MODAL
      ================================================== */}

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={closeLocationModal}
      >
        <SafeAreaView style={styles.locationScreen}>
          {/* HEADER */}
          <View style={styles.locationScreenHeader}>
            <TouchableOpacity
              style={styles.locationBackButton}
              onPress={closeLocationModal}
              activeOpacity={0.7}
            >
              <Text style={styles.locationBackText}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.locationScreenTitle}>Confirm Location</Text>

            <View style={{ width: 42 }} />
          </View>

          {/* SEARCH */}
          <View style={styles.locationSearchBox}>
            <Text style={styles.locationSearchIcon}>🔍</Text>

            <TextInput
              style={styles.locationSearchInput}
              placeholder="Search for your location"
              placeholderTextColor="#999"
              value={locationSearch}
              onChangeText={(text) => {
                setLocationSearch(text);

                if (!text.trim()) {
                  setLocationSearchResults([]);
                  return;
                }

                locationWebViewRef.current?.injectJavaScript(`
      if (window.searchPlaces) {
        window.searchPlaces(${JSON.stringify(text)});
      }
      true;
    `);
              }}
            />

            {locationSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setLocationSearch("")}
                activeOpacity={0.7}
              >
                <Text style={styles.locationSearchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {locationSearchResults.length > 0 && (
            <View style={styles.locationSearchResults}>
              {locationSearchResults.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.locationSearchResultItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setLocationSearch(item.description);
                    setLocationSearchResults([]);

                    locationWebViewRef.current?.injectJavaScript(`
            if (window.selectPlace) {
              window.selectPlace(${JSON.stringify(item.placeId)});
            }
            true;
          `);
                  }}
                >
                  <Text style={styles.locationSearchResultIcon}>📍</Text>

                  <Text
                    style={styles.locationSearchResultText}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* MAP */}
          <View style={styles.locationMapContainer}>
            {selectedLatitude !== null && selectedLongitude !== null ? (
              <WebView
                ref={locationWebViewRef}
                style={styles.locationMap}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={["*"]}
                source={{
                  html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta
                  name="viewport"
                  content="width=device-width,
                  initial-scale=1.0,
                  maximum-scale=1.0,
                  user-scalable=no"
                />

                <style>
                  html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                  }

                  #map {
                    width: 100%;
                    height: 100%;
                  }

                  .marker {
                    width: 38px;
                    height: 38px;
                    background: #5B3CC4;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 4px solid white;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.25);
                  }

                  .marker-inner {
                    width: 10px;
                    height: 10px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 10px;
                    left: 10px;
                  }
                </style>
              </head>

              <body>
                <div id="map"></div>

               <script>
  window.gm_authFailure = function () {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "googleMapsAuthFailure"
      })
    );
  };

  let map;
  let marker;

  function sendLocation(lat, lng) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "locationChanged",
        latitude: lat,
        longitude: lng
      })
    );
  }

  function searchPlaces(query) {
  if (!query || !query.trim()) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "searchResults",
        results: []
      })
    );
    return;
  }

  if (!google.maps.places) {
    return;
  }

  const service = new google.maps.places.AutocompleteService();

  service.getPlacePredictions(
    {
      input: query,
      componentRestrictions: {
        country: "in"
      }
    },
    function (predictions, status) {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        !predictions
      ) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "searchResults",
            results: []
          })
        );
        return;
      }

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "searchResults",
          results: predictions.map(function (item) {
            return {
              description: item.description,
              placeId: item.place_id
            };
          })
        })
      );
    }
  );
}

function selectPlace(placeId) {
  if (!map) return;

  const service = new google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId: placeId,
      fields: [
        "geometry",
        "formatted_address",
        "name"
      ]
    },
    function (place, status) {
      if (
        status !== google.maps.places.PlacesServiceStatus.OK ||
        !place ||
        !place.geometry ||
        !place.geometry.location
      ) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const position = {
        lat: lat,
        lng: lng
      };

      marker.setPosition(position);
      map.panTo(position);
      map.setZoom(16);

      sendLocation(lat, lng);
    }
  );
}

window.searchPlaces = searchPlaces;
window.selectPlace = selectPlace;

  function initMap() {
    const initialLocation = {
      lat: ${selectedLatitude},
      lng: ${selectedLongitude}
    };

    map = new google.maps.Map(
      document.getElementById("map"),
      {
        center: initialLocation,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: "greedy"
      }
    );

    marker = new google.maps.Marker({
      position: initialLocation,
      map: map,
      draggable: true,
      title: "Your Location"
    });

    marker.addListener("dragend", function () {
      const position = marker.getPosition();

      if (!position) return;

      sendLocation(
        position.lat(),
        position.lng()
      );
    });

    map.addListener("click", function (event) {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      marker.setPosition({
        lat: lat,
        lng: lng
      });

      map.panTo({
        lat: lat,
        lng: lng
      });

      sendLocation(lat, lng);
    });
  }

  function moveMarker(lat, lng) {
    if (!map || !marker) return;

    const position = {
      lat: Number(lat),
      lng: Number(lng)
    };

    marker.setPosition(position);
    map.panTo(position);
    map.setZoom(16);
  }

  window.moveMarker = moveMarker;
</script>

<script
  src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap"
  async
  defer
></script>
              </body>
              </html>
            `,
                }}
                onMessage={async (event: any) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);

                    if (data.type === "searchResults") {
                      setLocationSearchResults(data.results || []);
                      return;
                    }

                    if (data.type === "googleMapsAuthFailure") {
                      console.log("❌ GOOGLE MAPS AUTHENTICATION FAILED");
                      setLocationError(
                        "Google Maps API key authentication failed.",
                      );
                      return;
                    }

                    if (data.type !== "locationChanged") return;

                    const { latitude, longitude } = data;

                    setSelectedLatitude(latitude);
                    setSelectedLongitude(longitude);

                    setLoadingLocation(true);
                    setLocationError("");

                    try {
                      const response = await fetch(
                        `${API_URL}/api/location/reverse-geocode`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            latitude,
                            longitude,
                          }),
                        },
                      );

                      const result = await response.json();

                      if (!response.ok) {
                        throw new Error(
                          result?.message || "Unable to detect address",
                        );
                      }

                      const address = result?.result;

                      if (!address) {
                        throw new Error("No address found");
                      }

                      const components = address.address_components || [];

                      const localAddress = components
                        .filter((item: any) => {
                          const types = item.types || [];

                          return (
                            types.includes("route") ||
                            types.includes("street_address") ||
                            types.includes("premise") ||
                            types.includes("subpremise") ||
                            types.includes("neighborhood") ||
                            types.includes("sublocality")
                          );
                        })
                        .map((item: any) => item.long_name)
                        .filter(Boolean)
                        .join(", ");

                      setSelectedAddress(
                        localAddress || address.formatted_address || "",
                      );

                      const getComponent = (type: string) => {
                        const component = components.find((item: any) =>
                          item.types?.includes(type),
                        );

                        return component?.long_name || "";
                      };

                      const city =
                        getComponent("locality") ||
                        getComponent("administrative_area_level_2") ||
                        "";

                      const state = getComponent("administrative_area_level_1");

                      const pincode = getComponent("postal_code");

                      setSelectedCity(city);
                      setSelectedState(state);
                      setSelectedPincode(pincode);

                      console.log("CITY:", city);
                      console.log("STATE:", state);
                      console.log("PINCODE:", pincode);
                    } catch (error) {
                      console.log("Reverse Geocode Error:", error);

                      setLocationError("Unable to detect address.");
                    } finally {
                      setLoadingLocation(false);
                    }
                  } catch (error) {
                    console.log("Location WebView Error:", error);
                  }
                }}
              />
            ) : (
              <View style={styles.locationMapLoading}>
                <ActivityIndicator size="large" color="#5B3CC4" />
                <Text style={styles.locationMapLoadingText}>
                  Detecting your location...
                </Text>
              </View>
            )}

            {/* CURRENT LOCATION BUTTON */}
            <TouchableOpacity
              style={styles.currentLocationMapButton}
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();

                  if (status !== "granted") {
                    setLocationError("Please allow location access.");
                    return;
                  }

                  setLoadingLocation(true);

                  const currentLocation =
                    await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.High,
                    });

                  const { latitude, longitude } = currentLocation.coords;

                  setSelectedLatitude(latitude);
                  setSelectedLongitude(longitude);

                  locationWebViewRef.current?.injectJavaScript(`
              if (window.moveMarker) {
                window.moveMarker(
                  ${latitude},
                  ${longitude}
                );
              }
              true;
            `);

                  setLoadingLocation(false);
                } catch (error) {
                  console.log("Current Location Error:", error);

                  setLocationError("Unable to detect your location.");

                  setLoadingLocation(false);
                }
              }}
            >
              <Text style={styles.currentLocationMapIcon}>◎</Text>
            </TouchableOpacity>
          </View>

          {/* ADDRESS */}
          <View style={styles.selectedAddressContainer}>
            <Text style={styles.selectedAddressLabel}>Selected Location</Text>

            {loadingLocation ? (
              <View style={styles.addressLoadingRow}>
                <ActivityIndicator size="small" color="#5B3CC4" />
                <Text style={styles.addressLoadingText}>
                  Updating address...
                </Text>
              </View>
            ) : (
              <Text style={styles.selectedAddressText} numberOfLines={3}>
                {selectedAddress || "Move the marker to select your location"}
              </Text>
            )}
          </View>

          {locationError ? (
            <Text style={styles.locationError}>{locationError}</Text>
          ) : null}

          {/* CONFIRM */}
          <TouchableOpacity
            style={[
              styles.confirmLocationButton,
              (!selectedLatitude || !selectedLongitude || !selectedAddress) &&
                styles.confirmLocationButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={
              selectedLatitude === null ||
              selectedLongitude === null ||
              !selectedAddress ||
              loadingLocation
            }
            onPress={async () => {
              if (
                selectedLatitude === null ||
                selectedLongitude === null ||
                !selectedAddress
              ) {
                return;
              }

              try {
                setLoadingLocation(true);
                setLocationError("");

                // Get logged-in customer ID
                const customerId = await AsyncStorage.getItem("customerId");

                if (!customerId) {
                  setLocationError(
                    "Customer ID not found. Please login again.",
                  );
                  return;
                }

                // Save location to backend
                const response = await fetch(
                  `${API_URL}/api/users/${customerId}/location`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      address: selectedAddress,
                      city: selectedCity,
                      state: selectedState,
                      pincode: selectedPincode,
                      latitude: selectedLatitude,
                      longitude: selectedLongitude,
                    }),
                  },
                );

                const responseText = await response.text();

                console.log("CUSTOMER LOCATION STATUS:", response.status);
                console.log("CUSTOMER LOCATION RESPONSE:", responseText);

                let data: any;

                try {
                  data = JSON.parse(responseText);
                } catch {
                  console.log("SERVER RESPONSE JSON nahi hai:", responseText);

                  setLocationError("Server se invalid response mila.");
                  return;
                }

                if (!response.ok) {
                  console.error("Customer Location Update Error:", data);

                  setLocationError(
                    data?.message || "Unable to save your location.",
                  );

                  return;
                }

                // Save locally also
                const detectedLocation = {
                  latitude: selectedLatitude,
                  longitude: selectedLongitude,
                  address: selectedAddress,
                  locality: selectedAddress,
                  city: selectedCity,
                  state: selectedState,
                  pincode: selectedPincode,
                };

                await AsyncStorage.setItem(
                  "userLocation",
                  JSON.stringify(detectedLocation),
                );

                await AsyncStorage.setItem("userLocationSaved", "true");

                // Update Home immediately
                setUserLatitude(selectedLatitude);
                setUserLongitude(selectedLongitude);
                setLocationName(selectedAddress);

                // Close modal
                setLocationModalVisible(false);

                console.log(
                  "Customer Location Updated Successfully:",
                  data.customer,
                );
              } catch (error) {
                console.error("Customer Location Error:", error);

                setLocationError(
                  "Unable to connect to server. Please try again.",
                );
              } finally {
                setLoadingLocation(false);
              }
            }}
          >
            <Text style={styles.confirmLocationButtonText}>
              Confirm Location
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },

  locationContainer: {
    flex: 1,
  },

  smallText: {
    fontSize: 11,
    color: "#8A8792",
    marginBottom: 4,
    fontWeight: "500",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 250,
  },

  locationPin: {
    fontSize: 17,
    marginRight: 5,
  },

  locationText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#201C29",
    maxWidth: 195,
  },

  arrowContainer: {
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  arrowDown: {
    width: 7,
    height: 7,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#555",
    transform: [{ rotate: "45deg" }],
    marginTop: -4,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    position: "relative",
  },

  notificationIcon: {
    fontSize: 20,
  },

  notificationDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#5B3CC4",
    top: 9,
    right: 10,
  },

  // ==========================================================
  // WELCOME
  // ==========================================================

  welcomeSection: {
    marginTop: 23,
  },

  welcomeTitle: {
    fontSize: 29,
    fontWeight: "800",
    color: "#17131F",
    lineHeight: 35,
    letterSpacing: -0.5,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sparkle: {
    fontSize: 25,
    marginLeft: 7,
    marginTop: 2,
  },

  welcomeSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#77727F",
    maxWidth: 325,
  },

  // ==========================================================
  // SEARCH
  // ==========================================================

  searchBox: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 18,
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

  // ==========================================================
  // OFFER
  // ==========================================================

  offerBanner: {
    marginTop: 17,
    minHeight: 154,
    borderRadius: 22,
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#5B3CC4",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  offerContent: {
    flex: 1,
  },

  offerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 5,
  },

  offerSmall: {
    fontSize: 9,
    fontWeight: "800",
    color: "#E3DAFF",
    letterSpacing: 1,
  },

  offerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },

  offerButton: {
    alignSelf: "flex-start",
    marginTop: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  offerButtonText: {
    color: "#5B3CC4",
    fontSize: 12,
    fontWeight: "800",
  },

  offerButtonArrow: {
    color: "#5B3CC4",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },

  offerImageCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  offerEmoji: {
    fontSize: 55,
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
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

  seeAll: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5B3CC4",
    paddingBottom: 2,
  },

  // ==========================================================
  // SERVICES
  // ==========================================================

  servicesList: {
    gap: 10,
    paddingRight: 8,
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

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  categoriesRow: {
    flexDirection: "row",
    gap: 10,
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

  // ==========================================================
  // NEARBY HEADER
  // ==========================================================

  nearbyHeader: {
    marginTop: 26,
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

  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  radiusIcon: {
    fontSize: 11,
    marginRight: 4,
  },

  radiusText: {
    fontSize: 11,
    color: "#8A8792",
    fontWeight: "500",
  },

  clearFilterSmall: {
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

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingBox: {
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

  // ==========================================================
  // SALON CARD
  // ==========================================================

  salonCard: {
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

  distanceBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  distanceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
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

  // ==========================================================
  // NO RESULT
  // ==========================================================

  noResultBox: {
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

  // ==========================================================
  // LOCATION MODAL
  // ==========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  locationModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#191522",
  },

  modalSubtitle: {
    fontSize: 11,
    color: "#8A8792",
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F2F7",
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: 15,
    color: "#555",
  },

  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F5FF",
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E2FF",
  },

  currentLocationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E9E2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  currentLocationIcon: {
    fontSize: 21,
  },

  currentLocationContent: {
    flex: 1,
  },

  currentLocationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  currentLocationSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#777",
  },

  locationArrow: {
    fontSize: 22,
    color: "#5B3CC4",
    fontWeight: "600",
  },

  locationError: {
    marginTop: 9,
    fontSize: 11,
    color: "#D64545",
    textAlign: "center",
    lineHeight: 17,
  },
  locationScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  locationScreenHeader: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF5",
  },

  locationBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5F3FA",
    justifyContent: "center",
    alignItems: "center",
  },

  locationBackText: {
    fontSize: 32,
    color: "#25212D",
    lineHeight: 34,
    marginTop: -3,
  },

  locationScreenTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
  },

  locationSearchBox: {
    height: 52,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#F7F6FA",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECE9F2",
  },

  locationSearchIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  locationSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#222",
  },

  locationSearchClear: {
    fontSize: 14,
    color: "#888",
    paddingLeft: 8,
  },

  locationMapContainer: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },

  locationMap: {
    flex: 1,
  },

  locationMapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F2F7",
  },

  locationMapLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },

  currentLocationMapButton: {
    position: "absolute",
    right: 15,
    bottom: 15,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  currentLocationMapIcon: {
    fontSize: 27,
    color: "#5B3CC4",
    fontWeight: "700",
  },

  selectedAddressContainer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },

  selectedAddressLabel: {
    fontSize: 11,
    color: "#8A8792",
    fontWeight: "600",
    marginBottom: 5,
  },

  selectedAddressText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#25212D",
    fontWeight: "600",
  },

  addressLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  addressLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#777",
  },

  confirmLocationButton: {
    height: 54,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 15,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    justifyContent: "center",
    alignItems: "center",
  },

  confirmLocationButtonDisabled: {
    opacity: 0.45,
  },

  confirmLocationButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  locationSearchResults: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: -8,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    zIndex: 100,
  },

  locationSearchResultItem: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF5",
  },

  locationSearchResultIcon: {
    fontSize: 17,
    marginRight: 10,
  },

  locationSearchResultText: {
    flex: 1,
    fontSize: 13,
    color: "#2A2632",
    lineHeight: 19,
  },
});
