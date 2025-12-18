import { useState, useMemo } from "react";
import { useShopUsers } from "../../hooks/useShopUsers";
import { UserCheck, Search, Users } from "lucide-react";

interface MemberListProps {
  shopId: string;
  searchQuery: string;
}

export const MemberList = ({ shopId, searchQuery }: MemberListProps) => {
  const { users, loading } = useShopUsers(shopId);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

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
      if (member.displayName && member.displayName.toLowerCase().includes(query))
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
    <div className="member-grid">
      {/* Left: Member List */}
      <div className="member-list-panel">
        <div className="panel-header">
          <div className="header-left">
            <UserCheck size={20} style={{ color: "#06C755" }} />
            <span className="title-text">LINE 會員</span>
          </div>
          <div className="header-right">
            <span className="count-text">共 {filteredMembers.length} 位</span>
          </div>
        </div>

        <div className="member-scroll">
          {filteredMembers.map((member) => (
            <button
              key={member.uid}
              onClick={() => setSelectedMember(member.uid)}
              className={`member-card ${
                selectedMember === member.uid ? "selected" : ""
              }`}
            >
              {/* Left: Avatar */}
              <div className="card-avatar">
                {member.pictureUrl ? (
                  <img src={member.pictureUrl} alt={member.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    {member.displayName && member.displayName.length > 0
                      ? member.displayName.charAt(0).toUpperCase()
                      : "?"}
                  </div>
                )}
              </div>

              {/* Right: Member Info */}
              <div className="card-info">
                <div className="card-title">{member.displayName}</div>
                <div className="card-details">
                  <span className="detail-item">
                    {member.phone ? `電話：${member.phone}` : "未提供電話"}
                  </span>
                </div>
                {member.followedAt && (
                  <div className="card-date">
                    加入時間：{formatDate(member.followedAt)}
                  </div>
                )}
              </div>

              {/* LINE Badge */}
              <div className="line-badge">
                <UserCheck size={20} style={{ color: "#06C755" }} />
              </div>
            </button>
          ))}

          {filteredMembers.length === 0 && (
            <div className="empty-state">
              <Users size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
              <p>找不到符合的會員</p>
              <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                會員會在加入 LINE 官方帳號時自動新增
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Member Detail */}
      <div className="member-detail-panel">
        {selectedMember ? (
          <>
            {(() => {
              const member = users.find((u) => u.uid === selectedMember);
              if (!member) return null;

              return (
                <>
                  {/* Header */}
                  <div className="detail-header">
                    <div className="header-member-avatar">
                      {member.pictureUrl ? (
                        <img src={member.pictureUrl} alt={member.displayName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="header-member-info">
                      <h3>{member.displayName}</h3>
                      <div className="member-badge">
                        <UserCheck size={16} style={{ color: "#06C755" }} />
                        <span>LINE 會員</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="detail-content">
                    <div className="detail-section">
                      <h4 className="section-title">會員資訊</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">LINE ID</span>
                          <span className="info-value">
                            {member.uid.substring(0, 10)}...
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">電話</span>
                          <span className="info-value">
                            {member.phone || "未提供"}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email</span>
                          <span className="info-value">
                            {member.email || "未提供"}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">加入時間</span>
                          <span className="info-value">
                            {formatDate(member.followedAt)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">狀態</span>
                          <span className="info-value">
                            {member.status === "active" ? (
                              <span style={{ color: "#10b981" }}>✓ 活躍</span>
                            ) : (
                              <span style={{ color: "#ef4444" }}>已封鎖</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4 className="section-title">說明</h4>
                      <p className="section-description">
                        此會員透過 LINE 官方帳號加入好友。您可以透過 LINE
                        推播訊息與會員互動。
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          <div className="empty-detail-state">
            <Users size={64} style={{ opacity: 0.2, marginBottom: "1rem" }} />
            <p>請選擇一個會員查看詳細資訊</p>
          </div>
        )}
      </div>
    </div>
  );
};
