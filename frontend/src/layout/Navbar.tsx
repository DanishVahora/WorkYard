import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

type IconName =
	| "feed"
	| "explore"
	| "add"
	| "saved"
	| "notifications"
	| "profile"
	| "about"
	| "login"
	| "signup";

interface NavItem {
	label: string;
	to: string;
	variant?: "primary";
	icon: IconName;
}

// Inline SVG icons keep the nav symbolic without extra dependencies.
function Icon({ name }: { name: IconName }) {
	const sharedProps = {
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
		case "feed":
			return (
				<svg {...sharedProps}>
					<path d="M5 7h14" />
					<path d="M5 12h10" />
					<path d="M5 17h6" />
				</svg>
			);
		case "explore":
			return (
				<svg {...sharedProps}>
					<circle cx={12} cy={12} r={9} />
					<path d="M9.5 14.5l1.5-4.5 4.5-1.5-1.5 4.5z" />
				</svg>
			);
		case "add":
			return (
				<svg {...sharedProps}>
					<rect x={5} y={5} width={14} height={14} rx={2} />
					<path d="M12 8v8" />
					<path d="M8 12h8" />
				</svg>
			);
		case "saved":
			return (
				<svg {...sharedProps}>
					<path d="M8 5h8a1 1 0 0 1 1 1v13l-5-3-5 3V6a1 1 0 0 1 1-1z" />
				</svg>
			);
		case "notifications":
			return (
				<svg {...sharedProps}>
					<path d="M18 16v-4a6 6 0 0 0-12 0v4" />
					<path d="M5 16h14" />
					<path d="M10 20h4" />
				</svg>
			);
		case "profile":
			return (
				<svg {...sharedProps}>
					<circle cx={12} cy={9} r={3} />
					<path d="M6 19c1.5-3 4-4 6-4s4.5 1 6 4" />
				</svg>
			);
		case "about":
			return (
				<svg {...sharedProps}>
					<circle cx={12} cy={12} r={9} />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</svg>
			);
		case "login":
			return (
				<svg {...sharedProps}>
					<path d="M9 12h10" />
					<path d="M13 8l4 4-4 4" />
					<path d="M5 5h5v14H5" />
				</svg>
			);
		case "signup":
			return (
				<svg {...sharedProps}>
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
		default:
			return null;
	}
}

export default function Navbar() {
	const [open, setOpen] = useState(false);
	const [hidden, setHidden] = useState(false);
	const { isAuthenticated } = useAuth();

	const navItems = useMemo<NavItem[]>(() => {
		if (isAuthenticated) {
			return [
				{ label: "Feed", to: "/feed", icon: "feed" },
				{ label: "Explore", to: "/explore", icon: "explore" },
				{ label: "Add Project", to: "/projects/new", variant: "primary", icon: "add" },
				{ label: "Saved", to: "/saved", icon: "saved" },
				{ label: "Notifications", to: "/notifications", icon: "notifications" },
				{ label: "Profile", to: "/profile", icon: "profile" },
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
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							title={item.label}
							aria-label={item.label}
							className={({ isActive }) =>
								[
									"wy-nav__link",
									item.variant === "primary" ? "wy-nav__link--primary" : "",
									isActive ? "is-active" : "",
								]
									.filter(Boolean)
									.join(" ")
							}
							onClick={() => setOpen(false)}
						>
							<Icon name={item.icon} />
							<span className="wy-nav__label">{item.label}</span>
						</NavLink>
					))}
				</nav>
			</div>
		</header>
	);
}
