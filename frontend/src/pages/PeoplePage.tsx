import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import { toggleFollow } from "../lib/follow";
import "../styles/PeoplePage.css";
import type { UserSummary } from "../types/user";

const MIN_QUERY_LENGTH = 2;

type SearchResponse = {
  users: UserSummary[];
};

function initialsFromName(source?: string) {
  return (source || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase?.() || "")
    .join("")
    .slice(0, 2);
}

export default function PeoplePage() {
  const { token, user: currentUser, updateUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFollowIds, setPendingFollowIds] = useState<string[]>([]);

  const currentUserId = currentUser?.id;

  const canSearch = useMemo(() => query.trim().length >= MIN_QUERY_LENGTH, [query]);

  const isPending = useCallback(
    (id?: string) => (id ? pendingFollowIds.includes(id) : false),
    [pendingFollowIds]
  );

  const performSearch = useCallback(
    async (searchValue: string) => {
      const trimmed = searchValue.trim();
      if (!token || trimmed.length < MIN_QUERY_LENGTH) {
        setResults([]);
        setError(trimmed.length ? "Type a little more to search." : null);
        return;
      }

      try {
        setSearching(true);
        setError(null);
        const params = new URLSearchParams({ q: trimmed, limit: "24" });
        const data = await apiFetch<SearchResponse>(`/api/users/search?${params.toString()}`, { token });
        setResults(data.users ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to search right now.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [token]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await performSearch(query);
    },
    [performSearch, query]
  );

  const handleFollowToggle = useCallback(
    async (person: UserSummary) => {
      if (!token || !person.id || person.id === currentUserId || isPending(person.id)) {
        return;
      }

      const targetId = person.id;

      setPendingFollowIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));

      try {
        const response = await toggleFollow(targetId, Boolean(person.isFollowing), token);
        const nextProfile = response.user ?? null;
        updateUser(() => nextProfile);

        setResults((prev) =>
          prev.map((item) =>
            item.id === response.target.id
              ? {
                  ...item,
                  isFollowing: response.target.isFollowing,
                  followersCount: response.target.followersCount,
                }
              : item
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to update follow state.");
      } finally {
        setPendingFollowIds((prev) => prev.filter((value) => value !== targetId));
      }
    },
    [currentUserId, isPending, token, updateUser]
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="page-kicker">People</p>
        <h1>Find builders to follow</h1>
        <p className="page-subtitle">Search teammates, peek their build logs, and follow what they publish.</p>
      </header>

      <form className="people-search" onSubmit={handleSubmit} role="search">
        <label htmlFor="people-query" className="people-search__label">
          Search builders
        </label>
        <div className="people-search__controls">
          <input
            id="people-query"
            type="search"
            placeholder="Search by name or username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={MIN_QUERY_LENGTH}
          />
          <button type="submit" className="page-button secondary" disabled={!canSearch || searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {query.trim().length > 0 && !canSearch ? (
          <p className="people-search__hint">Type at least {MIN_QUERY_LENGTH} characters to search.</p>
        ) : null}
      </form>

      {error ? <div className="page-alert error">{error}</div> : null}

      <section className="people-results" aria-live="polite">
        {searching ? <div className="profile-state">Searching builders…</div> : null}
        {!searching && results.length === 0 && canSearch && !error ? (
          <div className="profile-empty">No builders matched that search.</div>
        ) : null}

        <ul className="people-grid">
          {results.map((person) => {
            const avatar = resolveMediaUrl(person.avatar);
            const pending = isPending(person.id);
            const isSelf = currentUserId && person.id === currentUserId;
            const followLabel = person.isFollowing ? (pending ? "Updating…" : "Unfollow") : pending ? "Updating…" : "Follow";

            return (
              <li key={person.id ?? person.username} className="people-card">
                <Link to={`/users/${person.id}`} className="people-card__primary">
                  <div className="people-card__avatar" aria-hidden>
                    {avatar ? <img src={avatar} alt="" loading="lazy" /> : <span>{initialsFromName(person.name || person.username)}</span>}
                  </div>
                  <div className="people-card__text">
                    <strong>{person.name || person.username || "Unknown builder"}</strong>
                    <span>@{person.username || "unknown"}</span>
                    {person.bio ? <p>{person.bio}</p> : null}
                  </div>
                </Link>

                <div className="people-card__meta">
                  <span>{person.followersCount ?? 0} followers</span>
                </div>

                {isSelf ? null : (
                  <button
                    type="button"
                    className="page-button secondary"
                    onClick={() => handleFollowToggle(person)}
                    disabled={pending}
                  >
                    {followLabel}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
