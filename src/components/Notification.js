import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native"; // Thêm Platform để check Web/Mobile
import { useAppStore } from "../store/useAppStore";

// 1. Hàm gửi thông báo - Đã mở fetch và thêm sound
export async function sendNotification(title, body, token) {
    if (!token) return console.log("Thiếu token, không gửi được!");

    try {
        await fetch("https://exp.host/--/api/v2/push/send", {
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
                sound: "default", // Thêm dòng này để máy kêu "tưng tưng"
                priority: "high", // Đảm bảo gửi đi ngay lập tức
            }),
        })
        console.log("Đã gửi thông báo tới:", token);
    } catch (err) {
        console.log('Lỗi gửi fetch:', err);
    }
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