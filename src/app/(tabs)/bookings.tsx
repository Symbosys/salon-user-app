import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
type Booking = {
  id: number;
  bookingId: string;
  customerId: number;
  salonId: number;
  serviceId: number;
  staffId?: number | null;
  date: string;
  time: string;
  amount: number;
  bookingFee: number;
  discount: number;
  finalAmount: number;
  status: string;
  cancelReason?: string | null;
  qrCode?: string | null;
  salon?: {
    name?: string;
    address?: string;
    city?: string;
    location?: string;
  };
  staff?: {
    name?: string;
  };
  bookingServices?: {
    service?: {
      name?: string;
      price?: number;
    };
  }[];
  reviews?: {
    id: number;
    rating: number;
    comment?: string | null;
  }[];
};
export default function BookingsScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Confirmed");
  useEffect(() => {
    if (typeof tab !== "string") return;
    const normalizedTab = tab.toLowerCase();
    switch (normalizedTab) {
      case "confirmed":
        setSelectedTab("Confirmed");
        break;
      case "completed":
        setSelectedTab("Completed");
        break;
      case "rejected":
        setSelectedTab("Rejected");
        break;
      case "pending":
        setSelectedTab("Pending");
        break;
    }
  }, [tab]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );
  const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
  const loadBookings = async () => {
    try {
      setLoading(true);
      const customerId = await AsyncStorage.getItem("customerId");
      if (!customerId) {
        Alert.alert("Error", "Customer ID not found. Please login again.");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/bookings/customer/${customerId}`,
      );
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setBookings(data);
      } else {
        setBookings([]);
        console.error("Bookings Error:", data);
      }
    } catch (error) {
      console.error("Load Bookings Error:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, []),
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadBookings();
      }
    });
    return () => subscription.remove();
  }, []);
  const formatDate = (value: string) => {
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
  const getServiceNames = (booking: Booking) => {
    if (booking.bookingServices && booking.bookingServices.length > 0) {
      return booking.bookingServices
        .map((item) => item.service?.name)
        .filter(Boolean)
        .join(", ");
    }
    return "-";
  };
  const getBookingStatus = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return "Pending";
      case "CONFIRMED":
        return "Confirmed";
      case "ACCEPTED":
        return "Confirmed";
      case "ARRIVED":
        return "Customer Arrived";
      case "STARTED":
        return "Service Started";
      case "COMPLETED":
        return "Completed";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status || "Pending";
    }
  };
  const getAppointmentDateTime = (booking: Booking) => {
    if (!booking.date || !booking.time) return null;
    const dateOnly = booking.date.includes("T")
      ? booking.date.split("T")[0]
      : booking.date;
    const [year, month, day] = dateOnly.split("-").map(Number);
    if (!year || !month || !day) return null;
    let timeText = String(booking.time).trim().toUpperCase();
    let hours: number;
    let minutes: number;
    if (timeText.includes("AM") || timeText.includes("PM")) {
      const match = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (!match) return null;
      hours = Number(match[1]);
      minutes = Number(match[2]);
      const period = match[3];
      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null;
      }
      if (period === "AM" && hours === 12) {
        hours = 0;
      } else if (period === "PM" && hours !== 12) {
        hours += 12;
      }
    } else {
      const match = timeText.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      hours = Number(match[1]);
      minutes = Number(match[2]);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
      }
    }
    const appointmentDateTime = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0,
    );
    return Number.isNaN(appointmentDateTime.getTime())
      ? null
      : appointmentDateTime;
  };
  const isPastBooking = (booking: Booking) => {
    const appointmentDateTime = getAppointmentDateTime(booking);
    if (!appointmentDateTime) {
      return false;
    }
    return appointmentDateTime < currentTime;
  };
  const upcomingBookings = bookings.filter(
    (booking) => !isPastBooking(booking),
  );
  const pastBookings = bookings.filter((booking) => isPastBooking(booking));
  const getTabBookings = (list: Booking[]) => {
    switch (selectedTab) {
      case "Confirmed":
        return list.filter((booking) =>
          ["CONFIRMED", "ACCEPTED", "ARRIVED", "STARTED"].includes(
            booking.status?.toUpperCase(),
          ),
        );
      case "Completed":
        return list.filter(
          (booking) => booking.status?.toUpperCase() === "COMPLETED",
        );
      case "Rejected":
        return list.filter((booking) =>
          ["CANCELLED", "REJECTED"].includes(booking.status?.toUpperCase()),
        );
      default:
        return list;
    }
  };
  const filteredUpcomingBookings = getTabBookings(upcomingBookings);
  const filteredPastBookings = getTabBookings(pastBookings);
  const submitReview = async () => {
    if (rating === 0 || !selectedBookingId || !selectedSalonId) {
      return;
    }
    const customerId = await AsyncStorage.getItem("customerId");
    if (!customerId) {
      Alert.alert("Error", "Customer ID not found. Please login again.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          customerId: Number(customerId),
          salonId: selectedSalonId,
          rating,
          comment: review,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Review Error:", data);
        return;
      }
      console.log("Review submitted successfully:", data);
      await loadBookings();
      setReviewModalVisible(false);
      setRating(0);
      setReview("");
      setSelectedBookingId(null);
      setSelectedSalonId(null);
    } catch (error) {
      console.error("Submit Review Error:", error);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Your Appointments</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.tabs}>
          {["Confirmed", "Completed", "Rejected"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              activeOpacity={0.8}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#5B3CC4" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : (
          <>
            {(selectedTab === "Pending" || selectedTab === "Confirmed") && (
              <>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {filteredUpcomingBookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Upcoming Bookings</Text>
                    <Text style={styles.emptyText}>
                      You don't have any upcoming appointments.
                    </Text>
                  </View>
                ) : (
                  filteredUpcomingBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.salonName}>
                            {booking.salon?.name || "Salon"}
                          </Text>
                          <Text style={styles.location}>
                            {booking.salon?.address ||
                              booking.salon?.location ||
                              booking.salon?.city ||
                              "-"}
                          </Text>
                        </View>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>
                            {getBookingStatus(booking.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                          {getServiceNames(booking)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(booking.date)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {booking.time || "-"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Any Staff"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking ID</Text>
                        <Text style={styles.detailValue}>
                          {booking.bookingId}
                        </Text>
                      </View>
                      {selectedTab === "Confirmed" && booking.qrCode && (
                        <View style={styles.qrSection}>
                          <Text style={styles.qrTitle}>
                            Show this QR code at the salon
                          </Text>
                          <View style={styles.qrBox}>
                            <QRCode
                              value={booking.qrCode}
                              size={150}
                              backgroundColor="#FFFFFF"
                              color="#191522"
                            />
                          </View>
                          <Text style={styles.qrHint}>
                            Scan to verify your booking
                          </Text>
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.total}>
                            ₹{Number(booking.amount || 0).toFixed(0)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.detailsButton}
                          activeOpacity={0.8}
                          onPress={() =>
                            router.push(`/salon/${booking.salonId}` as any)
                          }
                        >
                          <Text style={styles.detailsText}>View Salon</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
                  Past Bookings
                </Text>
                {filteredPastBookings.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Past Bookings</Text>
                    <Text style={styles.emptyText}>
                      Your completed bookings will appear here.
                    </Text>
                  </View>
                ) : (
                  filteredPastBookings.map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.salonName}>
                            {booking.salon?.name || "Salon"}
                          </Text>
                          <Text style={styles.location}>
                            {booking.salon?.address ||
                              booking.salon?.location ||
                              booking.salon?.city ||
                              "-"}
                          </Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>
                            {getBookingStatus(booking.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                          {getServiceNames(booking)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(booking.date)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {booking.time || "-"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Any Staff"}
                        </Text>
                      </View>
                      {selectedTab === "Confirmed" && booking.qrCode && (
                        <View style={styles.qrSection}>
                          <Text style={styles.qrTitle}>
                            Show this QR code at the salon
                          </Text>
                          <View style={styles.qrBox}>
                            <QRCode
                              value={booking.qrCode}
                              size={150}
                              backgroundColor="#FFFFFF"
                              color="#191522"
                            />
                          </View>
                          <Text style={styles.qrHint}>
                            Scan to verify your booking
                          </Text>
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.total}>
                            ₹{Number(booking.amount || 0).toFixed(0)}
                          </Text>
                        </View>
                        {booking.status?.toUpperCase() === "COMPLETED" &&
                          (booking.reviews && booking.reviews.length > 0 ? (
                            <View style={styles.reviewCompleted}>
                              <Text style={styles.reviewRating}>
                                {"★".repeat(booking.reviews[0].rating)}
                              </Text>
                              {booking.reviews[0].comment ? (
                                <Text style={styles.reviewComment}>
                                  {booking.reviews[0].comment}
                                </Text>
                              ) : null}
                              <Text style={styles.reviewDoneText}>
                                Review submitted
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.rateButton}
                              activeOpacity={0.8}
                              onPress={() => {
                                setSelectedBookingId(booking.id);
                                setSelectedSalonId(booking.salonId);
                                setReviewModalVisible(true);
                              }}
                            >
                              <Text style={styles.rateButtonText}>
                                Rate Now
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
            {selectedTab === "Completed" && (
              <>
                {getTabBookings(bookings).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Completed Bookings</Text>
                    <Text style={styles.emptyText}>
                      Your completed bookings will appear here.
                    </Text>
                  </View>
                ) : (
                  getTabBookings(bookings).map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.salonName}>
                            {booking.salon?.name || "Salon"}
                          </Text>
                          <Text style={styles.location}>
                            {booking.salon?.address ||
                              booking.salon?.location ||
                              booking.salon?.city ||
                              "-"}
                          </Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                          {getServiceNames(booking)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(booking.date)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {booking.time || "-"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Any Staff"}
                        </Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.total}>
                            ₹{Number(booking.amount || 0).toFixed(0)}
                          </Text>
                        </View>
                        {booking.reviews && booking.reviews.length > 0 ? (
                          <View style={styles.reviewCompleted}>
                            <Text style={styles.reviewRating}>
                              {"★".repeat(booking.reviews[0].rating)}
                            </Text>
                            {booking.reviews[0].comment ? (
                              <Text style={styles.reviewComment}>
                                {booking.reviews[0].comment}
                              </Text>
                            ) : null}
                            <Text style={styles.reviewDoneText}>
                              Review submitted
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.rateButton}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedBookingId(booking.id);
                              setSelectedSalonId(booking.salonId);
                              setReviewModalVisible(true);
                            }}
                          >
                            <Text style={styles.rateButtonText}>Rate Now</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
            {selectedTab === "Rejected" && (
              <>
                {getTabBookings(bookings).length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Rejected Bookings</Text>
                    <Text style={styles.emptyText}>
                      Your rejected bookings will appear here.
                    </Text>
                  </View>
                ) : (
                  getTabBookings(bookings).map((booking) => (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.salonName}>
                            {booking.salon?.name || "Salon"}
                          </Text>
                          <Text style={styles.location}>
                            {booking.salon?.address ||
                              booking.salon?.location ||
                              booking.salon?.city ||
                              "-"}
                          </Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>
                            {booking.cancelReason === "Admin cancelled"
                              ? "Cancelled by Admin"
                              : booking.cancelReason === "SALON_CANCELLED"
                                ? "Cancelled by Salon"
                                : booking.cancelReason === "SALON_NOT_ACCEPTED"
                                  ? "Salon Not Accepted"
                                  : booking.cancelReason === "NOT_ARRIVED"
                                    ? "Not Arrived"
                                    : "Cancelled"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>
                          {getServiceNames(booking)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(booking.date)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {booking.time || "-"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Any Staff"}
                        </Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.total}>
                            ₹{Number(booking.amount || 0).toFixed(0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.7}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSalon}>Your Booking</Text>
            <Text style={styles.ratingQuestion}>How was your experience?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  activeOpacity={0.7}
                  onPress={() => setRating(star)}
                >
                  <Text
                    style={[styles.star, star <= rating && styles.activeStar]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.reviewLabel}>Write a review</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              value={review}
              onChangeText={setReview}
              maxLength={300}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                rating === 0 && styles.disabledSubmitButton,
              ]}
              activeOpacity={0.8}
              disabled={rating === 0}
              onPress={submitReview}
            >
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              activeOpacity={0.7}
              onPress={() => setReviewModalVisible(false)}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginBottom: 12,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 13,
    color: "#777",
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#191522",
  },
  emptyText: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
    textAlign: "center",
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginBottom: 15,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  salonName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#191522",
  },
  location: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
    maxWidth: 220,
  },
  statusBadge: {
    backgroundColor: "#E8F7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E8B57",
    textTransform: "capitalize",
  },
  completedBadge: {
    backgroundColor: "#F0EBFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B3CC4",
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#777",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#191522",
    maxWidth: "62%",
    textAlign: "right",
  },
  qrSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#191522",
    marginBottom: 12,
    textAlign: "center",
  },
  qrBox: {
    width: 170,
    height: 170,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  qrHint: {
    fontSize: 11,
    color: "#777",
    marginTop: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    color: "#777",
  },
  total: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7B2CBF",
    marginTop: 2,
  },
  detailsButton: {
    backgroundColor: "#7B2CBF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  reviewModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#191522",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 15,
    color: "#555",
  },
  modalSalon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5B3CC4",
    marginTop: 10,
  },
  ratingQuestion: {
    fontSize: 13,
    color: "#777",
    marginTop: 18,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  star: {
    fontSize: 38,
    color: "#D8D5DE",
    marginHorizontal: 4,
  },
  activeStar: {
    color: "#F4B400",
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    marginTop: 20,
    marginBottom: 8,
  },
  reviewInput: {
    height: 100,
    borderWidth: 1,
    borderColor: "#E1DFE7",
    borderRadius: 14,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 13,
    color: "#222",
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  disabledSubmitButton: {
    backgroundColor: "#CFC7E8",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  laterButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  laterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#777",
  },
  reviewCompleted: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  reviewRating: {
    fontSize: 18,
    color: "#F4B400",
    marginBottom: 3,
  },
  reviewComment: {
    fontSize: 12,
    color: "#555",
    maxWidth: 140,
    textAlign: "right",
  },
  reviewDoneText: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
  },
  rateButton: {
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: "#5B3CC4",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#777",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
