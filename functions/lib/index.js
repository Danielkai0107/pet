"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCheckExpiredSubscriptions = exports.checkExpiredSubscriptions = exports.lineWebhook = exports.declineAppointment = exports.sendLineTempReportMessage = exports.sendLineCompletionMessage = exports.sendServiceCompletionNotification = exports.getLineOfficialQuota = exports.getLineMessageQuota = exports.onAppointmentStatusConfirmed = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const crypto = __importStar(require("crypto"));
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
// Multi-Tenant: 監聽所有商家的預約創建事件
// 已停用：節省 LINE Push API 配額，改用客戶端 sendMessages（免費）
// export const onAppointmentCreated = onDocumentCreated(
//   "shops/{shopId}/appointments/{appointmentId}",
//   async (event) => {
//     // ... 已註解以節省配額
//   }
// );
// Multi-Tenant: 監聽預約狀態變化（待確認 > 已確認）
exports.onAppointmentStatusConfirmed = (0, firestore_1.onDocumentUpdated)("shops/{shopId}/appointments/{appointmentId}", async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData) {
        return;
    }
    const shopId = event.params.shopId;
    const appointmentId = event.params.appointmentId;
    const userId = afterData.userId;
    // 檢查是否為現場預約（walk-in）
    if (userId.startsWith("walk-in-")) {
        logger.info("現場預約，不發送 LINE 通知", { userId });
        return;
    }
    // 檢查是否是從「待確認」變為「已確認」
    if (beforeData.status === "pending" && afterData.status === "confirmed") {
        logger.info("預約狀態已變更為已確認，準備發送通知", {
            shopId,
            appointmentId,
            userId: afterData.userId,
        });
        // 1. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            logger.error("找不到商家資料", { shopId });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        const liffId = shopData === null || shopData === void 0 ? void 0 : shopData.liffId;
        if (!channelAccessToken) {
            logger.error("商家未設定 LINE Channel Access Token", { shopId });
            return;
        }
        // 2. 構建確認訊息（不含圖片）
        const flexMessage = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: "預約已確認",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "您的預約已經確認！",
                                    weight: "bold",
                                    size: "lg",
                                    margin: "sm",
                                },
                                {
                                    type: "separator",
                                    margin: "md",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "寵物",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.petName || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "服務",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.serviceType || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "日期",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.date || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "時間",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.time || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        footer: {
                            type: "box",
                            layout: "vertical",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "button",
                                    style: "primary",
                                    height: "sm",
                                    action: {
                                        type: "uri",
                                        label: "查看預約詳情",
                                        uri: liffId
                                            ? `https://liff.line.me/${liffId}`
                                            : "https://line.me",
                                    },
                                },
                            ],
                            flex: 0,
                        },
                    },
                },
            ],
        };
        try {
            logger.info("發送預約確認通知", {
                shopId,
                userId,
                hasToken: !!channelAccessToken,
            });
            const response = await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${channelAccessToken}`,
                },
                body: JSON.stringify(flexMessage),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error("發送預約確認通知失敗", {
                    shopId,
                    status: response.status,
                    body: errorText,
                });
            }
            else {
                logger.info("預約確認通知發送成功", { shopId, userId });
                // 記錄訊息統計
                await recordMessageSent(shopId, "appointment");
            }
        }
        catch (error) {
            logger.error("發送預約確認通知時發生錯誤", { shopId, error });
        }
    }
    // 檢查是否是從「已確認」變為「已取消」
    if (beforeData.status === "confirmed" && afterData.status === "cancelled") {
        logger.info("預約狀態已變更為已取消，準備發送通知", {
            shopId,
            appointmentId,
            userId,
        });
        // 1. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            logger.error("找不到商家資料", { shopId });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        const liffId = shopData === null || shopData === void 0 ? void 0 : shopData.liffId;
        if (!channelAccessToken) {
            logger.error("商家未設定 LINE Channel Access Token", { shopId });
            return;
        }
        // 2. 構建取消訊息
        const flexMessage = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: "預約已取消",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "您的預約已取消",
                                    weight: "bold",
                                    size: "lg",
                                    margin: "sm",
                                },
                                {
                                    type: "separator",
                                    margin: "md",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "寵物",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.petName || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "服務",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.serviceType || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "日期",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.date || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "時間",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: afterData.time || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "separator",
                                    margin: "lg",
                                },
                                {
                                    type: "text",
                                    text: "如有任何問題，歡迎與我們聯繫。",
                                    size: "sm",
                                    color: "#999999",
                                    margin: "lg",
                                    wrap: true,
                                },
                            ],
                        },
                        footer: {
                            type: "box",
                            layout: "vertical",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "button",
                                    style: "primary",
                                    height: "sm",
                                    action: {
                                        type: "uri",
                                        label: "重新預約",
                                        uri: liffId
                                            ? `https://liff.line.me/${liffId}`
                                            : "https://line.me",
                                    },
                                },
                            ],
                            flex: 0,
                        },
                    },
                },
            ],
        };
        try {
            logger.info("發送預約取消通知", {
                shopId,
                userId,
                hasToken: !!channelAccessToken,
            });
            const response = await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${channelAccessToken}`,
                },
                body: JSON.stringify(flexMessage),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error("發送預約取消通知失敗", {
                    shopId,
                    status: response.status,
                    body: errorText,
                });
            }
            else {
                logger.info("預約取消通知發送成功", { shopId, userId });
                // 記錄訊息統計
                await recordMessageSent(shopId, "appointment");
            }
        }
        catch (error) {
            logger.error("發送預約取消通知時發生錯誤", { shopId, error });
        }
    }
});
/**
 * Cloud Function: 查詢 LINE 訊息使用量統計
 * 從 admin 後台調用，顯示系統發送的訊息數量
 */
exports.getLineMessageQuota = (0, https_1.onRequest)({
    cors: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://pet-crm-bb6e9.web.app",
        "https://pet-crm-bb6e9.firebaseapp.com",
    ],
    region: "asia-east1",
}, async (req, res) => {
    // 設定 CORS headers
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    // 處理 preflight request
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    // 1. 驗證請求方法
    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        // 2. 取得 shopId（從 query 或 body）
        const shopId = req.method === "GET" ? req.query.shopId : req.body.shopId;
        logger.info("查詢 LINE 訊息使用量", { shopId });
        // 3. 驗證必要參數
        if (!shopId) {
            res.status(400).send({ error: "Missing shopId parameter" });
            return;
        }
        // 4. 取得當前年月
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const yearMonth = `${year}-${month}`;
        // 5. 查詢本月訊息統計
        const statsDoc = await db
            .collection("shops")
            .doc(shopId)
            .collection("messageStats")
            .doc(yearMonth)
            .get();
        let totalSent = 0;
        let appointmentNotifications = 0;
        let completionNotifications = 0;
        let reminderNotifications = 0;
        if (statsDoc.exists) {
            const data = statsDoc.data();
            totalSent = (data === null || data === void 0 ? void 0 : data.totalSent) || 0;
            appointmentNotifications = (data === null || data === void 0 ? void 0 : data.appointmentNotifications) || 0;
            completionNotifications = (data === null || data === void 0 ? void 0 : data.completionNotifications) || 0;
            reminderNotifications = (data === null || data === void 0 ? void 0 : data.reminderNotifications) || 0;
        }
        logger.info("LINE 訊息使用量查詢成功", {
            shopId,
            yearMonth,
            totalSent,
        });
        // 6. 回傳結果
        res.status(200).send({
            success: true,
            yearMonth,
            stats: {
                totalSent,
                breakdown: {
                    appointmentNotifications,
                    completionNotifications,
                    reminderNotifications,
                },
            },
        });
    }
    catch (error) {
        logger.error("查詢 LINE 訊息使用量時發生錯誤", { error });
        res.status(500).send({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * Cloud Function: 查詢 LINE Official Account 官方配額
 * 從 admin 後台調用，顯示 LINE OA 的免費配額和使用狀況
 */
exports.getLineOfficialQuota = (0, https_1.onRequest)({
    cors: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://pet-crm-bb6e9.web.app",
        "https://pet-crm-bb6e9.firebaseapp.com",
    ],
    region: "asia-east1",
}, async (req, res) => {
    // 設定 CORS headers
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    // 處理 preflight request
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    // 1. 驗證請求方法
    if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        // 2. 取得 shopId（從 query 或 body）
        const shopId = req.method === "GET" ? req.query.shopId : req.body.shopId;
        logger.info("查詢 LINE 官方配額", { shopId });
        // 3. 驗證必要參數
        if (!shopId) {
            res.status(400).send({ error: "Missing shopId parameter" });
            return;
        }
        // 4. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            res.status(404).send({ error: "Shop not found" });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        if (!channelAccessToken) {
            logger.error("店家未設定 LINE Channel Access Token", { shopId });
            res.status(400).send({
                error: "LINE API not configured",
                message: "請在 Superadmin 設定 LINE Channel Access Token",
            });
            return;
        }
        // 5. 並行調用 LINE API 查詢配額和使用量
        logger.info("調用 LINE API 查詢配額", { shopId });
        const [quotaRes, consumptionRes] = await Promise.all([
            fetch("https://api.line.me/v2/bot/message/quota", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${channelAccessToken}`,
                },
            }),
            fetch("https://api.line.me/v2/bot/message/quota/consumption", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${channelAccessToken}`,
                },
            }),
        ]);
        // 6. 檢查 API 回應
        if (!quotaRes.ok) {
            const errorText = await quotaRes.text();
            logger.error("LINE quota API 調用失敗", {
                shopId,
                status: quotaRes.status,
                error: errorText,
            });
            res.status(quotaRes.status).send({
                error: "LINE API error",
                message: "無法取得配額資訊",
                details: errorText,
            });
            return;
        }
        if (!consumptionRes.ok) {
            const errorText = await consumptionRes.text();
            logger.error("LINE consumption API 調用失敗", {
                shopId,
                status: consumptionRes.status,
                error: errorText,
            });
            res.status(consumptionRes.status).send({
                error: "LINE API error",
                message: "無法取得使用量資訊",
                details: errorText,
            });
            return;
        }
        // 7. 解析 API 回應
        const quotaData = await quotaRes.json();
        const consumptionData = await consumptionRes.json();
        logger.info("LINE API 回應", {
            shopId,
            quotaType: quotaData.type,
            quotaValue: quotaData.value,
            totalUsage: consumptionData.totalUsage,
        });
        // 8. 計算剩餘配額和使用率
        const quota = quotaData.value || 0;
        const used = consumptionData.totalUsage || 0;
        const remaining = Math.max(0, quota - used);
        const percentage = quota > 0 ? (used / quota) * 100 : 0;
        // 9. 回傳結果
        res.status(200).send({
            success: true,
            data: {
                quota: quota,
                used: used,
                remaining: remaining,
                percentage: Math.round(percentage * 10) / 10,
                type: quotaData.type, // "limited" or "none"
            },
        });
        logger.info("LINE 官方配額查詢成功", {
            shopId,
            quota,
            used,
            remaining,
            percentage: percentage.toFixed(1),
        });
    }
    catch (error) {
        logger.error("查詢 LINE 官方配額時發生錯誤", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        res.status(500).send({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * Helper function: 記錄訊息發送統計
 */
async function recordMessageSent(shopId, messageType) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const yearMonth = `${year}-${month}`;
        const statsRef = db
            .collection("shops")
            .doc(shopId)
            .collection("messageStats")
            .doc(yearMonth);
        // 使用 Firestore 的 increment 來原子性地增加計數
        const { FieldValue } = await Promise.resolve().then(() => __importStar(require("firebase-admin/firestore")));
        const updateData = {
            totalSent: FieldValue.increment(1),
            lastUpdated: FieldValue.serverTimestamp(),
        };
        // 根據訊息類型增加對應的計數
        switch (messageType) {
            case "appointment":
                updateData.appointmentNotifications = FieldValue.increment(1);
                break;
            case "completion":
                updateData.completionNotifications = FieldValue.increment(1);
                break;
            case "reminder":
                updateData.reminderNotifications = FieldValue.increment(1);
                break;
        }
        await statsRef.set(updateData, { merge: true });
        logger.info("訊息統計已更新", { shopId, yearMonth, messageType });
    }
    catch (error) {
        logger.error("更新訊息統計失敗", { shopId, messageType, error });
        // 不拋出錯誤，避免影響主要的訊息發送流程
    }
}
/**
 * Cloud Function: 發送服務完成通知並標記為已完成
 * 從 admin/mobile 狀態 tab 調用，點擊「LINE 通知主人完成」按鈕
 * 此操作不可逆，會同時發送通知並更新預約狀態為已完成
 */
exports.sendServiceCompletionNotification = (0, https_1.onRequest)({
    cors: true,
    region: "asia-east1",
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        const { shopId, appointmentId } = req.body;
        logger.info("收到服務完成通知請求", { shopId, appointmentId });
        if (!shopId || !appointmentId) {
            res.status(400).send({ error: "Missing required parameters" });
            return;
        }
        // 1. 獲取預約資料
        const appointmentRef = db
            .collection("shops")
            .doc(shopId)
            .collection("appointments")
            .doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();
        if (!appointmentDoc.exists) {
            res.status(404).send({ error: "Appointment not found" });
            return;
        }
        const appointment = appointmentDoc.data();
        const userId = appointment === null || appointment === void 0 ? void 0 : appointment.userId;
        if (!userId) {
            res.status(400).send({ error: "Missing userId" });
            return;
        }
        // 檢查是否為現場預約
        if (userId.startsWith("walk-in-")) {
            res.status(400).send({
                error: "Cannot send message to walk-in customers",
            });
            return;
        }
        // 2. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            res.status(404).send({ error: "Shop not found" });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        if (!channelAccessToken) {
            logger.error("店家未設定 LINE Channel Access Token", { shopId });
            res.status(400).send({
                error: "LINE API not configured for this shop",
                message: "請在 Superadmin 設定 Channel Access Token",
            });
            return;
        }
        // 3. 構建服務完成通知訊息（不含圖片）
        const flexMessage = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: `${(appointment === null || appointment === void 0 ? void 0 : appointment.petName) || "您的寶貝"}的服務已完成！`,
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "服務已完成",
                                    weight: "bold",
                                    size: "lg",
                                    margin: "sm",
                                },
                                {
                                    type: "separator",
                                    margin: "md",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "寵物",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.petName) || "您的寶貝",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "服務",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.serviceType) || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "狀態",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: "服務完成",
                                                    wrap: true,
                                                    color: "#000000",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "separator",
                                    margin: "lg",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    contents: [
                                        {
                                            type: "text",
                                            text: `期待再次為 ${(appointment === null || appointment === void 0 ? void 0 : appointment.petName) || "您的寶貝"} 服務`,
                                            wrap: true,
                                            color: "#999999",
                                            size: "sm",
                                            align: "center",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
        };
        // 4. 發送 LINE Push Message
        logger.info("準備發送服務完成通知", {
            userId: userId.substring(0, 5) + "***",
        });
        const pushResponse = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify(flexMessage),
        });
        if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            let errorDetail;
            try {
                errorDetail = JSON.parse(errorText);
            }
            catch (_a) {
                errorDetail = errorText;
            }
            logger.error("發送服務完成通知失敗", {
                status: pushResponse.status,
                error: errorDetail,
                userId: userId.substring(0, 5) + "***",
            });
            res.status(500).send({
                error: "Failed to send LINE message",
                details: errorDetail,
                status: pushResponse.status,
            });
            return;
        }
        logger.info("服務完成通知發送成功", {
            userId,
            petName: appointment === null || appointment === void 0 ? void 0 : appointment.petName,
        });
        // 5. 更新預約狀態為已完成（不可逆）
        await appointmentRef.update({
            status: "completed",
            completedAt: new Date().toISOString(),
        });
        logger.info("預約狀態已更新為已完成", { appointmentId });
        // 6. 記錄訊息統計
        await recordMessageSent(shopId, "completion");
        res.status(200).send({ success: true });
    }
    catch (error) {
        logger.error("發送服務完成通知時發生錯誤", error);
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * Cloud Function: 發送 LINE 完成照訊息（服務分享）
 * 從 admin/mobile 調用，發送服務完成通知給客戶（含圖片和自訂訊息）
 */
exports.sendLineCompletionMessage = (0, https_1.onRequest)({
    cors: true,
    region: "asia-east1",
}, async (req, res) => {
    // 1. 驗證請求方法
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        // 2. 取得請求參數
        const { shopId, userId, imageUrl, message, petName, serviceType, date, time, } = req.body;
        logger.info("收到完成照發送請求", { shopId, userId, petName });
        // 3. 驗證必要參數
        if (!shopId || !userId) {
            res.status(400).send({ error: "Missing required parameters" });
            return;
        }
        // 檢查是否為現場預約（walk-in）
        if (userId.startsWith("walk-in-")) {
            res.status(400).send({
                error: "Cannot send message to walk-in customers",
            });
            return;
        }
        // 4. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            res.status(404).send({ error: "Shop not found" });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        if (!channelAccessToken) {
            logger.error("店家未設定 LINE Channel Access Token", { shopId });
            res.status(400).send({
                error: "LINE API not configured for this shop",
                message: "請在 Superadmin 設定 Channel Access Token",
            });
            return;
        }
        // 5. 構建 Flex Message
        const bodyContents = [
            {
                type: "text",
                text: "完成分享",
                weight: "bold",
                size: "lg",
                margin: "sm",
            },
            {
                type: "separator",
                margin: "md",
            },
        ];
        // 如果沒有訊息，顯示說明文字
        if (!message) {
            bodyContents.push({
                type: "text",
                text: "服務已順利完成",
                margin: "lg",
                size: "md",
                wrap: true,
            });
        }
        // 添加欄位區塊
        bodyContents.push({
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        {
                            type: "text",
                            text: "寵物",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                        },
                        {
                            type: "text",
                            text: petName || "您的寶貝",
                            wrap: true,
                            color: "#666666",
                            size: "sm",
                            flex: 5,
                        },
                    ],
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        {
                            type: "text",
                            text: "服務",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                        },
                        {
                            type: "text",
                            text: serviceType || "未提供",
                            wrap: true,
                            color: "#666666",
                            size: "sm",
                            flex: 5,
                        },
                    ],
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        {
                            type: "text",
                            text: "日期",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                        },
                        {
                            type: "text",
                            text: date || "未提供",
                            wrap: true,
                            color: "#666666",
                            size: "sm",
                            flex: 5,
                        },
                    ],
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        {
                            type: "text",
                            text: "時間",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                        },
                        {
                            type: "text",
                            text: time || "未提供",
                            wrap: true,
                            color: "#666666",
                            size: "sm",
                            flex: 5,
                        },
                    ],
                },
                {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                        {
                            type: "text",
                            text: "狀態",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                        },
                        {
                            type: "text",
                            text: "服務完成",
                            wrap: true,
                            color: "#000000",
                            size: "sm",
                            flex: 5,
                        },
                    ],
                },
            ],
        });
        // 如果有訊息，添加訊息區塊
        if (message) {
            bodyContents.push({
                type: "separator",
                margin: "lg",
            });
            bodyContents.push({
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                    {
                        type: "text",
                        text: "訊息",
                        color: "#aaaaaa",
                        size: "xs",
                    },
                    {
                        type: "text",
                        text: message,
                        wrap: true,
                        color: "#000000",
                        size: "md",
                        margin: "sm",
                        weight: "bold",
                    },
                ],
            });
        }
        // 底部文字上方加分隔線（確保一定有）
        bodyContents.push({
            type: "separator",
            margin: "lg",
        });
        const flexMessage = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: bodyContents,
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                    {
                        type: "text",
                        text: `期待再次為 ${petName || "您的寶貝"} 服務`,
                        wrap: true,
                        color: "#999999",
                        size: "sm",
                        align: "center",
                    },
                ],
            },
        };
        // 如果有圖片，添加 hero 區塊
        if (imageUrl) {
            flexMessage.hero = {
                type: "image",
                url: imageUrl,
                size: "full",
                aspectRatio: "16:9",
                aspectMode: "cover",
            };
        }
        // 7. 發送 LINE Push Message
        const messagePayload = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: `${petName || "您的寶貝"}的服務已完成！`,
                    contents: flexMessage,
                },
            ],
        };
        logger.info("準備發送 LINE 訊息", {
            userId: userId.substring(0, 5) + "***",
            hasImage: !!imageUrl,
            hasMessage: !!message,
        });
        const pushResponse = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify(messagePayload),
        });
        if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            let errorDetail;
            try {
                errorDetail = JSON.parse(errorText);
            }
            catch (_a) {
                errorDetail = errorText;
            }
            logger.error("發送 LINE 訊息失敗", {
                status: pushResponse.status,
                error: errorDetail,
                userId: userId.substring(0, 5) + "***",
            });
            res.status(500).send({
                error: "Failed to send LINE message",
                details: errorDetail,
                status: pushResponse.status,
            });
            return;
        }
        logger.info("LINE 完成照訊息發送成功", { userId, petName });
        // 記錄訊息統計
        await recordMessageSent(shopId, "completion");
        res.status(200).send({ success: true });
    }
    catch (error) {
        logger.error("發送完成照訊息時發生錯誤", error);
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * Cloud Function: 發送 LINE 臨時回報訊息
 * 從 admin/mobile 調用，發送服務過程中的臨時回報給客戶
 */
exports.sendLineTempReportMessage = (0, https_1.onRequest)({
    cors: true,
    region: "asia-east1",
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        const { shopId, userId, imageUrl, message, petName, serviceType, date, time, } = req.body;
        logger.info("收到臨時回報發送請求", { shopId, userId, petName });
        if (!shopId || !userId) {
            res.status(400).send({ error: "Missing required parameters" });
            return;
        }
        if (userId.startsWith("walk-in-")) {
            res.status(400).send({
                error: "Cannot send message to walk-in customers",
            });
            return;
        }
        // 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            res.status(404).send({ error: "Shop not found" });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        if (!channelAccessToken) {
            logger.error("店家未設定 LINE Channel Access Token", { shopId });
            res.status(400).send({
                error: "LINE API not configured for this shop",
                message: "請在 Superadmin 設定 Channel Access Token",
            });
            return;
        }
        logger.info("使用店家的 Channel Access Token");
        // 構建 Flex Message
        const bodyContents = [
            {
                type: "text",
                text: "服務即時回報",
                weight: "bold",
                size: "lg",
                margin: "sm",
            },
            {
                type: "separator",
                margin: "md",
            },
            {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "寵物",
                                color: "#aaaaaa",
                                size: "sm",
                                flex: 2,
                            },
                            {
                                type: "text",
                                text: petName || "您的寶貝",
                                wrap: true,
                                color: "#666666",
                                size: "sm",
                                flex: 5,
                            },
                        ],
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "服務",
                                color: "#aaaaaa",
                                size: "sm",
                                flex: 2,
                            },
                            {
                                type: "text",
                                text: serviceType || "未提供",
                                wrap: true,
                                color: "#666666",
                                size: "sm",
                                flex: 5,
                            },
                        ],
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "日期",
                                color: "#aaaaaa",
                                size: "sm",
                                flex: 2,
                            },
                            {
                                type: "text",
                                text: date || "未提供",
                                wrap: true,
                                color: "#666666",
                                size: "sm",
                                flex: 5,
                            },
                        ],
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "時間",
                                color: "#aaaaaa",
                                size: "sm",
                                flex: 2,
                            },
                            {
                                type: "text",
                                text: time || "未提供",
                                wrap: true,
                                color: "#666666",
                                size: "sm",
                                flex: 5,
                            },
                        ],
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "狀態",
                                color: "#aaaaaa",
                                size: "sm",
                                flex: 2,
                            },
                            {
                                type: "text",
                                text: "服務進行中",
                                wrap: true,
                                color: "#000000",
                                size: "sm",
                                flex: 5,
                            },
                        ],
                    },
                ],
            },
        ];
        if (message) {
            bodyContents.push({
                type: "separator",
                margin: "lg",
            });
            bodyContents.push({
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                    {
                        type: "text",
                        text: "訊息",
                        color: "#aaaaaa",
                        size: "xs",
                    },
                    {
                        type: "text",
                        text: message,
                        wrap: true,
                        color: "#000000",
                        size: "md",
                        margin: "sm",
                        weight: "bold",
                    },
                ],
            });
        }
        // 底部文字上方加分隔線
        bodyContents.push({
            type: "separator",
            margin: "lg",
        });
        const flexMessage = {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: bodyContents,
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                    {
                        type: "text",
                        text: `為 ${petName || "您的寶貝"} 提供最好的照顧`,
                        wrap: true,
                        color: "#999999",
                        size: "sm",
                        align: "center",
                    },
                ],
            },
        };
        if (imageUrl) {
            flexMessage.hero = {
                type: "image",
                url: imageUrl,
                size: "full",
                aspectRatio: "16:9",
                aspectMode: "cover",
            };
        }
        // 發送 LINE Push Message
        const messagePayload = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: `${petName || "您的寶貝"}的服務即時回報`,
                    contents: flexMessage,
                },
            ],
        };
        logger.info("準備發送 LINE 訊息", {
            userId: userId.substring(0, 5) + "***",
            hasImage: !!imageUrl,
            hasMessage: !!message,
        });
        const pushResponse = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify(messagePayload),
        });
        if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            let errorDetail;
            try {
                errorDetail = JSON.parse(errorText);
            }
            catch (_a) {
                errorDetail = errorText;
            }
            logger.error("發送 LINE 訊息失敗", {
                status: pushResponse.status,
                error: errorDetail,
                userId: userId.substring(0, 5) + "***",
            });
            res.status(500).send({
                error: "Failed to send LINE message",
                details: errorDetail,
                status: pushResponse.status,
            });
            return;
        }
        logger.info("LINE 臨時回報訊息發送成功", { userId, petName });
        // 記錄訊息統計
        await recordMessageSent(shopId, "reminder");
        res.status(200).send({ success: true });
    }
    catch (error) {
        logger.error("發送臨時回報訊息時發生錯誤", error);
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * Cloud Function: 婉拒預約並發送通知
 * 從 admin/dashboard 調用，取代原本的取消預約功能
 * 發送婉拒通知給客戶，原因：繁忙，請改預約時段
 */
exports.declineAppointment = (0, https_1.onRequest)({
    cors: true,
    region: "asia-east1",
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        const { shopId, appointmentId, reason } = req.body;
        logger.info("收到婉拒預約請求", { shopId, appointmentId, reason });
        if (!shopId || !appointmentId) {
            res.status(400).send({ error: "Missing required parameters" });
            return;
        }
        // 驗證婉拒原因
        if (!reason || typeof reason !== "string" || !reason.trim()) {
            res.status(400).send({ error: "Decline reason is required" });
            return;
        }
        // 1. 獲取預約資料
        const appointmentRef = db
            .collection("shops")
            .doc(shopId)
            .collection("appointments")
            .doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();
        if (!appointmentDoc.exists) {
            res.status(404).send({ error: "Appointment not found" });
            return;
        }
        const appointment = appointmentDoc.data();
        const userId = appointment === null || appointment === void 0 ? void 0 : appointment.userId;
        if (!userId) {
            res.status(400).send({ error: "Missing userId" });
            return;
        }
        // 2. 更新預約狀態為已取消
        await appointmentRef.update({
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
            cancelReason: reason.trim(),
        });
        logger.info("預約已標記為婉拒", { appointmentId });
        // 檢查是否為現場預約（walk-in 不需要發送通知）
        if (userId.startsWith("walk-in-")) {
            logger.info("現場預約，不發送 LINE 通知", { userId });
            res.status(200).send({ success: true, message: "已婉拒現場預約" });
            return;
        }
        // 3. 從 Firestore 取得店家的 LINE API 設定
        const shopDoc = await db.collection("shops").doc(shopId).get();
        if (!shopDoc.exists) {
            logger.error("找不到商家資料", { shopId });
            res.status(200).send({
                success: true,
                message: "預約已婉拒，但店家資料不存在",
            });
            return;
        }
        const shopData = shopDoc.data();
        const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
        if (!channelAccessToken) {
            logger.error("店家未設定 LINE Channel Access Token", { shopId });
            res.status(200).send({
                success: true,
                message: "預約已婉拒，但未設定 LINE API",
            });
            return;
        }
        // 4. 構建婉拒通知訊息
        const flexMessage = {
            to: userId,
            messages: [
                {
                    type: "flex",
                    altText: "預約婉拒通知",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "預約婉拒通知",
                                    weight: "bold",
                                    size: "lg",
                                    margin: "sm",
                                },
                                {
                                    type: "separator",
                                    margin: "md",
                                },
                                {
                                    type: "text",
                                    text: "很抱歉，我們無法接受您的預約",
                                    margin: "lg",
                                    size: "md",
                                    wrap: true,
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "寵物",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.petName) || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "服務",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.serviceType) || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "原定日期",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.date) || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                        {
                                            type: "box",
                                            layout: "baseline",
                                            spacing: "sm",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "原定時間",
                                                    color: "#aaaaaa",
                                                    size: "sm",
                                                    flex: 2,
                                                },
                                                {
                                                    type: "text",
                                                    text: (appointment === null || appointment === void 0 ? void 0 : appointment.time) || "未提供",
                                                    wrap: true,
                                                    color: "#666666",
                                                    size: "sm",
                                                    flex: 5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "separator",
                                    margin: "lg",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "婉拒原因",
                                            color: "#aaaaaa",
                                            size: "xs",
                                        },
                                        {
                                            type: "text",
                                            text: reason.trim(),
                                            wrap: true,
                                            color: "#000000",
                                            size: "md",
                                            margin: "sm",
                                            weight: "bold",
                                        },
                                    ],
                                },
                                {
                                    type: "separator",
                                    margin: "lg",
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    margin: "lg",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "建議您改預約其他時段，感謝您的理解",
                                            wrap: true,
                                            color: "#999999",
                                            size: "sm",
                                            align: "center",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            ],
        };
        // 5. 發送 LINE Push Message
        logger.info("準備發送婉拒通知", {
            userId: userId.substring(0, 5) + "***",
        });
        const pushResponse = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify(flexMessage),
        });
        if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            let errorDetail;
            try {
                errorDetail = JSON.parse(errorText);
            }
            catch (_a) {
                errorDetail = errorText;
            }
            logger.error("發送婉拒通知失敗", {
                status: pushResponse.status,
                error: errorDetail,
                userId: userId.substring(0, 5) + "***",
            });
            // 即使發送失敗，預約已經被婉拒，所以還是回傳成功
            res.status(200).send({
                success: true,
                message: "預約已婉拒，但通知發送失敗",
                lineError: errorDetail,
            });
            return;
        }
        logger.info("婉拒通知發送成功", { userId, appointmentId });
        // 6. 記錄訊息統計（使用 reminder 類型）
        await recordMessageSent(shopId, "reminder");
        res.status(200).send({ success: true });
    }
    catch (error) {
        logger.error("婉拒預約時發生錯誤", error);
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * Cloud Function: LINE Webhook 接收器
 * 接收 LINE 平台的 Webhook 事件，處理關鍵字自動回覆
 */
exports.lineWebhook = (0, https_1.onRequest)({
    cors: false,
    region: "asia-east1",
    timeoutSeconds: 60,
}, async (req, res) => {
    var _a, _b;
    // 只接受 POST 請求
    if (req.method !== "POST") {
        res.status(405).send({ error: "Method not allowed" });
        return;
    }
    try {
        const signature = req.headers["x-line-signature"];
        const body = JSON.stringify(req.body);
        logger.info("收到 LINE Webhook 請求", {
            signature: (signature === null || signature === void 0 ? void 0 : signature.substring(0, 10)) + "...",
            bodyLength: body.length,
        });
        // 解析 webhook 事件
        const webhookData = req.body;
        if (!webhookData.events || webhookData.events.length === 0) {
            res.status(200).send({ message: "No events to process" });
            return;
        }
        // 處理每個事件
        for (const event of webhookData.events) {
            // 處理 follow 事件（用戶加入好友）
            if (event.type === "follow") {
                const userId = event.source.userId;
                const destination = webhookData.destination;
                logger.info("收到 follow 事件", {
                    userId: userId.substring(0, 5) + "***",
                    destination: destination.substring(0, 5) + "***",
                });
                // 根據 Bot User ID 查詢商家
                const shopId = await findShopIdByBotUserId(destination);
                if (!shopId) {
                    logger.error("找不到對應的商家", {
                        destination: destination.substring(0, 5) + "***",
                    });
                    continue;
                }
                logger.info("找到對應商家", { shopId });
                // 取得店鋪的 LINE API 設定
                const shopDoc = await db.collection("shops").doc(shopId).get();
                if (!shopDoc.exists) {
                    logger.error("店鋪資料不存在", { shopId });
                    continue;
                }
                const shopData = shopDoc.data();
                const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
                if (!channelAccessToken) {
                    logger.error("店鋪未設定 LINE Channel Access Token", { shopId });
                    continue;
                }
                // 呼叫 LINE Profile API 取得用戶資料
                try {
                    const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${channelAccessToken}`,
                        },
                    });
                    if (!profileResponse.ok) {
                        const errorText = await profileResponse.text();
                        logger.error("取得用戶資料失敗", {
                            status: profileResponse.status,
                            error: errorText,
                        });
                        continue;
                    }
                    const profile = await profileResponse.json();
                    logger.info("取得用戶資料成功", {
                        userId: userId.substring(0, 5) + "***",
                        displayName: profile.displayName,
                    });
                    // 寫入 Firestore（使用 merge 避免覆蓋現有資料）
                    const { FieldValue } = await Promise.resolve().then(() => __importStar(require("firebase-admin/firestore")));
                    await db
                        .collection("shops")
                        .doc(shopId)
                        .collection("users")
                        .doc(userId)
                        .set({
                        uid: userId,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl || "",
                        shopId: shopId,
                        followedAt: new Date().toISOString(),
                        status: "active",
                        role: "customer",
                        createdAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    logger.info("用戶資料已寫入 Firestore", {
                        shopId,
                        userId: userId.substring(0, 5) + "***",
                    });
                }
                catch (error) {
                    logger.error("處理 follow 事件時發生錯誤", { error });
                }
                continue;
            }
            // 處理 unfollow 事件（用戶封鎖或取消好友）
            if (event.type === "unfollow") {
                const userId = event.source.userId;
                const destination = webhookData.destination;
                logger.info("收到 unfollow 事件", {
                    userId: userId.substring(0, 5) + "***",
                    destination: destination.substring(0, 5) + "***",
                });
                // 根據 Bot User ID 查詢商家
                const shopId = await findShopIdByBotUserId(destination);
                if (!shopId) {
                    logger.error("找不到對應的商家", {
                        destination: destination.substring(0, 5) + "***",
                    });
                    continue;
                }
                // 更新用戶狀態為 blocked
                try {
                    const userRef = db
                        .collection("shops")
                        .doc(shopId)
                        .collection("users")
                        .doc(userId);
                    const userDoc = await userRef.get();
                    if (userDoc.exists) {
                        await userRef.update({
                            status: "blocked",
                            unfollowedAt: new Date().toISOString(),
                        });
                        logger.info("用戶狀態已更新為 blocked", {
                            shopId,
                            userId: userId.substring(0, 5) + "***",
                        });
                    }
                    else {
                        logger.warn("找不到用戶資料", {
                            shopId,
                            userId: userId.substring(0, 5) + "***",
                        });
                    }
                }
                catch (error) {
                    logger.error("處理 unfollow 事件時發生錯誤", { error });
                }
                continue;
            }
            // 處理文字訊息事件
            if (event.type !== "message" || ((_a = event.message) === null || _a === void 0 ? void 0 : _a.type) !== "text") {
                logger.info("略過其他類型事件", { type: event.type });
                continue;
            }
            const userMessage = ((_b = event.message.text) === null || _b === void 0 ? void 0 : _b.trim()) || "";
            const replyToken = event.replyToken;
            const userId = event.source.userId;
            logger.info("處理文字訊息", {
                userId: userId.substring(0, 5) + "***",
                message: userMessage,
            });
            // 根據 userId 查詢用戶所屬的店鋪
            const shopId = await findShopIdByUserId(userId);
            if (!shopId) {
                logger.info("找不到用戶所屬的店鋪", {
                    userId: userId.substring(0, 5) + "***",
                });
                continue;
            }
            logger.info("找到用戶所屬店鋪", { shopId });
            // 取得店鋪的 LINE API 設定
            const shopDoc = await db.collection("shops").doc(shopId).get();
            if (!shopDoc.exists) {
                logger.error("店鋪資料不存在", { shopId });
                continue;
            }
            const shopData = shopDoc.data();
            const channelAccessToken = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelAccessToken;
            const channelSecret = shopData === null || shopData === void 0 ? void 0 : shopData.lineChannelSecret;
            if (!channelAccessToken) {
                logger.error("店鋪未設定 LINE Channel Access Token", { shopId });
                continue;
            }
            // 驗證 LINE Signature（如果有提供 Channel Secret）
            if (channelSecret && signature) {
                const isValid = validateLineSignature(body, signature, channelSecret);
                if (!isValid) {
                    logger.error("LINE Signature 驗證失敗", { shopId });
                    res.status(401).send({ error: "Invalid signature" });
                    return;
                }
            }
            // 查詢該店鋪的自動回覆規則
            const rulesSnapshot = await db
                .collection("shops")
                .doc(shopId)
                .collection("autoReplyRules")
                .where("isActive", "==", true)
                .get();
            if (rulesSnapshot.empty) {
                logger.info("店鋪沒有啟用的自動回覆規則", { shopId });
                continue;
            }
            // 匹配關鍵字（部分符合，不區分大小寫）
            let matchedRule = null;
            const userMessageLower = userMessage.toLowerCase();
            for (const ruleDoc of rulesSnapshot.docs) {
                const rule = ruleDoc.data();
                const keywordLower = rule.keyword.toLowerCase();
                // 部分符合：用戶訊息包含關鍵字
                if (userMessageLower.includes(keywordLower)) {
                    matchedRule = {
                        keyword: rule.keyword,
                        replyMessage: rule.replyMessage,
                    };
                    logger.info("匹配到關鍵字", {
                        keyword: rule.keyword,
                        userMessage,
                    });
                    break; // 只回覆第一個匹配的規則
                }
            }
            // 如果沒有匹配到關鍵字，不回覆
            if (!matchedRule) {
                logger.info("沒有匹配到關鍵字", { userMessage });
                continue;
            }
            // 使用 Reply Token 回覆訊息
            const replyPayload = {
                replyToken: replyToken,
                messages: [
                    {
                        type: "text",
                        text: matchedRule.replyMessage,
                    },
                ],
            };
            logger.info("準備回覆訊息", {
                keyword: matchedRule.keyword,
                messagePreview: matchedRule.replyMessage.substring(0, 50),
            });
            const replyResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${channelAccessToken}`,
                },
                body: JSON.stringify(replyPayload),
            });
            if (!replyResponse.ok) {
                const errorText = await replyResponse.text();
                logger.error("回覆訊息失敗", {
                    status: replyResponse.status,
                    error: errorText,
                });
            }
            else {
                logger.info("回覆訊息成功", {
                    keyword: matchedRule.keyword,
                    shopId,
                });
                // 記錄統計（可選）
                try {
                    await recordMessageSent(shopId, "reminder");
                }
                catch (err) {
                    logger.error("記錄統計失敗", { shopId, error: err });
                }
            }
        }
        // 回應 LINE 平台
        res.status(200).send({ message: "OK" });
    }
    catch (error) {
        logger.error("處理 LINE Webhook 時發生錯誤", { error });
        res.status(500).send({ error: "Internal server error" });
    }
});
/**
 * Helper function: 驗證 LINE Signature
 */
function validateLineSignature(body, signature, channelSecret) {
    const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(body)
        .digest("base64");
    return hash === signature;
}
/**
 * Helper function: 根據 LINE User ID 查詢店鋪 ID
 * 透過查詢 users collection 找到用戶，然後查詢該用戶的預約來確定店鋪
 */
async function findShopIdByUserId(userId) {
    try {
        // 方法 1: 查詢所有店鋪的預約，找到該用戶的預約
        const shopsSnapshot = await db.collection("shops").get();
        for (const shopDoc of shopsSnapshot.docs) {
            const appointmentsSnapshot = await db
                .collection("shops")
                .doc(shopDoc.id)
                .collection("appointments")
                .where("userId", "==", userId)
                .limit(1)
                .get();
            if (!appointmentsSnapshot.empty) {
                return shopDoc.id;
            }
        }
        // 如果找不到，記錄警告
        logger.warn("找不到用戶的店鋪", { userId: userId.substring(0, 5) + "***" });
        return null;
    }
    catch (error) {
        logger.error("查詢用戶店鋪時發生錯誤", { error });
        return null;
    }
}
/**
 * Helper function: 根據 LINE Bot User ID 查詢店鋪 ID
 * 用於 follow/unfollow 事件，透過 webhook 的 destination 欄位識別商家
 */
async function findShopIdByBotUserId(botUserId) {
    try {
        const shopsSnapshot = await db
            .collection("shops")
            .where("lineBotUserId", "==", botUserId)
            .limit(1)
            .get();
        if (shopsSnapshot.empty) {
            logger.warn("找不到對應的商家", {
                botUserId: botUserId.substring(0, 5) + "***",
            });
            return null;
        }
        return shopsSnapshot.docs[0].id;
    }
    catch (error) {
        logger.error("查詢商家時發生錯誤", { error });
        return null;
    }
}
// ===== 訂閱管理：定時檢查過期訂閱 =====
/**
 * 每天 00:00（台北時間）自動檢查所有店鋪的訂閱狀態
 * 將已過期的訂閱標記為 expired
 */
exports.checkExpiredSubscriptions = (0, scheduler_1.onSchedule)({
    schedule: "0 0 * * *",
    timeZone: "Asia/Taipei",
    memory: "256MiB",
}, async (event) => {
    logger.info("開始檢查過期訂閱", { time: new Date().toISOString() });
    try {
        const now = new Date();
        const shopsSnapshot = await db.collection("shops").get();
        if (shopsSnapshot.empty) {
            logger.info("沒有店鋪需要檢查");
            return;
        }
        const batch = db.batch();
        let expiredCount = 0;
        let checkedCount = 0;
        for (const shopDoc of shopsSnapshot.docs) {
            const shopData = shopDoc.data();
            const subscription = shopData.subscription;
            // 只檢查狀態為 active 的訂閱
            if (subscription && subscription.status === "active") {
                checkedCount++;
                const expiryDate = new Date(subscription.expiryDate);
                // 如果已過期，更新狀態為 expired
                if (now > expiryDate) {
                    logger.info("發現過期訂閱", {
                        shopId: shopDoc.id,
                        shopName: shopData.name,
                        expiryDate: subscription.expiryDate,
                    });
                    batch.update(shopDoc.ref, {
                        "subscription.status": "expired",
                        "subscription.updatedAt": now.toISOString(),
                    });
                    expiredCount++;
                }
            }
        }
        // 如果有需要更新的訂閱，執行 batch
        if (expiredCount > 0) {
            await batch.commit();
            logger.info("訂閱過期檢查完成", {
                totalShops: shopsSnapshot.size,
                checkedSubscriptions: checkedCount,
                expiredCount: expiredCount,
            });
        }
        else {
            logger.info("訂閱過期檢查完成（無過期訂閱）", {
                totalShops: shopsSnapshot.size,
                checkedSubscriptions: checkedCount,
            });
        }
    }
    catch (error) {
        logger.error("檢查過期訂閱時發生錯誤", error);
        throw error;
    }
});
// ===== 訂閱管理：手動觸發檢查過期訂閱（用於測試） =====
/**
 * HTTP 端點：手動觸發檢查過期訂閱
 * 用於測試或手動執行
 */
exports.manualCheckExpiredSubscriptions = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // 檢查授權（可選）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).send({ error: "Unauthorized" });
        return;
    }
    logger.info("手動檢查過期訂閱觸發", {
        time: new Date().toISOString(),
    });
    try {
        const now = new Date();
        const shopsSnapshot = await db.collection("shops").get();
        if (shopsSnapshot.empty) {
            res.status(200).send({
                success: true,
                message: "沒有店鋪需要檢查",
                totalShops: 0,
            });
            return;
        }
        const batch = db.batch();
        let expiredCount = 0;
        let checkedCount = 0;
        const expiredShops = [];
        for (const shopDoc of shopsSnapshot.docs) {
            const shopData = shopDoc.data();
            const subscription = shopData.subscription;
            if (subscription && subscription.status === "active") {
                checkedCount++;
                const expiryDate = new Date(subscription.expiryDate);
                if (now > expiryDate) {
                    batch.update(shopDoc.ref, {
                        "subscription.status": "expired",
                        "subscription.updatedAt": now.toISOString(),
                    });
                    expiredCount++;
                    expiredShops.push({
                        shopId: shopDoc.id,
                        shopName: shopData.name,
                        expiryDate: subscription.expiryDate,
                    });
                }
            }
        }
        if (expiredCount > 0) {
            await batch.commit();
        }
        res.status(200).send({
            success: true,
            message: "訂閱過期檢查完成",
            totalShops: shopsSnapshot.size,
            checkedSubscriptions: checkedCount,
            expiredCount: expiredCount,
            expiredShops: expiredShops,
        });
    }
    catch (error) {
        logger.error("手動檢查過期訂閱時發生錯誤", error);
        res.status(500).send({
            success: false,
            error: "Internal server error",
        });
    }
});
//# sourceMappingURL=index.js.map