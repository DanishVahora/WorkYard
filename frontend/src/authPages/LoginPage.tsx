import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/LoginPage.css";

const heroImage = "/workyard-hero.png";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("" );
  const [password, setPassword] = useState("" );
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "",
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      setStatus("error");
      setMessage("Please provide your email / username and password");
      return;
    }

    const payload = identifier.includes("@")
      ? { email: identifier.trim(), password }
      : { username: identifier.trim(), password };

    try {
      setStatus("loading");
      setMessage("");

      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let body: Record<string, unknown> = {};

      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch (parseErr) {
          console.warn("Received non-JSON response from login endpoint", parseErr);
        }
      }

      if (!res.ok) {
        const backendMessage = typeof body.message === "string" ? body.message : "Unable to log in";
        throw new Error(backendMessage);
      }

      const token = typeof body.token === "string" ? body.token : "";
      if (!token) {
        throw new Error("Missing authentication token");
      }

      const user = (body.user as Record<string, unknown> | undefined) || { username: identifier.trim() };
      login({ user, token });

      setStatus("success");
      setMessage("Welcome back! You're logged in.");

      const fromState = location.state as { from?: Location } | undefined;
      const redirectPath = fromState?.from?.pathname || "/feed";

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-visual" aria-hidden>
          <div className="login-visual-card login-visual-card--light">
            <img src={heroImage} alt="WorkYard preview" />
          </div>
          <div className="login-visual-copy">
            <p className="pill">WorkYard</p>
            <h2>Ship in public</h2>
            <p>Track launches, invite collaborators, and get high-signal feedback in one place.</p>
            <ul className="login-benefits">
              <li>Realtime project feed</li>
              <li>Lightweight code reviews</li>
              <li>Signals for trending work</li>
            </ul>
          </div>
        </div>

        <div className="login-card">
          <header className="login-header">
            <div>
              <p className="eyebrow">Log back in</p>
              <h1>Welcome back, builder</h1>
              <p className="lede">Use your WorkYard credentials to continue sharing and collaborating.</p>
            </div>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Email or username
              <input
                name="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@devmail.com or builder123"
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="login-actions">
              <label className="remember">
                <input type="checkbox" />
                <span>Keep me signed in</span>
              </label>
              <a href="/reset" className="link">
                Forgot password?
              </a>
            </div>

            {message && (
              <div className={`login-alert ${status}`} role="status">
                {message}
              </div>
            )}

            <button className="primary" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-footer">
            New to WorkYard? <a className="link" href="/signup">Create an account</a>
          </p>
        </div>
      </section>
    </main>
  );
}
