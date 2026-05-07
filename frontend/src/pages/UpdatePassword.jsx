import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PasswordInput from "../components/common/PasswordInput";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ password, confirmPassword, token });
      toast.success("Password updated successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Set New Password</h1>
          <p>Create a new password for your account</p>
        </div>
      </div>

      <div className="main-content">
        <div className="card" style={{ maxWidth: 460, margin: "0 auto", padding: "2rem" }}>
          <h2
            style={{
              fontFamily: "'Yatra One',cursive",
              color: "var(--saffron-deep)",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            Update Password
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-2">
              <label className="form-label">
                New Password: <sup className="text-pink-200">*</sup>
              </label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">
                Confirm Password: <sup className="text-pink-200">*</sup>
              </label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
