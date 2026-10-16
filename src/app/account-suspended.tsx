import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function AccountSuspendedScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.title}>Account Suspended</Text>
        <Text style={styles.message}>
          Your account has been suspended by the administrator. Please contact
          support for further assistance.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            const email = "support@salonapp.com";
            const subject = "Account Suspended - Support Request";
            const body =
              "Hello Support Team,\n\nMy SalonApp account has been suspended. Please review my account and assist me with the issue.\n\nThank you.";
            const mailtoUrl =
              `mailto:${email}` +
              `?subject=${encodeURIComponent(subject)}` +
              `&body=${encodeURIComponent(body)}`;
            Linking.openURL(mailtoUrl).catch((error) => {
              console.log("Unable to open email app:", error);
            });
          }}
        >
          <Text style={styles.buttonText}>Contact Support</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 42,
    fontWeight: "800",
    color: "#D64545",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#222222",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    color: "#777777",
    textAlign: "center",
    marginTop: 12,
    maxWidth: 330,
  },
  button: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
