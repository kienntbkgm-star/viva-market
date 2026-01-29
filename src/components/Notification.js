import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppStore } from "../store/useAppStore";

// 1. Gửi notification TRỰC TIẾP qua Expo API (chỉ cho native app)
export async function sendNotificationDirect(title, body, token) {
    if (!token) return console.log("❌ Thiếu token, không gửi được!");

    console.log("📤 Gửi notification TRỰC TIẾP (native)...");
    console.log("   Title:", title);
    console.log("   Body:", body);
    console.log("   Token:", token.substring(0, 20) + "...");

    try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip,deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: token,
                title: title,
                body: body,
                sound: "default",
                priority: "high",
            }),
        });

        const result = await response.json();
        console.log("✅ Response từ Expo:", result);

        if (result.data && result.data.status === "error") {
            console.log("❌ Lỗi từ Expo:", result.data.message);
        }
    } catch (err) {
        console.log("❌ Lỗi gửi fetch:", err);
    }
}

// 2. Gửi notification QUA CLOUD FUNCTION (cho web + backend handling)
export async function sendNotificationViaCloudFunction(title, body, token) {
    // Kiểm tra input
    if (!title || !body || !token) {
        const missingFields = [];
        if (!title) missingFields.push("title");
        if (!body) missingFields.push("body");
        if (!token) missingFields.push("token");
        console.error("❌ Thiếu field:", missingFields.join(", "));
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    console.log("📤 Gửi notification QUA CLOUD FUNCTION...");
    console.log("   Title:", title);
    console.log("   Body:", body);
    console.log("   Token:", token.substring(0, 20) + "...");

    try {
        const functions = getFunctions();
        // Chỉ định region us-central1 vì Cloud Function ở region này
        const sendNotifFunction = httpsCallable(functions, "sendExpoNotification", { region: "us-central1" });

        const requestData = {
            title: title,
            body: body,
            token: token,
        };

        console.log("📮 Gửi request với dữ liệu:", {
            title: requestData.title,
            body: requestData.body,
            token: requestData.token.substring(0, 20) + "..."
        });
        console.log("📮 Full request data:", requestData);
        
        const result = await sendNotifFunction(requestData);

        console.log("✅ Cloud Function response:", result.data);
        return result.data;
    } catch (error) {
        console.error("❌ Lỗi gửi via Cloud Function:", error.message);
        console.error("Chi tiết lỗi:", error);
        throw error;
    }
}

// 3. SMART FUNCTION - Chọn tự động dựa vào platform
export async function sendNotification(title, body, token) {
    // Nếu web: dùng Cloud Function (tránh CORS)
    if (Platform.OS === "web") {
        return await sendNotificationViaCloudFunction(title, body, token);
    }
    
    // Nếu native: gửi trực tiếp (tiết kiệm invocations, nhanh hơn)
    return await sendNotificationDirect(title, body, token);
}

export default function NotificationProcess() {
    const setExpoToken = useAppStore((state) => state.setExpoToken);

    useEffect(() => {
        // CẬP NHẬT: Nếu là Web thì thoát luôn, không làm gì cả
        if (Platform.OS === 'web') return;

        // Tự động xin quyền và lấy Token khi App mở
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoToken(token);
                console.log("Token của máy này là:", token);
            }
        });

        // Lắng nghe khi có thông báo tới
        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("Nhận thông báo khi đang mở App!");
        });

        return () => receivedSubscription.remove();
    }, []);

    const registerForPushNotificationsAsync = async () => {
        // CẬP NHẬT: Chặn ngay từ đầu nếu là Web
        if (Platform.OS === 'web') {
            console.log("Web không hỗ trợ Push Notification qua Expo");
            return null;
        }

        // Cấu hình hiển thị thông báo ngay cả khi đang dùng App
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') {
                // Đã chặn Web ở trên nên alert này chỉ hiện trên điện thoại thật nếu chưa cấp quyền
                console.log('Người dùng chưa cấp quyền thông báo'); 
                return null;
            }
            
            const token = (await Notifications.getExpoPushTokenAsync()).data;
            return token;
        } else {
            console.log("Máy ảo không lấy được Token thông báo!");
            return null;
        }
    };

    return null;
}