import { useState } from "react";
import useLang from "../../hooks/useLang";
import toast from "react-hot-toast";
import { chatAPI } from "../../services/api";
import { initials } from "../../utils/helpers";

export default function GroupMembersPanel({ chatId, members = [], onUpdate, className = "" }) {
  const { t } = useLang();
  const [newUserId, setNewUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const addMember = async () => {
    if (!newUserId.trim()) return;
    setLoading(true);
    try {
      await chatAPI.addMember({ chatId, userId: newUserId.trim() });
      toast.success(t("member_added"));
      setNewUserId("");
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || t("failed_to_add_member"));
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId) => {
    try {
      await chatAPI.removeMember({ chatId, userId });
      toast.success(t("member_removed"));
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || t("failed_to_remove_member"));
    }
  };

  return (
    <div
      className={className}
      style={{
        borderLeft: "1px solid var(--border)",
        width: 260,
        padding: "1rem",
        overflowY: "auto",
        background: "var(--white)",
      }}
    >
      <h3
        style={{
          fontFamily: "'Yatra One',cursive",
          fontSize: "1rem",
          color: "var(--saffron-deep)",
          marginBottom: "1rem",
        }}
      >
        {t("group_members")} ({members.length})
      </h3>

      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        <input
          className="form-input"
          style={{ flex: 1, fontSize: ".82rem", padding: "6px 10px" }}
          placeholder={t("enter_user_id")}
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={addMember} disabled={loading}>
          +
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {members.map((m) => (
          <div
            key={m._id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 8,
              background: "var(--cream)",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: ".7rem",
                fontWeight: 600,
              }}
            >
              {initials(m)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 500 }}>
                {m.firstName} {m.lastName}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px 6px", fontSize: ".75rem", color: "#e53e3e" }}
              onClick={() => removeMember(m._id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
