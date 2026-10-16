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
type DateItem = {
  day: string;
  date: string;
  fullDate: string;
};
type TimeSlot = {
  time: string;
  isAvailable: boolean;
  status?: string;
};
type StaffMember = {
  id: string;
  name: string;
  role: string;
};
export default function SlotSelectionScreen() {
  const router = useRouter();
  const { salonId, serviceIds } = useLocalSearchParams<{
    salonId?: string;
    serviceIds?: string;
  }>();
  const [dates, setDates] = useState<DateItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [salon, setSalon] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedServiceIds = serviceIds
    ? serviceIds.split(",").filter(Boolean)
    : [];
  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const isToday = (dateString: string) => {
    const selected = new Date(dateString);
    const today = new Date();
    return getDateKey(selected) === getDateKey(today);
  };
  const isPastTime = (time: string, dateString: string) => {
    if (!isToday(dateString)) {
      return false;
    }
    const now = new Date();
    let hours = 0;
    let minutes = 0;
    const cleanTime = time.trim().toUpperCase();
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!match) {
      return false;
    }
    hours = Number(match[1]);
    minutes = Number(match[2]);
    const period = match[3];
    if (period === "AM" && hours === 12) {
      hours = 0;
    }
    if (period === "PM" && hours !== 12) {
      hours += 12;
    }
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= now;
  };
  const fetchSlotData = async () => {
    try {
      setLoading(true);
      if (!salonId) {
        setLoading(false);
        return;
      }
      const salonsResponse = await fetch(`${API_URL}/api/salons`);
      const salonsData = await salonsResponse.json();
      if (Array.isArray(salonsData)) {
        const currentSalon = salonsData.find(
          (item: any) => Number(item.id) === Number(salonId),
        );
        setSalon(currentSalon || null);
      }
      const availabilityResponse = await fetch(
        `${API_URL}/api/availability/${salonId}`,
      );
      const availabilityData = await availabilityResponse.json();
      if (Array.isArray(availabilityData)) {
        const allData = availabilityData;
        const uniqueDates = new Map<string, DateItem>();
        allData.forEach((item: any) => {
          const dateObject = new Date(item.date);
          const dateKey = getDateKey(dateObject);
          if (!uniqueDates.has(dateKey)) {
            uniqueDates.set(dateKey, {
              day: dateObject.toLocaleDateString("en-US", {
                weekday: "short",
              }),
              date: dateObject.toLocaleDateString("en-US", {
                day: "2-digit",
              }),
              fullDate: dateKey,
            });
          }
        });
        const dateList = Array.from(uniqueDates.values());
        setDates(dateList);
        let activeDate = selectedDate;
        if (
          !activeDate ||
          !dateList.some((item) => item.fullDate === activeDate)
        ) {
          activeDate = dateList.length > 0 ? dateList[0].fullDate : "";
          setSelectedDate(activeDate);
        }
        if (activeDate) {
          const selectedDateSlots = allData
            .filter((item: any) => {
              const dateObject = new Date(item.date);
              const itemDate = getDateKey(dateObject);
              return itemDate === activeDate;
            })
            .map((item: any) => ({
              time: item.time,
              isAvailable: item.isAvailable,
              status: item.status,
            }));
          setTimeSlots(selectedDateSlots);
          if (
            selectedTime &&
            !selectedDateSlots.some(
              (slot) => slot.time === selectedTime && slot.isAvailable,
            )
          ) {
            setSelectedTime(null);
          }
        } else {
          setTimeSlots([]);
          setSelectedTime(null);
        }
      }
      const staffResponse = await fetch(`${API_URL}/api/staff/${salonId}`);
      const staffData = await staffResponse.json();
      if (Array.isArray(staffData)) {
        const availableStaff = staffData
          .filter((staff: any) => staff.status !== "UNAVAILABLE")
          .map((staff: any) => ({
            id: String(staff.id),
            name: staff.name,
            role: staff.role,
          }));
        setStaffMembers(availableStaff);
      }
    } catch (error) {
      console.error("Slot Data Error:", error);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchSlotData();
    }, [salonId]),
  );
  const handleDateChange = async (fullDate: string) => {
    setSelectedDate(fullDate);
    setSelectedTime(null);
    try {
      const response = await fetch(`${API_URL}/api/availability/${salonId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const slots = data
          .filter((item: any) => {
            const dateObject = new Date(item.date);
            const itemDate = getDateKey(dateObject);
            return itemDate === fullDate;
          })
          .map((item: any) => ({
            time: item.time,
            isAvailable: item.isAvailable,
            status: item.status,
          }));
        setTimeSlots(slots);
      }
    } catch (error) {
      console.error("Date Slot Error:", error);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>Loading slots...</Text>
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
        <Text style={styles.title}>Select Date & Time</Text>
        <Text style={styles.subtitle}>
          Choose your preferred appointment slot
        </Text>
        <View style={styles.salonCard}>
          <View style={styles.salonIcon}>
            <Text style={styles.salonEmoji}>💇‍♀️</Text>
          </View>
          <View>
            <Text style={styles.salonName}>{salon?.name || "Salon"}</Text>
            <Text style={styles.serviceName}>
              {selectedServiceIds.length > 0
                ? `${selectedServiceIds.length} services selected`
                : "Services selected"}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Select Date</Text>
        {dates.length === 0 ? (
          <Text style={styles.emptyText}>No dates available</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dates.map((item) => {
              const selected = selectedDate === item.fullDate;
              return (
                <TouchableOpacity
                  key={item.fullDate}
                  style={[styles.dateCard, selected && styles.selectedDateCard]}
                  activeOpacity={0.8}
                  onPress={() => handleDateChange(item.fullDate)}
                >
                  <Text
                    style={[styles.dayText, selected && styles.selectedText]}
                  >
                    {item.day}
                  </Text>
                  <Text
                    style={[styles.dateText, selected && styles.selectedText]}
                  >
                    {item.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View style={styles.timeHeader}>
          <Text style={styles.sectionTitle}>Available Time</Text>
          <Text style={styles.timezone}>IST</Text>
        </View>
        {timeSlots.length === 0 ? (
          <Text style={styles.emptyText}>No time slots available</Text>
        ) : (
          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => {
              const selected = selectedTime === slot.time;
              const backendDisabled =
                slot.isAvailable === false || slot.status === "Booked";
              const pastTime = isPastTime(slot.time, selectedDate);
              const disabled = backendDisabled || pastTime;
              return (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.timeCard,
                    selected && styles.selectedTimeCard,
                    disabled && styles.disabledTimeCard,
                  ]}
                  activeOpacity={0.8}
                  disabled={disabled}
                  onPress={() => setSelectedTime(slot.time)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selected && styles.selectedTimeText,
                      disabled && styles.disabledTimeText,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.staffHeader}>
          <Text style={styles.sectionTitle}>Select Staff</Text>
          <Text style={styles.optionalText}>Optional</Text>
        </View>
        {staffMembers.length === 0 ? (
          <Text style={styles.emptyText}>No staff available</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffList}
          >
            {staffMembers.map((staff) => {
              const selected = selectedStaff === staff.id;
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[
                    styles.staffCard,
                    selected && styles.selectedStaffCard,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedStaff(staff.id)}
                >
                  <View
                    style={[
                      styles.staffAvatar,
                      selected && styles.selectedStaffAvatar,
                    ]}
                  >
                    <Text style={styles.staffAvatarText}>
                      {staff.name.charAt(0)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.staffName,
                      selected && styles.selectedStaffText,
                    ]}
                  >
                    {staff.name}
                  </Text>
                  <Text style={styles.staffRole}>{staff.role}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedTime === null && styles.disabledButton,
          ]}
          disabled={selectedTime === null}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: "/booking/summary",
              params: {
                salonId: salonId || "",
                serviceIds: serviceIds || "",
                date: selectedDate,
                time: selectedTime || "",
                staffId: selectedStaff || "",
                staffName:
                  staffMembers.find((staff) => staff.id === selectedStaff)
                    ?.name || "",
              },
            } as any)
          }
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
  emptyText: {
    fontSize: 13,
    color: "#888",
    marginTop: 12,
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
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  salonEmoji: {
    fontSize: 25,
  },
  salonName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  serviceName: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  dateList: {
    paddingTop: 12,
    paddingBottom: 5,
  },
  dateCard: {
    width: 68,
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  selectedDateCard: {
    backgroundColor: "#5B3CC4",
    borderColor: "#5B3CC4",
  },
  dayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  selectedText: {
    color: "#fff",
  },
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  timezone: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeCard: {
    width: "31%",
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  selectedTimeCard: {
    backgroundColor: "#F0EBFF",
    borderColor: "#5B3CC4",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  selectedTimeText: {
    color: "#5B3CC4",
    fontWeight: "700",
  },
  disabledTimeCard: {
    backgroundColor: "#F2F2F2",
    borderColor: "#D9D9D9",
    opacity: 0.6,
  },
  disabledTimeText: {
    color: "#999",
  },
  staffHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 12,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
  },
  staffList: {
    paddingRight: 10,
  },
  staffCard: {
    width: 125,
    padding: 14,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
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
  selectedStaffCard: {
    backgroundColor: "#F9F6FF",
    borderColor: "#5B3CC4",
    borderWidth: 1.5,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  selectedStaffAvatar: {
    backgroundColor: "#5B3CC4",
  },
  staffAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  staffName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  selectedStaffText: {
    color: "#5B3CC4",
  },
  staffRole: {
    fontSize: 10,
    fontWeight: "500",
    color: "#888",
    marginTop: 4,
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
    backgroundColor: "#CFCFCF",
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
