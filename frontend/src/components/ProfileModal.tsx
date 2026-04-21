import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import type { UserProfile } from "../types";

type Tab = "profile" | "password";

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile tab state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password tab state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);

  // Load profile on mount
  useEffect(() => {
    apiRequest<UserProfile>("/api/user/profile")
      .then((data) => {
        setProfile(data);
        setDisplayName(data.displayName);
        setEmail(data.email);
        setAvatarUrl(data.avatarUrl ?? "");
      })
      .catch((err) => setProfileError((err as Error).message))
      .finally(() => setProfileLoading(false));
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function saveProfile() {
    setProfileSuccess("");
    setProfileError("");
    setProfileSaving(true);
    try {
      await apiRequest("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName,
          email,
          avatarUrl: avatarUrl.trim() || null,
          themePreference: profile?.themePreference ?? "Dark",
        }),
      });
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordSaving(true);
    try {
      await apiRequest("/api/user/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess("Password changed. All other sessions have been signed out.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Profile settings">
        <div className="modal-header">
          <h2>Account Settings</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("profile");
                setProfileSuccess("");
                setProfileError("");
              }}
            >
              Profile
            </button>
            <button
              className={`tab-button ${activeTab === "password" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("password");
                setPasswordSuccess("");
                setPasswordError("");
              }}
            >
              Password
            </button>
          </div>

          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {profileLoading ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                  Loading profile...
                </p>
              ) : (
                <>
                  {profile && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                      Username: <strong style={{ color: "var(--text-secondary)" }}>@{profile.login}</strong>
                      &nbsp;· Member since {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      Display Name
                    </label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      autoComplete="name"
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      Avatar URL <span style={{ fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      autoComplete="url"
                    />
                    {avatarUrl.trim() && (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid var(--border)",
                          alignSelf: "flex-start",
                        }}
                      />
                    )}
                  </div>

                  {profileSuccess && <p className="form-success">{profileSuccess}</p>}
                  {profileError && <p className="form-error">{profileError}</p>}

                  <button onClick={saveProfile} disabled={profileSaving}>
                    {profileSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === "password" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
                After changing your password, all other active sessions will be signed out.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              {passwordSuccess && <p className="form-success">{passwordSuccess}</p>}
              {passwordError && <p className="form-error">{passwordError}</p>}

              <button
                onClick={changePassword}
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                style={{ background: "var(--danger)" }}
              >
                {passwordSaving ? "Changing..." : "Change Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
