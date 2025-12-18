import { useState } from 'react';
import { useAutoReplyRules } from '../../hooks/useAutoReplyRules';
import type {
  AutoReplyRule,
  CreateAutoReplyRuleInput,
} from '../../types/auto-reply';

interface AutoReplyManagementProps {
  shopId: string;
}

export const AutoReplyManagement: React.FC<AutoReplyManagementProps> = ({
  shopId,
}) => {
  const { rules, loading, createRule, updateRule, deleteRule, toggleRule } =
    useAutoReplyRules(shopId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [formData, setFormData] = useState<CreateAutoReplyRuleInput>({
    keyword: '',
    replyMessage: '',
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 篩選規則
  const filteredRules = rules.filter((rule) =>
    rule.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 開啟新增 Modal
  const handleOpenAddModal = () => {
    setEditingRule(null);
    setFormData({
      keyword: '',
      replyMessage: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // 開啟編輯 Modal
  const handleOpenEditModal = (rule: AutoReplyRule) => {
    setEditingRule(rule);
    setFormData({
      keyword: rule.keyword,
      replyMessage: rule.replyMessage,
      isActive: rule.isActive,
    });
    setIsModalOpen(true);
  };

  // 關閉 Modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData({
      keyword: '',
      replyMessage: '',
      isActive: true,
    });
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRule) {
        // 更新規則
        await updateRule({
          id: editingRule.id,
          keyword: formData.keyword,
          replyMessage: formData.replyMessage,
          isActive: formData.isActive,
        });
      } else {
        // 新增規則
        await createRule(formData);
      }
      handleCloseModal();
    } catch (err) {
      // 錯誤已在 Hook 中處理
    } finally {
      setSubmitting(false);
    }
  };

  // 刪除規則
  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule(ruleId);
      setDeleteConfirmId(null);
    } catch (err) {
      // 錯誤已在 Hook 中處理
    }
  };

  // 切換啟用狀態
  const handleToggle = async (ruleId: string) => {
    try {
      await toggleRule(ruleId);
    } catch (err) {
      // 錯誤已在 Hook 中處理
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span>🤖</span>
          <span>自動回覆管理</span>
        </h1>
        <p className="text-gray-600">
          設定 LINE 關鍵字自動回覆，當客戶傳送包含關鍵字的訊息時，系統會自動回覆預設內容。
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <button
          onClick={handleOpenAddModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>新增關鍵字</span>
        </button>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="搜尋關鍵字..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchTerm ? '找不到符合的關鍵字' : '尚未設定任何自動回覆規則'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? '請嘗試其他搜尋詞'
              : '點擊「新增關鍵字」按鈕開始設定您的第一個自動回覆規則'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenAddModal}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              新增第一個關鍵字
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  關鍵字
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  回覆訊息預覽
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {rule.keyword}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {rule.replyMessage.length > 60
                        ? `${rule.replyMessage.substring(0, 60)}...`
                        : rule.replyMessage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.isActive ? '✅ 已啟用' : '❌ 已停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenEditModal(rule)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="編輯"
                    >
                      ✏️ 編輯
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(rule.id)}
                      className="text-red-600 hover:text-red-900"
                      title="刪除"
                    >
                      🗑️ 刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 統計資訊 */}
      <div className="mt-4 text-sm text-gray-600">
        共 {rules.length} 個規則，
        {rules.filter((r) => r.isActive).length} 個已啟用
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {editingRule ? '編輯關鍵字規則' : '新增關鍵字規則'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 關鍵字 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    關鍵字 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) =>
                      setFormData({ ...formData, keyword: e.target.value })
                    }
                    placeholder="例如：營業時間、價格、預約方式"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={50}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    當客戶傳送的訊息包含此關鍵字時，系統會自動回覆
                  </p>
                </div>

                {/* 回覆訊息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    回覆訊息 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.replyMessage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        replyMessage: e.target.value,
                      })
                    }
                    placeholder="請輸入要自動回覆的訊息內容"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    maxLength={2000}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.replyMessage.length} / 2000 字元
                  </p>
                </div>

                {/* 啟用狀態 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    啟用此規則
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    disabled={submitting}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    {submitting ? '儲存中...' : '儲存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              確認刪除
            </h3>
            <p className="text-gray-600 mb-6">
              確定要刪除這個自動回覆規則嗎？此操作無法復原。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReplyManagement;
