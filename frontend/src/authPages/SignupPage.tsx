import React, { useMemo, useState } from "react";
import "../styles/SignupPage.css";

type FormState = {
	name: string;
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
	location: string;
	experienceLevel: string;
	skills: string;
	bio: string;
	github: string;
	linkedin: string;
	portfolio: string;
};

const heroImage = "/workyard-hero.png"; // place your hero image in /frontend/public

const defaultForm: FormState = {
	name: "",
	username: "",
	email: "",
	password: "",
	confirmPassword: "",
	location: "",
	experienceLevel: "",
	skills: "",
	bio: "",
	github: "",
	linkedin: "",
	portfolio: "",
};

const steps = [
	{ key: "account", title: "Account", caption: "Basics & contact" },
	{ key: "profile", title: "Profile", caption: "Experience & skills" },
	{ key: "social", title: "Presence", caption: "Links & avatar" },
];

export default function SignupPage() {
	const [form, setForm] = useState<FormState>(defaultForm);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string>("");
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState<string>("");
	const [stepIndex, setStepIndex] = useState<number>(0);

	const apiBase = useMemo(
		() => import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "",
		[]
	);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setAvatarFile(file);
		if (file) {
			setAvatarPreview(URL.createObjectURL(file));
		} else {
			setAvatarPreview("");
		}
	};

	const validateStep = () => {
		if (stepIndex === 0) {
			return form.name && form.username && form.email;
		}
		if (stepIndex === 1) {
			return form.password && form.confirmPassword;
		}
		return true;
	};

	const handleBack = () => {
		setStatus("idle");
		setMessage("");
		setStepIndex((prev) => Math.max(prev - 1, 0));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateStep()) {
			setStatus("error");
			setMessage("Please fill required fields for this step");
			return;
		}
		if (stepIndex < steps.length - 1) {
			setStatus("idle");
			setMessage("");
			setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
			return;
		}
		if (form.password !== form.confirmPassword) {
			setStatus("error");
			setMessage("Passwords do not match");
			return;
		}

		try {
			setStatus("loading");

			const data = new FormData();
			data.append("name", form.name);
			data.append("username", form.username);
			data.append("email", form.email);
			data.append("password", form.password);
			if (form.location) data.append("location", form.location);
			if (form.experienceLevel) data.append("experienceLevel", form.experienceLevel);
			if (form.skills) data.append("skills", form.skills);
			if (form.bio) data.append("bio", form.bio);
			if (form.github) data.append("github", form.github);
			if (form.linkedin) data.append("linkedin", form.linkedin);
			if (form.portfolio) data.append("portfolio", form.portfolio);
			if (avatarFile) data.append("avatar", avatarFile);

			const response = await fetch(`${apiBase}/api/auth/register`, {
				method: "POST",
				body: data,
			});

			let body: { message?: string } = {};
			let responseText = "";

			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				try {
					body = (await response.json()) as { message?: string };
				} catch (parseError) {
					console.warn("Unable to parse signup JSON response", parseError);
				}
			} else {
				responseText = await response.text();
			}

			if (!response.ok) {
				const fallback = body.message || responseText || `Request failed with status ${response.status}`;
				throw new Error(fallback);
			}

			setStatus("success");
			setMessage("Account created. You can now log in.");
			setForm(defaultForm);
			setAvatarFile(null);
			setAvatarPreview("");
			setStepIndex(0);
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Something went wrong");
		}
	};

	const progress = ((stepIndex + 1) / steps.length) * 100;

	const renderStepFields = () => {
		switch (stepIndex) {
			case 0:
				return (
					<>
						<div className="form-row">
							<label>
								Full name*
								<input
									name="name"
									value={form.name}
									onChange={handleChange}
									placeholder="Ada Lovelace"
									required
								/>
							</label>
							<label>
								Username*
								<input
									name="username"
									value={form.username}
									onChange={handleChange}
									placeholder="adalabs"
									required
								/>
							</label>
						</div>

						<div className="form-row">
							<label>
								Email*
								<input
									type="email"
									name="email"
									value={form.email}
									onChange={handleChange}
									placeholder="you@devmail.com"
									required
								/>
							</label>
							<label>
								Location
								<input
									name="location"
									value={form.location}
									onChange={handleChange}
									placeholder="Remote / City"
								/>
							</label>
						</div>
					</>
				);
			case 1:
				return (
					<>
						<div className="form-row">
							<label>
								Password*
								<input
									type="password"
									name="password"
									value={form.password}
									onChange={handleChange}
									placeholder="••••••••"
									required
								/>
							</label>
							<label>
								Confirm password*
								<input
									type="password"
									name="confirmPassword"
									value={form.confirmPassword}
									onChange={handleChange}
									placeholder="••••••••"
									required
								/>
							</label>
						</div>

						<div className="form-row">
							<label>
								Experience level
								<select name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
									<option value="">Select</option>
									<option value="junior">Junior</option>
									<option value="mid">Mid</option>
									<option value="senior">Senior</option>
									<option value="lead">Lead / Principal</option>
								</select>
							</label>
							<label>
								Skills (comma separated)
								<input
									name="skills"
									value={form.skills}
									onChange={handleChange}
									placeholder="React, Node.js, Design Systems"
								/>
							</label>
						</div>

						<label>
							Bio
							<textarea
								name="bio"
								value={form.bio}
								onChange={handleChange}
								rows={3}
								placeholder="What are you building next?"
							/>
						</label>
					</>
				);
			case 2:
				return (
					<>
						<div className="form-row">
							<label>
								GitHub
								<input
									name="github"
									value={form.github}
									onChange={handleChange}
									placeholder="https://github.com/adalabs"
								/>
							</label>
							<label>
								LinkedIn
								<input
									name="linkedin"
									value={form.linkedin}
									onChange={handleChange}
									placeholder="https://linkedin.com/in/adalabs"
								/>
							</label>
						</div>

						<label>
							Portfolio
							<input
								name="portfolio"
								value={form.portfolio}
								onChange={handleChange}
								placeholder="https://adalabs.dev"
							/>
						</label>

						<label className="file-label">
							Profile photo
							<div className="file-input">
								<input type="file" accept="image/*" onChange={handleFileChange} />
								<span>{avatarFile?.name || "Upload JPEG or PNG (max 2MB)"}</span>
							</div>
						</label>
					</>
				);
			default:
				return null;
		}
	};

	return (
		<main className="signup-page">
			<section className="signup-shell">
				<div className="signup-visual" aria-hidden>
					<div className="visual-card visual-card--light">
						<img src={heroImage} alt="Build in public" />
					</div>
					<div className="visual-copy">
						<p className="pill">WorkYard</p>
						<h2>Join the builders</h2>
						<p>Share projects, collect feedback, and meet collaborators who match your stack.</p>
						<ul className="benefits">
							<li>Developer-first profiles</li>
							<li>Project updates with GitHub links</li>
							<li>Signal-driven feedback</li>
						</ul>
					</div>
				</div>

				<div className="signup-card">
					<header className="signup-header">
						<div>
							<p className="eyebrow">Create your account</p>
							<h1>Start building in public</h1>
							<p className="lede">
								Complete the steps to personalize your profile and join the feed.
							</p>
						</div>
						{avatarPreview && (
							<div className="avatar-preview" aria-label="Avatar preview">
								<img src={avatarPreview} alt="Avatar preview" />
							</div>
						)}
					</header>

					<div className="step-progress">
						<div className="progress-track">
							<div className="progress-fill" style={{ width: `${progress}%` }} />
						</div>
						<div className="step-dots">
							{steps.map((step, idx) => (
								<button
									key={step.key}
									type="button"
									className={`step-dot ${idx === stepIndex ? "active" : ""} ${idx < stepIndex ? "done" : ""}`}
									onClick={() => setStepIndex(idx)}
									aria-label={`Go to step ${idx + 1}: ${step.title}`}
								/>
							))}
						</div>
						<div className="step-labels">
							{steps.map((step, idx) => (
								<div key={step.key} className={`step-label ${idx === stepIndex ? "active" : ""}`}>
									<p className="label-title">{step.title}</p>
									<p className="label-caption">{step.caption}</p>
								</div>
							))}
						</div>
					</div>

					<form className="signup-form" onSubmit={handleSubmit}>
						<div className="form-step-content">{renderStepFields()}</div>

						{message && (
							<div className={`form-alert ${status}`} role="status">
								{message}
							</div>
						)}

						<div className="form-actions">
							<button
								type="button"
								className="ghost-btn"
								onClick={handleBack}
								disabled={stepIndex === 0 || status === "loading"}
							>
								Back
							</button>
							{stepIndex < steps.length - 1 ? (
								<button className="primary" type="submit" disabled={status === "loading"}>
									Next
								</button>
							) : (
								<button className="primary" type="submit" disabled={status === "loading"}>
									{status === "loading" ? "Creating account..." : "Create account"}
								</button>
							)}
						</div>
					</form>

					<p className="signup-footer">
						Already have an account? <a className="link" href="/login">Sign in</a>
					</p>
				</div>
			</section>
		</main>
	);
}
