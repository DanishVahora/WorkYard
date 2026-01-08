import React from "react";
import "../styles/HomePage.css";

const heroImage = "/workyard-hero.png"; // place the provided PNG in frontend/public as this filename

const highlightStats = [
	{ label: "Projects shared", value: "12.4k" },
	{ label: "Feedback threads", value: "58k" },
	{ label: "Collab invites", value: "7.9k" },
];

const featureCards = [
	{
		title: "User profiles",
		desc: "Pages built for builders with repos, shots, and changelog in one place.",
		badge: "Identity",
	},
	{
		title: "Project posting",
		desc: "Drop GitHub links, screenshots, and release notes without leaving your flow.",
		badge: "Showcase",
	},
	{
		title: "Feedback that matters",
		desc: "Likes, comments, saves, and lightweight reviews tuned for signal over noise.",
		badge: "Engagement",
	},
	{
		title: "Search and filter",
		desc: "Tech-stack tags, popularity, and momentum filters to find the right crews fast.",
		badge: "Discovery",
	},
	{
		title: "Collaboration",
		desc: "Co-maintainers, issue triage, and invite threads so work keeps moving.",
		badge: "Teaming",
	},
];

const tagCloud = [
	"React",
	"TypeScript",
	"Node.js",
	"Next.js",
	"Go",
	"Rust",
	"UI/UX",
	"Data Viz",
	"AI",
	"DevOps",
];

const momentumFeed = [
	{
		title: "Realtime Kanban",
		stack: ["React", "Supabase"],
		status: "+142 saves this week",
	},
	{
		title: "LLM Pairing Bot",
		stack: ["Node", "OpenAI"],
		status: "Top 3 in AI",
	},
	{
		title: "Design Token CLI",
		stack: ["Rust", "Figma"],
		status: "New collab requests",
	},
];

export default function HomePage() {
	return (
		<main className="home-page">
			<section className="hero">
				<div className="hero-copy">
					<span className="pill eyebrow animate-fade delay-1">WorkYard – Social Media for Developers 🚀</span>
					<h1 className="animate-fade delay-2">Build in public. Get signal. Collaborate.</h1>
					<p className="lede animate-fade delay-3">
						Share projects, get feedback, and collaborate without the fluff. Designed for
						builders who want to ship fast and meet the right teammates sooner.
					</p>
					<div className="hero-bullets animate-fade delay-4">
						<span>User profiles built for devs</span>
						<span>Project posting with GitHub + screenshots</span>
						<span>Like, comment, save projects</span>
						<span>Tech-stack tags · Search · Filter</span>
					</div>
					<div className="cta-row animate-fade delay-5">
						<a className="btn primary" href="/signup">Start posting</a>
						<a className="btn ghost" href="/feed">Browse the feed</a>
					</div>
					<div className="tag-row animate-fade delay-6">
						{tagCloud.map((tag) => (
							<span key={tag} className="tag-chip">
								{tag}
							</span>
						))}
					</div>
				</div>

				<div className="hero-visual" aria-label="WorkYard hero visual">
					<div className="hero-frame animate-float">
						<img src={heroImage} alt="WorkYard hero" className="hero-image" />
						<div className="hero-glow" aria-hidden />
					</div>
					<div className="stat-strip animate-fade delay-7">
						{highlightStats.map((item) => (
							<div key={item.label} className="stat-card">
								<span className="stat-value">{item.value}</span>
								<span className="stat-label">{item.label}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="section feature-section">
				<div className="section-header animate-fade delay-2">
					<div>
						<p className="eyebrow">Use case</p>
						<h2>Share projects. Get feedback. Collaborate.</h2>
						<p className="section-lede">
							The WorkYard stack: ship updates with GitHub links, showcase screenshots, invite
							commentary, and recruit collaborators who already know your tech.
						</p>
					</div>
					<div className="section-actions">
						<a className="text-link" href="/projects">See projects</a>
						<a className="text-link" href="/teams">Find collaborators</a>
					</div>
				</div>

				<div className="feature-grid animate-fade delay-3">
					{featureCards.map((card) => (
						<article key={card.title} className="feature-card pop-card">
							<span className="badge">{card.badge}</span>
							<h3>{card.title}</h3>
							<p>{card.desc}</p>
						</article>
					))}
				</div>
			</section>

			<section className="section momentum">
				<div className="section-header animate-fade delay-2">
					<div>
						<p className="eyebrow">Momentum</p>
						<h2>Signal from the feed</h2>
						<p className="section-lede">
							What is getting attention right now. Built for devs who want to ship in public.
						</p>
					</div>
					<a className="text-link" href="/feed">Watch live →</a>
				</div>
				<div className="momentum-grid animate-fade delay-3">
					{momentumFeed.map((item) => (
						<div key={item.title} className="momentum-card pop-card">
							<div>
								<p className="momentum-title">{item.title}</p>
								<p className="momentum-stack">{item.stack.join(" · ")}</p>
							</div>
							<span className="pill ghost">{item.status}</span>
						</div>
					))}
				</div>
			</section>

			<section className="cta-banner animate-fade delay-4">
				<div>
					<p className="eyebrow">Ready to build in public?</p>
					<h2>Bring your next release to WorkYard.</h2>
					<p className="section-lede">
						Curate your profile, publish project updates, and invite collaborators who match your
						stack.
					</p>
				</div>
				<div className="cta-row">
					<a className="btn primary" href="/signup">Create my profile</a>
					<a className="btn ghost" href="/feed">Watch the feed</a>
				</div>
			</section>
		</main>
	);
}
