import { useState } from "react";
import { apiRequest } from "../lib/api";
import type { AuthData } from "../types";

// Format error messages for better user experience
function formatErrorMessage(error: unknown): string {
  const message = (error as Error).message || String(error);

  // Map backend messages to user-friendly messages
  const errorMap: Record<string, string> = {
    "Invalid login or password.":
      "Invalid email, username, or password. Please try again.",
    "User with this login or email already exists.":
      "This username or email is already registered. Please use a different one or try logging in.",
    "Validation failed": "Please check your input and try again.",
    "User not found": "No account found with those credentials.",
    "Refresh token": "Your session has expired. Please log in again.",
    "Session expired": "Your session has expired. Please log in again.",
  };

  // Check if message matches any known errors
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Check for network errors
  if (message.includes("Failed to fetch") || message.includes("fetch")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Default: return original message if it's already user-friendly
  return message;
}

export function AuthPanel({
  onAuth,
  onError,
}: {
  onAuth: (token: string) => void;
  onError: (e: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "guest">(
    "login",
  );
  const [guestName, setGuestName] = useState("");
  const [meetingCode, setMeetingCode] = useState("");

  async function login(formData: FormData) {
    onError("");
    const data = await apiRequest<AuthData>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: formData.get("identifier"),
        password: formData.get("password"),
      }),
    });
    onAuth(data.accessToken);
  }

  async function register(formData: FormData) {
    onError("");
    const data = await apiRequest<AuthData>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        login: formData.get("login"),
        password: formData.get("password"),
        email: formData.get("email"),
        displayName: formData.get("displayName"),
      }),
    });
    onAuth(data.accessToken);
  }

  const guestJoin = async () => {
    onError("");
    const data = await apiRequest<{ accessToken: string }>("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify({ guestName, meetingCode }),
    });
    onAuth(data.accessToken);
  };

  return (
    <section style={{ maxWidth: "500px", margin: "0 auto" }}>
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "login" ? "active" : ""}`}
          onClick={() => setActiveTab("login")}
        >
          Login
        </button>
        <button
          className={`tab-button ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}
        >
          Register
        </button>
        <button
          className={`tab-button ${activeTab === "guest" ? "active" : ""}`}
          onClick={() => setActiveTab("guest")}
        >
          Guest
        </button>
      </div>

      {activeTab === "login" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await login(new FormData(e.currentTarget));
            } catch (error) {
              onError(formatErrorMessage(error));
            }
          }}
        >
          <h3>Sign In</h3>
          <input
            required
            name="identifier"
            placeholder="Username or email"
            autoFocus
          />
          <input
            required
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="submit">Sign In</button>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <button
              type="button"
              className="secondary"
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-light)",
                padding: "0",
                cursor: "pointer",
              }}
              onClick={() => setActiveTab("register")}
            >
              Register
            </button>
          </p>
        </form>
      )}

      {activeTab === "register" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await register(new FormData(e.currentTarget));
            } catch (error) {
              onError(formatErrorMessage(error));
            }
          }}
        >
          <h3>Create Account</h3>
          <input
            required
            name="login"
            placeholder="Username"
            autoComplete="username"
            autoFocus
          />
          <input
            required
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            required
            name="displayName"
            placeholder="Display name"
            autoComplete="name"
          />
          <input
            required
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="new-password"
          />
          <button type="submit">Create Account</button>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <button
              type="button"
              className="secondary"
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-light)",
                padding: "0",
                cursor: "pointer",
              }}
              onClick={() => setActiveTab("login")}
            >
              Sign In
            </button>
          </p>
        </form>
      )}

      {activeTab === "guest" && (
        <div className="card">
          <h3>Join as Guest</h3>
          <p style={{ color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
            Enter your name and the meeting code to join a room
          </p>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <input
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            placeholder="Meeting code (e.g., abc-defg-hij)"
          />
          <button
            onClick={async () => {
              try {
                await guestJoin();
              } catch (error) {
                onError(formatErrorMessage(error));
              }
            }}
          >
            Join Meeting
          </button>
        </div>
      )}
    </section>
  );
}
