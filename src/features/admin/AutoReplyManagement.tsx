import { useState } from "react";
import { useAutoReplyRules } from "../../hooks/useAutoReplyRules";
import type {
  AutoReplyRule,
  CreateAutoReplyRuleInput,
} from "../../types/auto-reply";
import { MessageSquare, Search, Plus } from "lucide-react";

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
    keyword: "",
    replyMessage: "",
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
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
      keyword: "",
      replyMessage: "",
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
      keyword: "",
      replyMessage: "",
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
      <div className="auto-reply-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="auto-reply-container">
      {/* Header Widget */}
      <div className="auto-reply-header-widget">
        <div className="widget-header">
          <div className="header-icon">
            <MessageSquare />
          </div>
          <div className="header-content">
            <h3>自動回覆管理</h3>
            <p>
              設定 LINE
              關鍵字自動回覆，當客戶傳送包含關鍵字的訊息時，系統會自動回覆預設內容。
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar Widget */}
      <div className="auto-reply-actions-widget">
        <div className="actions-bar">
          <button onClick={handleOpenAddModal} className="add-button">
            <Plus size={20} />
            <span>新增關鍵字</span>
          </button>

          <div className="search-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="搜尋關鍵字..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Rules List Widget */}
      <div className="auto-reply-rules-widget">
        {filteredRules.length === 0 ? (
          <div className="empty-state">
            <MessageSquare className="empty-icon" />
            <h3>
              {searchTerm ? "找不到符合的關鍵字" : "尚未設定任何自動回覆規則"}
            </h3>
            <p>
              {searchTerm
                ? "請嘗試其他搜尋詞"
                : "點擊「新增關鍵字」按鈕開始設定您的第一個自動回覆規則"}
            </p>
            {!searchTerm && (
              <button
                onClick={handleOpenAddModal}
                className="empty-action-button"
              >
                新增第一個關鍵字
              </button>
            )}
          </div>
        ) : (
          <table className="rules-table">
            <thead>
              <tr>
                <th>關鍵字</th>
                <th>回覆訊息預覽</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="keyword-cell">{rule.keyword}</td>
                  <td className="message-cell">
                    <div className="message-preview">
                      {rule.replyMessage.length > 60
                        ? `${rule.replyMessage.substring(0, 60)}...`
                        : rule.replyMessage}
                    </div>
                  </td>
                  <td className="status-cell">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      className={`status-button ${
                        rule.isActive ? "active" : "inactive"
                      }`}
                    >
                      {rule.isActive ? "已啟用" : "已停用"}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleOpenEditModal(rule)}
                      className="action-button edit-button"
                      title="編輯"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(rule.id)}
                      className="action-button delete-button"
                      title="刪除"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats Widget */}
      <div className="auto-reply-stats-widget">
        <p className="stats-text">
          共 {rules.length} 個規則，
          {rules.filter((r) => r.isActive).length} 個已啟用
        </p>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <h2 className="modal-title">
                {editingRule ? "編輯關鍵字規則" : "新增關鍵字規則"}
              </h2>

              <form onSubmit={handleSubmit} className="modal-form">
                {/* 關鍵字 */}
                <div className="form-group">
                  <label className="form-label">
                    關鍵字 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) =>
                      setFormData({ ...formData, keyword: e.target.value })
                    }
                    placeholder="例如：營業時間、價格、預約方式"
                    className="form-input"
                    required
                    maxLength={50}
                  />
                  <p className="form-hint">
                    當客戶傳送的訊息包含此關鍵字時，系統會自動回覆
                  </p>
                </div>

                {/* 回覆訊息 */}
                <div className="form-group">
                  <label className="form-label">
                    回覆訊息 <span className="required">*</span>
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
                    className="form-textarea"
                    required
                    maxLength={2000}
                  />
                  <p className="form-hint">
                    {formData.replyMessage.length} / 2000 字元
                  </p>
                </div>

                {/* 啟用狀態 */}
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="form-checkbox"
                  />
                  <label htmlFor="isActive">啟用此規則</label>
                </div>

                {/* Buttons */}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="cancel-button"
                    disabled={submitting}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={submitting}
                  >
                    {submitting ? "儲存中..." : "儲存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay delete-confirm">
          <div className="modal-content">
            <div className="modal-body">
              <h3 className="modal-title">確認刪除</h3>
              <p className="modal-text">
                確定要刪除這個自動回覆規則嗎？此操作無法復原。
              </p>
              <div className="confirm-actions">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="cancel-button"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="delete-button"
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReplyManagement;
