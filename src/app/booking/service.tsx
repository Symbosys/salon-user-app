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
export default function ServiceSelectionScreen() {
  const router = useRouter();
  const { salonId } = useLocalSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      if (!salonId) {
        setServices([]);
        setSalon(null);
        return;
      }
      const salonsResponse = await fetch(`${API_URL}/api/salons`);
      const salonsData = await salonsResponse.json();
      if (!salonsResponse.ok || !Array.isArray(salonsData)) {
        throw new Error("Failed to fetch salon details");
      }
      const currentSalon = salonsData.find(
        (item: any) => Number(item.id) === Number(salonId),
      );
      if (currentSalon) {
        setSalon(currentSalon);
      } else {
        setSalon(null);
      }
      const response = await fetch(`${API_URL}/api/services/${salonId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to fetch services");
      }
      setServices(
        Array.isArray(data)
          ? data.filter((service: any) => service.isActive === true)
          : [],
      );
    } catch (error) {
      console.error("Fetch Services Error:", error);
      Alert.alert("Error", "Unable to load services.");
      setServices([]);
      setSalon(null);
    } finally {
      setLoading(false);
    }
  }, [salonId]);
  useFocusEffect(
    useCallback(() => {
      fetchServices();
    }, [fetchServices]),
  );
  const toggleService = (serviceId: number) => {
    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }
      return [...current, serviceId];
    });
  };
  const handleContinue = () => {
    if (selectedServices.length === 0) {
      return;
    }
    const selectedServiceIds = selectedServices.join(",");
    router.push(
      `/booking/slot?salonId=${salonId}&serviceIds=${selectedServiceIds}` as any,
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Service</Text>
        <Text style={styles.subtitle}>Choose the service you want to book</Text>
        <View style={styles.salonCard}>
          <View style={styles.salonIcon}>
            <Text style={styles.salonEmoji}>💇‍♀️</Text>
          </View>
          <View style={styles.salonInfo}>
            <Text style={styles.salonName}>{salon?.name || "Salon"}</Text>
            <Text style={styles.salonLocation}>
              📍 {salon?.location || salon?.address || "Location unavailable"}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Available Services</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#5B3CC4" />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No services available</Text>
          </View>
        ) : (
          services.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  isSelected && styles.selectedServiceCard,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleService(service.id)}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    isSelected && styles.selectedServiceIcon,
                  ]}
                >
                  <Text style={styles.serviceEmoji}>
                    {service.icon || "💇"}
                  </Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.description}>
                    {service.category || "Beauty & grooming service"}
                  </Text>
                  <Text style={styles.duration}>{service.duration} min</Text>
                </View>
                <View style={styles.rightSection}>
                  <Text style={styles.price}>₹{service.price}</Text>
                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}
                  >
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {selectedServices.length > 0 && (
          <Text style={styles.selectedText}>
            {selectedServices.length} service
            {selectedServices.length > 1 ? "s" : ""} selected
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedServices.length === 0 && styles.disabledButton,
          ]}
          activeOpacity={0.8}
          disabled={selectedServices.length === 0}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
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
  salonCard: {
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
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
  salonIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  salonEmoji: {
    fontSize: 27,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },
  salonLocation: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: "#777",
  },
  salonInfo: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 13,
    fontSize: 19,
    fontWeight: "800",
    color: "#191522",
  },
  loadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#777",
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEF2",
  },
  emptyText: {
    fontSize: 13,
    color: "#888",
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
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
  selectedServiceCard: {
    borderColor: "#5B3CC4",
    backgroundColor: "#F9F6FF",
    borderWidth: 1.5,
  },
  serviceIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F4F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedServiceIcon: {
    backgroundColor: "#EAE3FF",
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },
  description: {
    marginTop: 4,
    fontSize: 11,
    color: "#888",
  },
  duration: {
    marginTop: 5,
    fontSize: 11,
    color: "#999",
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 52,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#C8C5D0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#5B3CC4",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5B3CC4",
  },
  selectedText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#5B3CC4",
    textAlign: "center",
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  disabledButton: {
    backgroundColor: "#C9C5D3",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
