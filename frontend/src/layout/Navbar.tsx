import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import { toggleFollow } from "../lib/follow";
import "../styles/Navbar.css";
import type { NotificationItem } from "../types/notification";
import type { UserSummary } from "../types/user";

type IconName =
	| "search"
	| "feed"
	| "explore"
	| "people"
	| "add"
	| "saved"
	| "messages"
	| "notifications"
	| "profile"
	| "about"
	| "login"
	| "signup";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_HISTORY_KEY = "wy.search.history";
const SEARCH_HISTORY_LIMIT = 10;

type SearchKind = "user" | "hashtag";

interface NavItem {
	label: string;
	to: string;
	variant?: "primary";
	icon: IconName;
}

interface NotificationFilterConfig {
	label: string;
	predicate: (item: NotificationItem) => boolean;
}

interface SearchHistoryEntry {
	id: string;
	query: string;
	type: SearchKind;
	lastUsed: number;
}

type SearchResponse = { users: UserSummary[] };

const isBrowser = typeof window !== "undefined";

type NotificationFilter = "all" | "project" | "network";

const NOTIFICATION_FILTERS: Record<NotificationFilter, NotificationFilterConfig> = {
	all: { label: "All", predicate: () => true },
	project: { label: "Projects", predicate: (item) => item.type === "like" },
	network: { label: "Followers", predicate: (item) => item.type === "follow" },
};

const searchIcons: Record<SearchKind, string> = {
	user: "@",
	hashtag: "#",
};

function iconId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readHistory(): SearchHistoryEntry[] {
	if (!isBrowser) return [];
	const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as SearchHistoryEntry[];
		return Array.isArray(parsed) ? parsed.slice(0, SEARCH_HISTORY_LIMIT) : [];
	} catch {
		return [];
	}
}

function writeHistory(entries: SearchHistoryEntry[]) {
	if (!isBrowser) return;
	window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries.slice(0, SEARCH_HISTORY_LIMIT)));
}

function classifySearch(query: string): SearchKind {
	return query.trim().startsWith("#") ? "hashtag" : "user";
}

function Icon({ name }: { name: IconName }) {
	const shared = {
		className: "wy-nav__icon",
		width: 22,
		height: 22,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 1.8,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden": true,
	};

	switch (name) {
		case "search":
			return (
				<svg {...shared}>
					<circle cx={11} cy={11} r={7} />
					<path d="M20 20l-3.5-3.5" />
				</svg>
			);
		case "feed":
			return (
				<svg {...shared}>
					<path d="M5 7h14" />
					<path d="M5 12h10" />
					<path d="M5 17h6" />
				</svg>
			);
		case "explore":
			return (
				<svg {...shared}>
					<circle cx={12} cy={12} r={9} />
					<path d="M9.5 14.5l1.5-4.5 4.5-1.5-1.5 4.5z" />
				</svg>
			);
		case "people":
			return (
				<svg {...shared}>
					<circle cx={9} cy={10} r={3} />
					<circle cx={17} cy={10} r={3} />
					<path d="M4 19c1.2-3 3.6-4 5.5-4s4.3 1 5.5 4" />
					<path d="M11.5 19c1.2-3 3.6-4 5.5-4 1.1 0 2.3.3 3.5 1" />
				</svg>
			);
		case "add":
			return (
				<svg {...shared}>
					<rect x={5} y={5} width={14} height={14} rx={2} />
					<path d="M12 8v8" />
					<path d="M8 12h8" />
				</svg>
			);
		case "saved":
			return (
				<svg {...shared}>
					<path d="M8 5h8a1 1 0 0 1 1 1v13l-5-3-5 3V6a1 1 0 0 1 1-1z" />
				</svg>
			);
		case "notifications":
			return (
				<svg {...shared}>
					<path d="M18 16v-4a6 6 0 0 0-12 0v4" />
					<path d="M5 16h14" />
					<path d="M10 20h4" />
				</svg>
			);
		case "profile":
			return (
				<svg {...shared}>
					<circle cx={12} cy={9} r={3} />
					<path d="M6 19c1.5-3 4-4 6-4s4.5 1 6 4" />
				</svg>
			);
		case "about":
			return (
				<svg {...shared}>
					<circle cx={12} cy={12} r={9} />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</svg>
			);
		case "login":
			return (
				<svg {...shared}>
					<path d="M9 12h10" />
					<path d="M13 8l4 4-4 4" />
					<path d="M5 5h5v14H5" />
				</svg>
			);
		case "signup":
			return (
				<svg {...shared}>
					<path d="M12 5v3" />
					<path d="M12 16v3" />
					<path d="M7.5 7.5l2.1 2.1" />
					<path d="M14.4 14.4l2.1 2.1" />
					<path d="M5 12h3" />
					<path d="M16 12h3" />
					<path d="M7.5 16.5l2.1-2.1" />
					<path d="M14.4 9.6l2.1-2.1" />
				</svg>
			);
		case "messages":
			return (
				<svg {...shared}>
					<rect x={4} y={6} width={16} height={12} rx={2} />
					<path d="M4 8l8 5 8-5" />
				</svg>
			);
		default:
			return null;
	}
}

function initialsFromName(rawName?: string | null) {
	const name = rawName?.trim();
	if (!name) {
		return "?";
	}

	const parts = name.split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "?";
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	const first = parts[0][0] ?? "";
	const last = parts[parts.length - 1][0] ?? "";
	const initials = `${first}${last}`.trim();

	return initials ? initials.toUpperCase() : "?";
}

function formatRelativeTime(input: string | number | Date | null | undefined) {
	if (input == null) {
		return "";
	}

	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	let duration = (date.getTime() - Date.now()) / 1000;

	const divisions: { amount: number; name: Intl.RelativeTimeFormatUnit }[] = [
		{ amount: 60, name: "second" },
		{ amount: 60, name: "minute" },
		{ amount: 24, name: "hour" },
		{ amount: 7, name: "day" },
		{ amount: 4.34524, name: "week" },
		{ amount: 12, name: "month" },
		{ amount: Infinity, name: "year" },
	];

	for (const division of divisions) {
		if (Math.abs(duration) < division.amount) {
			return rtf.format(Math.round(duration), division.name);
		}
		duration /= division.amount;
	}

	return "";
}


function NotificationMenu({ onNavigate }: { onNavigate: () => void }) {
	const navigate = useNavigate();
	const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [pendingId, setPendingId] = useState<string | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (!menuRef.current || menuRef.current.contains(event.target as Node)) return;
			setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("pointerdown", onPointer);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("pointerdown", onPointer);
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const sorted = useMemo(
		() => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
		[notifications],
	);

	const filtered = useMemo(
		() => sorted.filter(NOTIFICATION_FILTERS[filter].predicate),
		[filter, sorted],
	);

	const handleView = async (notification: typeof notifications[number]) => {
		setOpen(false);
		if (notification.type === "follow" && notification.actor?.id) {
			navigate(`/users/${notification.actor.id}`);
		} else if (notification.type === "like" && notification.project?.id) {
			navigate(`/projects/${notification.project.id}`);
		}
		await markAsRead(notification.id);
		onNavigate();
	};

	const handleMarkRead = async (id: string) => {
		setPendingId(id);
		await markAsRead(id);
		setPendingId(null);
	};

	return (
		<div ref={menuRef} className="wy-nav__notifications">
			<button
				type="button"
				className={`wy-nav__button ${open ? "is-open" : ""}`}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-haspopup="dialog"
			>
				<Icon name="notifications" />
				<span className="wy-nav__label">Notifications</span>
				{unreadCount > 0 ? <span className="wy-nav__badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
			</button>

			{open ? (
				<section className="wy-nav__notifications-panel" role="dialog" aria-label="Notifications">
					<header className="wy-nav__notifications-header">
						<h2>Notifications</h2>
						<button type="button" onClick={() => markAllAsRead()} disabled={!unreadCount || pendingId !== null}>
							Mark all read
						</button>
					</header>

					<div className="wy-nav__notifications-filters">
						{Object.entries(NOTIFICATION_FILTERS).map(([value, option]) => (
							<button
								key={value}
								type="button"
								className={`wy-nav__notifications-filter ${filter === value ? "is-active" : ""}`}
								onClick={() => setFilter(value as NotificationFilter)}
							>
								{option.label}
							</button>
						))}
					</div>

					<div className="wy-nav__notifications-scroll">
						{loading ? (
							<p className="wy-nav__notifications-empty">Loading notifications…</p>
						) : filtered.length ? (
							filtered.map((notification) => {
								const avatar = resolveMediaUrl(notification.actor?.avatar);
								const message =
									notification.type === "follow"
										? `${notification.actor?.name || notification.actor?.username || "Someone"} started following you.`
										: notification.project?.title
											? `${notification.actor?.name || notification.actor?.username || "Someone"} liked ${notification.project.title}.`
											: `${notification.actor?.name || notification.actor?.username || "Someone"} liked your project.`;

								return (
									<article
										key={notification.id}
										className={`wy-nav__notifications-item ${notification.read ? "is-read" : ""}`}
									>
										<button type="button" onClick={() => handleView(notification)} disabled={pendingId === notification.id}>
											<div className="wy-nav__notifications-avatar">
												{avatar ? <img src={avatar} alt="" /> : initialsFromName(notification.actor?.name || notification.actor?.username)}
											</div>
											<div>
												<p>{message}</p>
												<span>{formatRelativeTime(notification.createdAt)}</span>
											</div>
										</button>
										{!notification.read ? (
											<div className="wy-nav__notifications-actions">
												<button type="button" onClick={() => handleMarkRead(notification.id)} disabled={pendingId === notification.id}>
													Mark read
												</button>
											</div>
										) : null}
									</article>
								);
							})
						) : (
							<p className="wy-nav__notifications-empty">You are all caught up.</p>
						)}
					</div>

					<footer className="wy-nav__notifications-footer">
						<p>New notifications stay here for 6 days.</p>
					</footer>
				</section>
			) : null}
		</div>
	);
}

function SearchMenu({ onNavigate }: { onNavigate: () => void }) {
	const navigate = useNavigate();
	const { token, user: currentUser, updateUser } = useAuth();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UserSummary[]>([]);
	const [history, setHistory] = useState<SearchHistoryEntry[]>(() => readHistory());
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingIds, setPendingIds] = useState<string[]>([]);
	const menuRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// outside-click + escape handlers, focus when opened
	useEffect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			if (!menuRef.current || menuRef.current.contains(event.target as Node)) return;
			setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("pointerdown", onPointer);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("pointerdown", onPointer);
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);
	useEffect(() => {
		if (open) {
			setHistory(readHistory());
			queueMicrotask(() => inputRef.current?.focus());
		}
	}, [open]);

	const addToHistory = useCallback((rawQuery: string) => {
		const trimmed = rawQuery.trim();
		if (!trimmed) return;
		const type = classifySearch(trimmed);
		setHistory((prev) => {
			const lowered = trimmed.toLowerCase();
			const existing = prev.find((item) => item.query.toLowerCase() === lowered && item.type === type);
			const entry: SearchHistoryEntry = existing
				? { ...existing, lastUsed: Date.now() }
				: { id: iconId(), query: trimmed, type, lastUsed: Date.now() };
			const filtered = prev.filter((item) => !(item.query.toLowerCase() === lowered && item.type === type));
			const updated = [entry, ...filtered].slice(0, SEARCH_HISTORY_LIMIT);
			writeHistory(updated);
			return updated;
		});
	}, []);

	const runSearch = useCallback(
		async (rawQuery: string) => {
			const trimmed = rawQuery.trim();
			if (!trimmed) {
				setResults([]);
				setError(null);
				return;
			}
			const type = classifySearch(trimmed);
			addToHistory(trimmed);

			if (type === "hashtag") {
				setOpen(false);
				onNavigate();
				navigate(`/explore?tag=${encodeURIComponent(trimmed.replace(/^#/, ""))}`);
				return;
			}

			if (!token) {
				setError("Log in to search the community.");
				setResults([]);
				return;
			}
			if (trimmed.length < MIN_SEARCH_LENGTH) {
				setError(`Type at least ${MIN_SEARCH_LENGTH} characters to search.`);
				setResults([]);
				return;
			}

			try {
				setSearching(true);
				setError(null);
				const params = new URLSearchParams({ q: trimmed, limit: "24" });
				const payload = await apiFetch<SearchResponse>(`/api/users/search?${params.toString()}`, { token });
				setResults(payload.users ?? []);
			} catch (err) {
				setResults([]);
				setError(err instanceof Error ? err.message : "Unable to search right now.");
			} finally {
				setSearching(false);
			}
		},
		[addToHistory, navigate, onNavigate, token]
	);

	const handleFollowToggle = useCallback(
		async (person: UserSummary) => {
			const personId = person.id;
			if (!token || !personId || personId === currentUser?.id || pendingIds.includes(personId)) return;
			setPendingIds((prev) => [...prev, personId]);
			try {
				const response = await toggleFollow(personId, Boolean(person.isFollowing), token);
				updateUser(() => response.user ?? null);
				setResults((prev) =>
					prev.map((item) =>
						item.id === response.target.id
							? { ...item, isFollowing: response.target.isFollowing, followersCount: response.target.followersCount }
							: item
					)
				);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unable to update follow state.");
			} finally {
				setPendingIds((prev) => prev.filter((value) => value !== personId));
			}
		},
		[currentUser?.id, pendingIds, token, updateUser]
	);

	return (
		<div ref={menuRef} className="wy-nav__search">
			<button
				type="button"
				className={`wy-nav__button ${open ? "is-open" : ""}`}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
				aria-haspopup="dialog"
			>
				<Icon name="search" />
				<span className="wy-nav__label">Search</span>
			</button>

			{open ? (
				<section className="wy-nav__search-panel" role="dialog" aria-label="Search">
					<form
						className="wy-nav__search-form"
						onSubmit={(event) => {
							event.preventDefault();
							runSearch(query);
						}}
					>
						<input
							ref={inputRef}
							type="search"
							placeholder="Search people or #hashtags"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							aria-label="Search people or hashtags"
						/>
						<button type="submit" disabled={searching}>
							{searching ? "Searching…" : "Search"}
						</button>
					</form>

					{error ? <p className="wy-nav__search-error">{error}</p> : <p className="wy-nav__search-info">Search people or jump into a hashtag.</p>}

					{history.length ? (
						<div className="wy-nav__search-history">
							<div className="wy-nav__search-history-header">
								<span>Recent searches</span>
								<button type="button" onClick={() => { setHistory([]); writeHistory([]); }}>
									Clear
								</button>
							</div>
							<div className="wy-nav__search-history-list">
								{history.map((entry) => (
									<button
										key={entry.id}
										type="button"
										className="wy-nav__search-history-item"
										onClick={() => {
											setQuery(entry.query);
											runSearch(entry.query);
										}}
									>
										<span className="wy-nav__search-history-icon">{searchIcons[entry.type]}</span>
										<span>{entry.query}</span>
									</button>
								))}
							</div>
						</div>
					) : null}

					<div className="wy-nav__search-results" aria-live="polite">
						{searching ? <p className="wy-nav__search-info">Finding builders…</p> : null}
						{!searching && !results.length && query.trim().length >= MIN_SEARCH_LENGTH ? (
							<p className="wy-nav__search-info">No people matched that search yet.</p>
						) : null}

						{results.map((person) => {
							const avatar = resolveMediaUrl(person.avatar);
							const pending = pendingIds.includes(person.id ?? "");
							const isSelf = currentUser?.id && currentUser.id === person.id;
							const followLabel = person.isFollowing ? (pending ? "Updating…" : "Unfollow") : pending ? "Updating…" : "Follow";

							return (
								<article key={person.id ?? person.username} className="wy-nav__search-result">
									<button
										type="button"
										className="wy-nav__search-result-main"
										onClick={() => {
											if (!person.id) return;
											setOpen(false);
											onNavigate();
											navigate(`/users/${person.id}`);
										}}
									>
										<div className="wy-nav__search-result-avatar">
											{avatar ? <img src={avatar} alt={`${person.name || person.username || "User"} avatar`} loading="lazy" /> : <span>{initialsFromName(person.name || person.username)}</span>}
										</div>
										<div>
											<strong>{person.name || person.username || "Unknown builder"}</strong>
											<span>@{person.username || "unknown"}</span>
											{person.bio ? <p>{person.bio}</p> : null}
										</div>
									</button>

									{isSelf ? null : (
										<button
											type="button"
											className="wy-nav__search-follow"
											onClick={() => handleFollowToggle(person)}
											disabled={pending}
										>
											{followLabel}
										</button>
									)}
								</article>
							);
						})}
					</div>
				</section>
			) : null}
		</div>
	);
}

export default function Navbar() {
	const [open, setOpen] = useState(false);
	const [hidden, setHidden] = useState(false);
	const { isAuthenticated, user } = useAuth();
	const { unreadCount } = useNotifications();

	const navItems = useMemo<NavItem[]>(() => {
		if (isAuthenticated) {
			return [
				{ label: "Feed", to: "/feed", icon: "feed" },
				{ label: "Explore", to: "/explore", icon: "explore" },
				{ label: "Add Project", to: "/projects/new", variant: "primary", icon: "add" },
				{ label: "Saved", to: "/saved", icon: "saved" },
			];
		}
		return [
			{ label: "Explore", to: "/explore", icon: "explore" },
			{ label: "About", to: "/about", icon: "about" },
			{ label: "Login", to: "/login", icon: "login" },
			{ label: "Start Posting", to: "/signup", variant: "primary", icon: "signup" },
		];
	}, [isAuthenticated]);

	useEffect(() => {
		let lastY = window.scrollY;
		const onScroll = () => {
			const y = window.scrollY;
			const delta = y - lastY;
			if (y < 40) {
				setHidden(false);
			} else if (delta > 10) {
				setHidden(true);
			} else if (delta < -10) {
				setHidden(false);
			}
			lastY = y;
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header className={`wy-nav ${hidden ? "wy-nav--hidden" : ""}`}>
			<div className="wy-nav__inner">
				<Link className="wy-nav__brand" to="/">
					<span className="wy-nav__dot" />
					<span>WorkYard</span>
				</Link>

				<button
					className="wy-nav__toggle"
					type="button"
					aria-label="Toggle navigation"
					onClick={() => setOpen((prev) => !prev)}
				>
					<span />
					<span />
					<span />
				</button>

				<nav className={`wy-nav__links ${open ? "is-open" : ""}`}>
					{isAuthenticated ? (
						<>
							<div className="wy-nav__section wy-nav__section--left">
								<NavLink
									to="/feed"
									title="Feed"
									aria-label="Feed"
									className={({ isActive }) =>
										["wy-nav__link", isActive ? "is-active" : ""]
											.filter(Boolean)
											.join(" ")
									}
									onClick={() => setOpen(false)}
								>
									<Icon name="feed" />
									<span className="wy-nav__label">Feed</span>
								</NavLink>
								<NavLink
									to="/explore"
									title="Explore"
									aria-label="Explore"
									className={({ isActive }) =>
										["wy-nav__link", isActive ? "is-active" : ""]
											.filter(Boolean)
											.join(" ")
									}
									onClick={() => setOpen(false)}
								>
									<Icon name="explore" />
									<span className="wy-nav__label">Explore</span>
								</NavLink>
								<SearchMenu onNavigate={() => setOpen(false)} />
							</div>
							<div className="wy-nav__section wy-nav__section--center">
								<NavLink
									to="/projects/new"
									className="wy-nav__link wy-nav__link--primary"
									title="Add Project"
									aria-label="Add Project"
									onClick={() => setOpen(false)}
								>
									<Icon name="add" />
									<span className="wy-nav__label">Add Project</span>
								</NavLink>
							</div>
							<div className="wy-nav__section wy-nav__section--right">
								<NotificationMenu onNavigate={() => setOpen(false)} />
								<NavLink
									to="/messages"
									title="Messages"
									aria-label="Messages"
									className={({ isActive }) =>
										["wy-nav__link", isActive ? "is-active" : ""]
											.filter(Boolean)
											.join(" ")
									}
									onClick={() => setOpen(false)}
								>
									<Icon name="messages" />
									<span className="wy-nav__label">Messages</span>
								</NavLink>
								<NavLink
									to="/saved"
									title="Saved"
									aria-label="Saved"
									className={({ isActive }) =>
										["wy-nav__link", isActive ? "is-active" : ""]
											.filter(Boolean)
											.join(" ")
									}
									onClick={() => setOpen(false)}
								>
									<Icon name="saved" />
									<span className="wy-nav__label">Saved</span>
								</NavLink>
								<NavLink
									to="/profile"
									className={({ isActive }) =>
										["wy-nav__link", "wy-nav__profile-link", isActive ? "is-active" : ""].filter(Boolean).join(" ")
									}
									aria-label="Profile"
									onClick={() => setOpen(false)}
								>
									<div className="wy-nav__profile-avatar">
										{resolveMediaUrl(user?.avatar) ? (
											<img src={resolveMediaUrl(user?.avatar)} alt="Your avatar" />
										) : (
											<span>{initialsFromName(user?.name || user?.username)}</span>
										)}
									</div>
									<span className="wy-nav__label">Profile</span>
								</NavLink>
							</div>
						</>
					) : (
						navItems.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								title={item.label}
								aria-label={item.label}
								className={({ isActive }) =>
									["wy-nav__link", item.variant === "primary" ? "wy-nav__link--primary" : "", isActive ? "is-active" : ""]
										.filter(Boolean)
										.join(" ")
								}
								onClick={() => setOpen(false)}
							>
								<Icon name={item.icon} />
								<span className="wy-nav__label">{item.label}</span>
							</NavLink>
						))
					)}
				</nav>
			</div>
		</header>
	);
}
