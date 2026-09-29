import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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

export default function FavoriteSalonsScreen() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);

      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        setFavorites([]);
        return;
      }

      const response = await fetch(`${API_URL}/api/favorites/${customerId}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch favorites");
      }

      setFavorites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Fetch Favorites Error:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites]),
  );

  const removeFavorite = async (salonId: number) => {
    try {
      const customerId = await AsyncStorage.getItem("customerId");

      if (!customerId) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/favorites/${customerId}/${salonId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setFavorites((prev) =>
          prev.filter((item) => Number(item.salonId) !== Number(salonId)),
        );
      }
    } catch (error) {
      console.log("Remove Favorite Error:", error);
    }
  };

  const openSalon = (salonId: number) => {
    router.push(`/salon/${salonId}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>Favorite Salons</Text>
          <Text style={styles.subtitle}>Your saved salons</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>♡</Text>

            <Text style={styles.emptyTitle}>No Favorite Salons</Text>

            <Text style={styles.emptyText}>
              Salons you favorite will appear here.
            </Text>
          </View>
        ) : (
          favorites.map((item) => {
            const salon = item.salon;

            return (
              <Pressable
                key={item.id}
                style={styles.salonCard}
                onPress={() => openSalon(salon.id)}
              >
                {salon.image ? (
                  <Image
                    source={{ uri: salon.image }}
                    style={styles.salonImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}

                <View style={styles.salonInfo}>
                  <Text style={styles.salonName} numberOfLines={1}>
                    {salon.name}
                  </Text>

                  <Text style={styles.location} numberOfLines={2}>
                    📍{" "}
                    {salon.address ||
                      [salon.city, salon.state].filter(Boolean).join(", ")}
                  </Text>

                  <Text style={styles.category}>
                    {salon.category || "Unisex Salon"}
                  </Text>
                </View>

                <Pressable
                  style={styles.heartButton}
                  onPress={() => removeFavorite(salon.id)}
                >
                  <Text style={styles.heart}>♥</Text>
                </Pressable>
              </Pressable>
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
    backgroundColor: "#F8F7FC",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    elevation: 2,
  },

  backText: {
    fontSize: 32,
    lineHeight: 36,
    color: "#222",
    marginTop: -4,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#191522",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  content: {
    paddingHorizontal: 20,
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

  salonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  salonImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },

  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: "#F0ECF7",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 11,
    color: "#888",
  },

  salonInfo: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 8,
  },

  salonName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#191522",
  },

  location: {
    fontSize: 11,
    color: "#777",
    marginTop: 6,
    lineHeight: 16,
  },

  category: {
    fontSize: 11,
    color: "#5B3CC4",
    fontWeight: "600",
    marginTop: 5,
  },

  heartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F4EEFC",
    alignItems: "center",
    justifyContent: "center",
  },

  heart: {
    fontSize: 21,
    color: "#5B3CC4",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 55,
    paddingHorizontal: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  emptyIcon: {
    fontSize: 55,
    color: "#C9B9E8",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
    textAlign: "center",
  },
});
