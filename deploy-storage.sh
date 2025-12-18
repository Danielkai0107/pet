#!/bin/bash

# Firebase Storage 規則部署腳本
# 請先在 Firebase Console 啟用 Storage 後再執行此腳本

echo "🚀 開始部署 Firebase Storage 規則..."
echo ""

firebase deploy --only storage:rules

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Storage 規則部署成功！"
    echo ""
    echo "📋 已部署的規則："
    echo "  - Firestore Rules: ✅"
    echo "  - Storage Rules: ✅"
    echo ""
    echo "🔗 查看規則："
    echo "  Firestore: https://console.firebase.google.com/project/pet-crm-bb6e9/firestore/rules"
    echo "  Storage: https://console.firebase.google.com/project/pet-crm-bb6e9/storage/rules"
else
    echo ""
    echo "❌ 部署失敗"
    echo ""
    echo "請確認："
    echo "  1. Firebase Storage 已在 Console 中啟用"
    echo "  2. 已登入 Firebase CLI (firebase login)"
    echo "  3. 已選擇正確的專案 (firebase use pet-crm-bb6e9)"
fi

