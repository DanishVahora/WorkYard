import React, { useEffect, useState } from "react";
import "../styles/FeedPage.css";

type FeedItem = {
	id: string;
	title: string;
	description: string;
	longDescription: string;
	technologies: string[];
	images: string[];
	author: {
		name: string;
		title?: string;
		avatar?: string;
		profileUrl?: string;
	};
	stats: {
		likes: number;
		comments: number;
		saves: number;
		views?: number;
	};
	links?: {
		github?: string;
		live?: string;
	};
	timeline?: string;
};

type StoryItem = {
	id: string;
	name: string;
	avatar: string;
	isLive?: boolean;
};

type SuggestedProfile = {
	id: string;
	name: string;
	handle: string;
	avatar: string;
	mutual?: string;
};

const feedItems: FeedItem[] = [
	{
		id: "wy-ops-dashboard",
		title: "Product Ops Dashboard",
		description: "Cohort health layered with revenue overlays and incidents for exec-ready reviews.",
		longDescription:
			"Operations teams get live cohort health, revenue overlays, and incident timelines in one space. The deck powers weekly exec syncs and pushes metrics into a Slack triage bot.",
		technologies: ["React", "TypeScript", "Chart.js", "Node"],
		images: [
			"https://images.unsplash.com/photo-1527443224154-d6ce1d8d0631?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80",
		],
		author: { name: "Priya Singh", title: "Data Platform", avatar: "https://i.pravatar.cc/120?img=47", profileUrl: "/profile" },
		stats: { likes: 214, comments: 48, saves: 72, views: 3200 },
		links: { github: "https://github.com", live: "https://example.com" },
		timeline: "Last shipped · 6 days ago",
	},
	{
		id: "wy-market",
		title: "3D Asset Marketplace",
		description: "Instant preview storefront with team workspaces and frictionless studio checkout.",
		longDescription:
			"Studios drop assets, collaborate on packs, and handoff directly into production. Stripe handles cartless checkout while the realtime previewer renders GLTF drops in-browser.",
		technologies: ["Next.js", "Three.js", "Stripe", "Prisma"],
		images: [
			"https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80",
		],
		author: { name: "Leo Martínez", title: "Frontend Lead", avatar: "https://i.pravatar.cc/120?img=32", profileUrl: "/profile" },
		stats: { likes: 162, comments: 35, saves: 58, views: 2410 },
		links: { github: "https://github.com", live: "https://example.com" },
		timeline: "New release · 2 days ago",
	},
	{
		id: "wy-handbook",
		title: "AI Design Handbook",
		description: "Copilot UX patterns with prompt recipes, guardrails, and system heuristics.",
		longDescription:
			"Product squads remix prompt building blocks, evaluate responses, and publish design guardrails. Includes ready-to-run playbooks for onboarding flows and editorial review steps.",
		technologies: ["Vite", "Tailwind", "OpenAI", "Astro"],
		images: [
			"https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80",
		],
		author: { name: "Morgan Lee", title: "Product Design", avatar: undefined, profileUrl: "/profile" },
		stats: { likes: 98, comments: 19, saves: 44, views: 1180 },
		links: { github: "https://github.com", live: "https://example.com" },
		timeline: "Playbook update · 1 day ago",
	},
	{
		id: "wy-status",
		title: "StatusKit",
		description: "Incident-ready status kit with templated comms and SLA snapshots.",
		longDescription:
			"StatusKit spins up status pages, handles subscriber digests, and snapshots SLAs for enterprise contracts. Edge functions sync uptime and auto-post comms drafts for review.",
		technologies: ["Svelte", "Supabase", "Cloudflare", "Edge"],
		images: [
			"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80",
			"https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=1400&q=80",
		],
		author: { name: "Avery Kim", title: "SRE", avatar: "https://i.pravatar.cc/120?img=16", profileUrl: "/profile" },
		stats: { likes: 121, comments: 26, saves: 51, views: 1520 },
		links: { github: "https://github.com", live: "https://example.com" },
		timeline: "Incident drill · 3 hours ago",
	},
];

type IconName = "like" | "comment" | "save" | "view" | "github" | "live" | "share" | "info";

const navLinks = [
	{ label: "Home", icon: "🏠", href: "/feed" },
	{ label: "Explore", icon: "🔍", href: "/explore" },
	{ label: "Projects", icon: "🛠️", href: "/projects/new" },
	{ label: "Notifications", icon: "🔔", href: "/notifications" },
	{ label: "Saved", icon: "📁", href: "/saved" },
	{ label: "Profile", icon: "👤", href: "/profile" },
];

const storyItems: StoryItem[] = [
	{ id: "story-priya", name: "Priya", avatar: "https://i.pravatar.cc/88?img=47", isLive: true },
	{ id: "story-leo", name: "Leo", avatar: "https://i.pravatar.cc/88?img=32" },
	{ id: "story-morgan", name: "Morgan", avatar: "https://i.pravatar.cc/88?img=12" },
	{ id: "story-avery", name: "Avery", avatar: "https://i.pravatar.cc/88?img=16", isLive: true },
	{ id: "story-amara", name: "Amara", avatar: "https://i.pravatar.cc/88?img=21" },
	{ id: "story-sahil", name: "Sahil", avatar: "https://i.pravatar.cc/88?img=40" },
];

const suggestedProfiles: SuggestedProfile[] = [
	{
		id: "sg-1",
		name: "OpenCraft Guild",
		handle: "@opencraft",
		avatar: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=160&q=80",
		mutual: "Followed by Priya",
	},
	{
		id: "sg-2",
		name: "Runtime Atlas",
		handle: "@runtimeatlas",
		avatar: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=160&q=80",
		mutual: "Suggested for you",
	},
	{
		id: "sg-3",
		name: "DesignOps Lab",
		handle: "@designops",
		avatar: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=160&q=80",
		mutual: "New to WorkYard",
	},
];

const currentAccount = {
	name: "Danish Vhora",
	handle: "@danish.codes",
	avatar: "https://i.pravatar.cc/120?img=11",
};

function Icon({ name }: { name: IconName }) {
	switch (name) {
		case "like":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M12 21s-6-4.35-9-9A5.25 5.25 0 0 1 12 5.25 5.25 5.25 0 0 1 21 12c-3 4.65-9 9-9 9Z" />
				</svg>
			);
		case "comment":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
				</svg>
			);
		case "save":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
				</svg>
			);
		case "view":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			);
		case "github":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 18 4.77 5.07 5.07 0 0 0 17.91 1S16.73.65 14 2.48a13.38 13.38 0 0 0-5 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
				</svg>
			);
		case "live":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
					<path d="M10 9l6 3-6 3V9Z" />
				</svg>
			);
		case "share":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
					<path d="M16 6l-4-4-4 4" />
					<path d="M12 2v14" />
				</svg>
			);
		case "info":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
			);
	}
}

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export default function FeedPage() {
		const [activeItem, setActiveItem] = useState<FeedItem | null>(null);

		useEffect(() => {
			if (!activeItem) {
				return;
			}

			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === "Escape") {
					setActiveItem(null);
				}
			};

			document.body.style.setProperty("overflow", "hidden");
			document.addEventListener("keydown", handleKeyDown);

			return () => {
				document.body.style.removeProperty("overflow");
				document.removeEventListener("keydown", handleKeyDown);
			};
		}, [activeItem]);

		const closeModal = () => setActiveItem(null);

	return (
			<div className="feed-shell">
				<aside className="feed-rail feed-rail--nav">
					<div className="feed-logo">WorkYard</div>
					<nav className="feed-nav" aria-label="Primary">
						{navLinks.map((link) => (
							<a key={link.label} className="feed-nav__item" href={link.href}>
								<span className="feed-nav__icon" aria-hidden>
									{link.icon}
								</span>
								<span>{link.label}</span>
							</a>
						))}
					</nav>
					<button type="button" className="feed-create">Create project</button>
				</aside>

				<main className="feed-main">
					<header className="feed-header">
						<h1>Build in public with the crew</h1>
						<p className="feed-subtitle">Stories, drops, and momentum from teams shipping in WorkYard.</p>
					</header>
					<section className="feed-stories" aria-label="Stories">
						{storyItems.map((story) => (
							<button key={story.id} type="button" className={`feed-story${story.isLive ? " feed-story--live" : ""}`}>
								<span className="feed-story__ring" aria-hidden />
								<img src={story.avatar} alt={story.name} loading="lazy" />
								<span className="feed-story__label">{story.name}</span>
							</button>
						))}
					</section>

					<section className="feed-stream" aria-label="Project feed">
						{feedItems.map((item) => {
						const imageCount = item.images.length;
					return (
						<article key={item.id} className="feed-card">
								<div className="feed-gallery" aria-label={`${item.title} gallery`}>
									<div className="feed-gallery__list">
										{item.images.map((src, index) => (
											<figure key={`${item.id}-gallery-${index}`} className="feed-gallery__item">
												<img src={src} alt={`${item.title} screenshot ${index + 1}`} loading="lazy" />
											</figure>
										))}
									</div>
									{imageCount > 1 ? <span className="feed-gallery__badge">{imageCount} shots</span> : null}
								</div>

							<div className="feed-body">
								<div className="feed-meta">
									<h3>{item.title}</h3>
									<p className="feed-desc">{item.description}</p>
									<div className="feed-tags">
										{item.technologies.map((tag) => (
											<span key={tag} className="feed-tag">
												{tag}
											</span>
										))}
									</div>
										{item.timeline ? <p className="feed-timeline">{item.timeline}</p> : null}
								</div>

								<div className="feed-footer">
									<a className="feed-author" href={item.author.profileUrl ?? "#"}>
										<div className="feed-avatar">
											{item.author.avatar ? (
												<img src={item.author.avatar} alt={item.author.name} loading="lazy" />
											) : (
												<span>{initials(item.author.name)}</span>
											)}
										</div>
										<div className="feed-author__text">
											<strong>{item.author.name}</strong>
											<span>{item.author.title ?? "View profile"}</span>
										</div>
									</a>

									<div className="feed-links">
										{item.links?.github && (
											<a href={item.links.github} aria-label="GitHub" target="_blank" rel="noreferrer">
												<Icon name="github" />
											</a>
										)}
										{item.links?.live && (
											<a href={item.links.live} aria-label="Live demo" target="_blank" rel="noreferrer">
												<Icon name="live" />
											</a>
										)}
									</div>
								</div>

								<div className="feed-actions" aria-label="Engagement actions">
									<div className="feed-actions__left">
										<button type="button" className="feed-action">
											<Icon name="like" />
											<span>{item.stats.likes}</span>
										</button>
										<button type="button" className="feed-action">
											<Icon name="comment" />
											<span>{item.stats.comments}</span>
										</button>
										<button type="button" className="feed-action">
											<Icon name="save" />
											<span>{item.stats.saves}</span>
										</button>
										<button type="button" className="feed-action">
											<Icon name="share" />
											<span>Share</span>
										</button>
									</div>
									<div className="feed-actions__right">
										{item.stats.views ? (
											<div className="feed-meta-inline" aria-label="Views">
												<Icon name="view" />
												<span>{item.stats.views.toLocaleString()}</span>
											</div>
										) : null}
										<button type="button" className="feed-action feed-action--accent" onClick={() => setActiveItem(item)}>
											<Icon name="info" />
											<span>More info</span>
										</button>
									</div>
								</div>
							</div>
						</article>
					);
				})}
				</section>
			</main>

			<aside className="feed-rail feed-rail--suggested">
				<section className="feed-account" aria-label="Your account">
					<div className="feed-avatar feed-avatar--account">
						<img src={currentAccount.avatar} alt={currentAccount.name} loading="lazy" />
					</div>
					<div className="feed-account__text">
						<strong>{currentAccount.name}</strong>
						<span>{currentAccount.handle}</span>
					</div>
					<a className="feed-switch" href="/profile">Switch</a>
				</section>

				<section className="feed-suggested" aria-label="Suggested for you">
					<header className="feed-suggested__header">
						<h2>Suggested for you</h2>
						<a href="/explore">See all</a>
					</header>
					<div className="feed-suggested__list">
						{suggestedProfiles.map((profile) => (
							<div key={profile.id} className="feed-suggested__item">
								<div className="feed-avatar feed-avatar--suggested">
									<img src={profile.avatar} alt={profile.name} loading="lazy" />
								</div>
								<div className="feed-suggested__text">
									<strong>{profile.name}</strong>
									<span>{profile.handle}</span>
									{profile.mutual ? <span className="feed-suggested__mutual">{profile.mutual}</span> : null}
								</div>
								<button type="button" className="feed-follow">Follow</button>
							</div>
						))}
					</div>
				</section>

				<section className="feed-footerLinks" aria-label="Meta links">
					<div>Privacy · Terms · Docs</div>
					<small>© 2026 WorkYard</small>
				</section>
			</aside>

			{activeItem ? (
				<div className="feed-modal" role="dialog" aria-modal="true" aria-labelledby={`${activeItem.id}-title`} onClick={closeModal}>
					<div className="feed-modal__panel" role="document" onClick={(event) => event.stopPropagation()}>
						<button type="button" className="feed-modal__close" onClick={closeModal} aria-label="Close project details">
							&times;
						</button>
						<header className="feed-modal__header">
							<div className="feed-modal__author">
								<div className="feed-avatar feed-avatar--modal">
									{activeItem.author.avatar ? (
										<img src={activeItem.author.avatar} alt={activeItem.author.name} loading="lazy" />
									) : (
										<span>{initials(activeItem.author.name)}</span>
									)}
								</div>
								<div>
									<p className="feed-modal__eyebrow">Project</p>
									<h2 id={`${activeItem.id}-title`}>{activeItem.title}</h2>
									<p className="feed-modal__author-meta">{activeItem.author.name} · {activeItem.author.title ?? "Contributor"}</p>
								</div>
							</div>
							{activeItem.timeline ? <span className="feed-modal__timeline">{activeItem.timeline}</span> : null}
						</header>

						<div className="feed-modal__media">
							{activeItem.images.map((src, index) => (
								<div key={`${activeItem.id}-modal-${index}`} className="feed-modal__image">
									<img src={src} alt={`${activeItem.title} detail ${index + 1}`} loading="lazy" />
								</div>
							))}
						</div>

						<div className="feed-modal__body">
							<p className="feed-modal__description">{activeItem.longDescription}</p>
							<div className="feed-modal__chips" role="list">
								{activeItem.technologies.map((tech) => (
									<span key={tech} className="feed-modal__chip" role="listitem">
										{tech}
									</span>
								))}
							</div>
							<div className="feed-modal__stats" aria-label="Engagement summary">
								<span>
									<Icon name="like" />
									{activeItem.stats.likes}
								</span>
								<span>
									<Icon name="comment" />
									{activeItem.stats.comments}
								</span>
								<span>
									<Icon name="save" />
									{activeItem.stats.saves}
								</span>
								{activeItem.stats.views ? (
									<span>
										<Icon name="view" />
										{activeItem.stats.views.toLocaleString()}
									</span>
								) : null}
							</div>
							{activeItem.links ? (
								<div className="feed-modal__links">
									{activeItem.links.github ? (
										<a href={activeItem.links.github} target="_blank" rel="noreferrer">
											<Icon name="github" />
											<span>View code</span>
										</a>
									) : null}
									{activeItem.links.live ? (
										<a href={activeItem.links.live} target="_blank" rel="noreferrer">
											<Icon name="live" />
											<span>Launch demo</span>
										</a>
									) : null}
								</div>
							) : null}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
