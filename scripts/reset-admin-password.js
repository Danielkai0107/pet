/**
 * 重設 Admin 用戶密碼
 *
 * 使用方法：
 * 1. npm install firebase-admin
 * 2. 從 Firebase Console 下載 Service Account Key (serviceAccountKey.json)
 * 3. node scripts/reset-admin-password.js
 */

const admin = require("firebase-admin");
const readline = require("readline");

// 初始化 Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require("../serviceAccountKey.json");
} catch (error) {
  console.error("❌ 找不到 serviceAccountKey.json");
  console.log("請從 Firebase Console 下載 Service Account Key");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  console.log("🔐 Admin 密碼重設工具\n");

  try {
    const uid = await question(
      "請輸入 Admin UID (例如: alfQkwfXePfFuwHBHaPZf9M0iCz1): "
    );

    // 檢查用戶是否存在
    try {
      const userRecord = await auth.getUser(uid);
      console.log(`✅ 找到用戶: ${userRecord.email}`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        console.error("❌ Authentication 中找不到此 UID 的用戶");
        console.log(
          "\n您需要先在 Firebase Console → Authentication 建立此用戶"
        );
        console.log("或者使用 create-admin.js 腳本建立新用戶");
        rl.close();
        return;
      }
      throw error;
    }

    const newPassword = await question("請輸入新密碼 (至少 6 個字元): ");

    if (newPassword.length < 6) {
      throw new Error("密碼必須至少 6 個字元");
    }

    // 更新密碼
    await auth.updateUser(uid, {
      password: newPassword,
    });

    console.log("\n✅ 密碼已成功重設！");
    console.log(`新密碼: ${newPassword}`);
    console.log("\n請使用新密碼登入：");
    console.log("https://pet-crm-bb6e9.web.app/admin/login");
  } catch (error) {
    console.error("❌ 操作失敗:", error.message);
  } finally {
    rl.close();
  }
}

resetPassword();


