import React from "react";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const name = (typeof user?.name === "string" && user.name) || "New builder";
  const username = (typeof user?.username === "string" && user.username) || "username";
  const email = (typeof user?.email === "string" && user.email) || "you@workyard.dev";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">Profile</p>
        <h1>Welcome back, {name}</h1>
        <p className="page-subtitle">Tune what people see when they visit your WorkYard profile.</p>
      </header>

      <article className="page-card page-profile">
        <div className="page-profile__card">
          <div className="page-profile__avatar" aria-hidden>
            {initials || username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3>{name}</h3>
            <p className="page-subtitle">@{username}</p>
            <p className="page-card__meta">{email}</p>
          </div>
        </div>

        <div className="page-form">
          <label>
            Preferred stack
            <input defaultValue="Design systems, live collaboration" />
          </label>
          <label>
            Availability
            <input defaultValue="Open for async collabs" />
          </label>
          <label>
            Bio
            <textarea defaultValue="Documenting the build every week so future teammates can replay the decisions." />
          </label>
        </div>

        <div className="page-actions">
          <button type="button" className="page-button secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </article>
    </main>
  );
}
