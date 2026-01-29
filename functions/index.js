/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Cloud Function to send Expo Push Notification
exports.sendExpoNotification = functions.https.onCall(async (data, context) => {
  console.log("🔍 DEBUG - Data nhận được từ client:", data);
  console.log("🔍 DEBUG - Type of data:", typeof data);
  console.log("🔍 DEBUG - Keys in data:", Object.keys(data || {}));

  // Dữ liệu thực sự nằm trong data.data (do httpsCallable wrap)
  const actualData = data.data || data;
  const {title, body, token} = actualData;

  console.log("🔍 DEBUG - Title:", title, "Body:", body, "Token:", token);

  // Validate input
  if (!title || !body || !token) {
    console.error("❌ Validation failed!");
    console.error("   title:", !!title, typeof title);
    console.error("   body:", !!body, typeof body);
    console.error("   token:", !!token, typeof token);
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: title, body, token",
    );
  }

  console.log("📤 Sending notification from Cloud Function");
  console.log("   Title:", title);
  console.log("   Body:", body);
  console.log("   Token:", token.substring(0, 20) + "...");

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
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
    console.log("✅ Response from Expo:", result);

    if (result.data && result.data.status === "error") {
      throw new Error(result.data.message);
    }

    return {
      success: true,
      message: "Notification sent successfully",
      data: result,
    };
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to send notification: " + error.message,
    );
  }
});
