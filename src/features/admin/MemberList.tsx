import { useMemo } from "react";
import { useShopUsers } from "../../hooks/useShopUsers";
import { UserCheck, Users } from "lucide-react";

interface MemberListProps {
  shopId: string;
  searchQuery: string;
}

export const MemberList = ({ shopId, searchQuery }: MemberListProps) => {
  const { users, loading } = useShopUsers(shopId);

  // 只顯示 active 狀態的會員
  const activeMembers = useMemo(() => {
    return users.filter((user) => user.status === "active");
  }, [users]);

  // 搜尋過濾
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;

    const query = searchQuery.toLowerCase();
    return activeMembers.filter((member) => {
      // 會員名稱
      if (
        member.displayName &&
        member.displayName.toLowerCase().includes(query)
      )
        return true;

      // 手機號碼
      if (member.phone && member.phone.includes(query)) return true;

      return false;
    });
  }, [activeMembers, searchQuery]);

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return dateString.split("T")[0];
  };

  if (loading) {
    return (
      <div className="member-list-container">
        <div className="loading-state">載入中...</div>
      </div>
    );
  }

  return (
    <div className="member-list-container">
      {/* Member Table Widget */}
      <div className="auto-reply-rules-widget">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-icon" />
            <h3>尚無會員資料</h3>
            <p>會員會在加入 LINE 官方帳號時自動新增</p>
          </div>
        ) : (
          <table className="rules-table">
            <thead>
              <tr>
                <th>會員</th>
                <th>電話</th>
                <th>加入時間</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.uid}>
                  <td className="member-cell">
                    <div className="member-info">
                      <div className="member-avatar">
                        {member.pictureUrl ? (
                          <img
                            src={member.pictureUrl}
                            alt={member.displayName}
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="member-details">
                        <div className="member-name">{member.displayName}</div>
                        <div className="member-id">
                          ID: {member.uid.substring(0, 12)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="phone-cell">{member.phone || "未提供"}</td>
                  <td className="date-cell">{formatDate(member.followedAt)}</td>
                  <td className="status-cell">
                    <span
                      className={`status-button ${
                        member.status === "active" ? "active" : "inactive"
                      }`}
                    >
                      {member.status === "active" ? "✓ 活躍" : "已封鎖"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
