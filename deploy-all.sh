#!/bin/bash

# 完整部署腳本 - Firebase Rules + Hosting
# 用於部署所有 Firebase 資源

echo "🚀 Pet Medical CRM - 完整部署腳本"
echo "=================================="
echo ""

# 檢查是否登入 Firebase
echo "🔍 檢查 Firebase 登入狀態..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 未登入 Firebase CLI"
    echo "請執行: firebase login"
    exit 1
fi
echo "✅ Firebase CLI 已登入"
echo ""

# 確認專案
PROJECT_ID="pet-crm-bb6e9"
echo "📦 當前專案: $PROJECT_ID"
firebase use $PROJECT_ID
echo ""

# 部署 Firestore 規則
echo "📤 部署 Firestore 規則..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "❌ Firestore 規則部署失敗"
    exit 1
fi
echo "✅ Firestore 規則部署成功"
echo ""

# 嘗試部署 Storage 規則
echo "📤 嘗試部署 Storage 規則..."
firebase deploy --only storage:rules 2>&1 | tee /tmp/storage_deploy.log
if grep -q "has not been set up" /tmp/storage_deploy.log; then
    echo "⚠️  Storage 尚未啟用"
    echo "📝 請前往以下連結啟用 Storage："
    echo "   https://console.firebase.google.com/project/$PROJECT_ID/storage"
    echo ""
    echo "啟用後，執行以下指令部署 Storage 規則："
    echo "   ./deploy-storage.sh"
    echo ""
else
    echo "✅ Storage 規則部署成功"
    echo ""
fi

# 詢問是否要部署 Hosting
echo ""
read -p "是否要建置並部署 Hosting？(y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🏗️  建置前端應用..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ 建置失敗"
        exit 1
    fi
    echo "✅ 建置完成"
    echo ""
    
    echo "📤 部署 Hosting..."
    firebase deploy --only hosting
    if [ $? -ne 0 ]; then
        echo "❌ Hosting 部署失敗"
        exit 1
    fi
    echo "✅ Hosting 部署成功"
fi

echo ""
echo "=================================="
echo "🎉 部署完成！"
echo ""
echo "📋 部署摘要："
echo "  ✅ Firestore Rules"
if ! grep -q "has not been set up" /tmp/storage_deploy.log 2>/dev/null; then
    echo "  ✅ Storage Rules"
else
    echo "  ⚠️  Storage Rules (需要手動啟用)"
fi

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  ✅ Hosting"
fi

echo ""
echo "🔗 管理連結："
echo "  Console: https://console.firebase.google.com/project/$PROJECT_ID/overview"
echo "  Firestore: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
echo "  Storage: https://console.firebase.google.com/project/$PROJECT_ID/storage"
echo "  Hosting: https://console.firebase.google.com/project/$PROJECT_ID/hosting"
echo ""

