import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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
type Notification = {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};
export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const customerId = await AsyncStorage.getItem("customerId");
      if (!customerId) {
        setNotifications([]);
        return;
      }
      const response = await fetch(
        `${API_URL}/api/notifications/${customerId}`,
      );
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to fetch notifications");
      }
      setNotifications(data);
    } catch (error) {
      console.log("Fetch Notifications Error:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) {
      return "Just now";
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    if (hours < 24) {
      return `${hours} hr ago`;
    }
    if (days < 7) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    return date.toLocaleDateString();
  };
  const markAsRead = async (notificationId: number) => {
    const currentNotification = notifications.find(
      (notification) => notification.id === notificationId,
    );
    if (!currentNotification || currentNotification.isRead) {
      return;
    }
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      console.log("Mark Notification Read Error:", error);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: false }
            : notification,
        ),
      );
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpace} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#5B3CC4" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptyText}>
              New notifications will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              activeOpacity={0.85}
              onPress={() => markAsRead(notification.id)}
            >
              <View
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.unreadNotification,
                ]}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.icon}>✓</Text>
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle} numberOfLines={2}>
                      {notification.title}
                    </Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationText}>
                    {notification.message}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(notification.createdAt)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    height: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 30,
    color: "#222",
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#191522",
  },
  headerSpace: {
    width: 42,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  unreadNotification: {
    borderWidth: 1,
    borderColor: "#E8E0FF",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
    color: "#5B3CC4",
    fontWeight: "800",
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5B3CC4",
    marginLeft: 8,
  },
  notificationText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#777",
  },
  time: {
    marginTop: 7,
    fontSize: 10,
    color: "#999",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 70,
  },
  emptyIcon: {
    fontSize: 42,
    opacity: 0.5,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: "#999",
  },
});
