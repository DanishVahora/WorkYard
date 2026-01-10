import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import type { Project, ProjectDetailResponse } from "../types/project";

type EditorMode = "create" | "edit";

type FormState = {
	title: string;
	summary: string;
	description: string;
	objective: string;
	problemStatement: string;
	solutionOverview: string;
	successMetrics: string;
	tags: string;
	keyFeatures: string;
	collaborators: string;
	visibility: "public" | "private";
	status: "draft" | "published";
	githubUrl: string;
	liveUrl: string;
	otherLinks: string;
	budget: string;
	callToAction: string;
};

type RoadmapItem = {
	id: string;
	title: string;
	dueDate: string;
	description: string;
};

type GalleryItem = {
	id: string;
	type: "existing" | "new";
	preview: string;
	path?: string;
	file?: File;
	objectUrl?: string;
};

type ProjectEditorPageProps = {
	mode: EditorMode;
};

const defaultForm: FormState = {
	title: "",
	summary: "",
	description: "",
	objective: "",
	problemStatement: "",
	solutionOverview: "",
	successMetrics: "",
	tags: "",
	keyFeatures: "",
	collaborators: "",
	visibility: "public",
	status: "published",
	githubUrl: "",
	liveUrl: "",
	otherLinks: "",
	budget: "",
	callToAction: "",
};

const steps = [
	{ id: "basics", label: "Basics", hint: "Set the foundation" },
	{ id: "story", label: "Narrative", hint: "Tell the story" },
	{ id: "scope", label: "Team & Plan", hint: "Collaborators and milestones" },
	{ id: "launch", label: "Media & Publish", hint: "Assets and rollout" },
];

const MAX_GALLERY_ITEMS = 12;

const parseList = (value: string) =>
	value
		.split(/[\n,]/)
		.map((entry) => entry.trim())
		.filter(Boolean);

const toFormState = (project: Project): FormState => {
	const tags = project.tags?.join(", ") || "";
	const links = project.links || [];
	const githubLink = links.find((link) => link.toLowerCase().includes("github")) || "";
	const liveLink = links.find((link) => link !== githubLink && link.toLowerCase().includes("http")) || "";
	const remaining = links.filter((link) => link !== githubLink && link !== liveLink);

	return {
		title: project.title || "",
		summary: project.summary || "",
		description: project.description || "",
		objective: project.objective || "",
		problemStatement: project.problemStatement || "",
		solutionOverview: project.solutionOverview || "",
		successMetrics: project.successMetrics || "",
		tags,
		keyFeatures: project.keyFeatures?.join("\n") || "",
		collaborators: project.collaborators?.join("\n") || "",
		visibility: project.visibility === "private" ? "private" : "public",
		status: project.status === "draft" || project.status === "published" ? project.status : "published",
		githubUrl: githubLink,
		liveUrl: liveLink,
		otherLinks: remaining.join("\n"),
		budget: project.budget || "",
		callToAction: project.callToAction || "",
	};
};

const toRoadmapState = (project?: Project): RoadmapItem[] => {
	if (!project?.roadmap) return [];
	return project.roadmap.map((item, index) => ({
		id: `existing-${index}`,
		title: item.title || "",
		dueDate: item.targetDate ? item.targetDate.slice(0, 10) : "",
		description: item.description || "",
	}));
};

const createId = () => `id-${Math.random().toString(36).slice(2)}`;

export default function ProjectEditorPage({ mode }: ProjectEditorPageProps) {
	const isEdit = mode === "edit";
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { token } = useAuth();

	const [form, setForm] = useState<FormState>(defaultForm);
	const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
	const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
	const [loading, setLoading] = useState(isEdit);
	const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
	const [message, setMessage] = useState("");
	const [existingHero, setExistingHero] = useState<string | undefined>(undefined);
	const [heroPreview, setHeroPreview] = useState<string | null>(null);
	const [heroFile, setHeroFile] = useState<File | null>(null);
	const [heroObjectUrl, setHeroObjectUrl] = useState<string | null>(null);
	const [removeHero, setRemoveHero] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const galleryInputRef = useRef<HTMLInputElement | null>(null);
	const galleryObjectUrls = useRef<string[]>([]);

	const disableSubmit = status === "saving";

	const resetState = () => {
		if (status !== "idle") {
			setStatus("idle");
			setMessage("");
		}
	};

	useEffect(() => {
		return () => {
			if (heroObjectUrl) {
				URL.revokeObjectURL(heroObjectUrl);
			}
		};
	}, [heroObjectUrl]);

	useEffect(() => {
		return () => {
			galleryObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
			galleryObjectUrls.current = [];
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadProject() {
			if (!isEdit) return;
			if (!id) {
				setMessage("Missing project identifier");
				setStatus("error");
				setLoading(false);
				return;
			}
			if (!token) {
				setMessage("Sign in to edit your project.");
				setStatus("error");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await apiFetch<ProjectDetailResponse>(`/api/projects/${id}`, { token });
				if (cancelled) return;
				setForm(toFormState(response.project));
				setRoadmap(toRoadmapState(response.project));
				const heroPath = response.project.heroImage || undefined;
				setExistingHero(heroPath);
				setHeroPreview(heroPath ? resolveMediaUrl(heroPath) ?? null : null);
				setHeroFile(null);
				setHeroObjectUrl(null);
				setRemoveHero(false);
				const existingGallery = (response.project.gallery || []).map((path, index) => ({
					id: `gallery-existing-${index}`,
					type: "existing" as const,
					preview: resolveMediaUrl(path) ?? path,
					path,
				}));
				setGalleryItems(existingGallery);
			} catch (err) {
				if (!cancelled) {
					setStatus("error");
					setMessage(err instanceof Error ? err.message : "Unable to load project");
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadProject();

		return () => {
			cancelled = true;
		};
	}, [id, isEdit, token]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, [currentStep]);

	const handleChange = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = event.target;
		resetState();
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleHeroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		resetState();
		const file = event.target.files?.[0] || null;

		if (heroObjectUrl) {
			URL.revokeObjectURL(heroObjectUrl);
			setHeroObjectUrl(null);
		}

		if (file) {
			setHeroFile(file);
			const objectUrl = URL.createObjectURL(file);
			setHeroObjectUrl(objectUrl);
			setHeroPreview(objectUrl);
			setRemoveHero(false);
		} else {
			setHeroFile(null);
			const fallback = existingHero ? resolveMediaUrl(existingHero) : null;
			setHeroPreview(fallback ?? null);
		}
	};

	const handleRemoveHero = () => {
		resetState();
		if (heroObjectUrl) {
			URL.revokeObjectURL(heroObjectUrl);
			setHeroObjectUrl(null);
		}
		setHeroFile(null);
		setHeroPreview(null);
		setExistingHero(undefined);
		setRemoveHero(isEdit);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		resetState();
		const files = event.target.files ? Array.from(event.target.files) : [];
		if (!files.length) return;

		const remainingSlots = Math.max(MAX_GALLERY_ITEMS - galleryItems.length, 0);
		if (!remainingSlots) {
			setStatus("error");
			setMessage("Gallery is limited to 12 images.");
			if (galleryInputRef.current) {
				galleryInputRef.current.value = "";
			}
			return;
		}

		const selected = files.slice(0, remainingSlots);
		const items: GalleryItem[] = selected.map((file) => {
			const objectUrl = URL.createObjectURL(file);
			galleryObjectUrls.current.push(objectUrl);
			return {
				id: createId(),
				type: "new",
				file,
				objectUrl,
				preview: objectUrl,
			};
		});

		setGalleryItems((prev) => [...prev, ...items]);

		if (galleryInputRef.current) {
			galleryInputRef.current.value = "";
		}
	};

	const handleRemoveGalleryItem = (item: GalleryItem) => {
		resetState();
		if (item.type === "new" && item.objectUrl) {
			URL.revokeObjectURL(item.objectUrl);
			galleryObjectUrls.current = galleryObjectUrls.current.filter((url) => url !== item.objectUrl);
		}
		setGalleryItems((prev) => prev.filter((entry) => entry.id !== item.id));
	};

	const handleAddMilestone = () => {
		resetState();
		setRoadmap((prev) => [
			...prev,
			{
				id: createId(),
				title: "",
				dueDate: "",
				description: "",
			},
		]);
	};

	const handleMilestoneChange = (
		id: string,
		field: keyof Omit<RoadmapItem, "id">,
		value: string
	) => {
		resetState();
		setRoadmap((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
	};

	const handleRemoveMilestone = (id: string) => {
		resetState();
		setRoadmap((prev) => prev.filter((item) => item.id !== id));
	};

	const goToStep = (stepIndex: number) => {
		resetState();
		setCurrentStep(stepIndex);
	};

	const handlePrevStep = () => {
		if (currentStep === 0) return;
		goToStep(currentStep - 1);
	};

	const submitProject = async () => {
		if (!token) {
			setStatus("error");
			setMessage("Log in again to continue.");
			return;
		}

		if (!form.title.trim() || !form.summary.trim()) {
			setStatus("error");
			setMessage("Add a project title and a short summary before publishing.");
			goToStep(0);
			return;
		}

		try {
			setStatus("saving");
			setMessage(isEdit ? "Updating project…" : "Publishing your project…");

			if (isEdit && !id) {
				throw new Error("Missing project identifier");
			}

			const tags = parseList(form.tags).slice(0, 25);
			const linkCandidates = [form.githubUrl, form.liveUrl, ...parseList(form.otherLinks)].map((link) =>
				link.trim()
			);
			const links = Array.from(new Set(linkCandidates.filter(Boolean))).slice(0, 20);
			const keyFeatures = parseList(form.keyFeatures).slice(0, 20);
			const collaborators = parseList(form.collaborators).slice(0, 20);
			const roadmapPayload = roadmap
				.map((item) => ({
					title: item.title.trim(),
					description: item.description.trim(),
					targetDate: item.dueDate.trim(),
				}))
				.filter((item) => item.title)
				.slice(0, 12);

			const formData = new FormData();
			formData.append("title", form.title.trim());
			formData.append("summary", form.summary.trim());
			formData.append("description", form.description.trim());
			formData.append("objective", form.objective.trim());
			formData.append("problemStatement", form.problemStatement.trim());
			formData.append("solutionOverview", form.solutionOverview.trim());
			formData.append("successMetrics", form.successMetrics.trim());
			formData.append("tags", tags.join(", "));
			formData.append("keyFeatures", keyFeatures.join(", "));
			formData.append("collaborators", collaborators.join(", "));
			formData.append("links", links.join("\n"));
			formData.append("visibility", form.visibility);
			formData.append("status", form.status);
			formData.append("budget", form.budget.trim());
			formData.append("callToAction", form.callToAction.trim());
			formData.append("roadmap", JSON.stringify(roadmapPayload));

			if (heroFile) {
				formData.append("heroImage", heroFile);
			} else if (isEdit && removeHero) {
				formData.append("heroImage", "");
			} else if (!isEdit && existingHero) {
				formData.append("heroImage", existingHero);
			}

			const keepGallery = galleryItems
				.filter((item) => item.type === "existing" && item.path)
				.map((item) => item.path as string);
			if (keepGallery.length) {
				formData.append("keepGallery", keepGallery.join("\n"));
			}

			galleryItems
				.filter((item) => item.type === "new" && item.file)
				.forEach((item) => {
					formData.append("gallery", item.file as File);
				});

			const endpoint = isEdit ? `/api/projects/${id}` : "/api/projects";
			const method = isEdit ? "PATCH" : "POST";

			const response = await apiFetch<ProjectDetailResponse>(endpoint, {
				method,
				body: formData,
				token,
			});

			setStatus("success");
			setMessage(isEdit ? "Project updated." : "Project published successfully.");

			if (isEdit) {
				navigate(`/projects/${response.project.id}`, { replace: true });
			} else {
				setForm(defaultForm);
				setRoadmap([]);
				setExistingHero(undefined);
				setHeroPreview(null);
				setHeroFile(null);
				setHeroObjectUrl(null);
				setRemoveHero(false);
				setGalleryItems([]);
				galleryObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
				galleryObjectUrls.current = [];
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
				if (galleryInputRef.current) {
					galleryInputRef.current.value = "";
				}
				navigate("/feed", { replace: true });
			}
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Unable to save project");
		}
	};

	const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		resetState();
		if (currentStep < steps.length - 1) {
			goToStep(currentStep + 1);
			return;
		}
		await submitProject();
	};

	const primaryActionLabel = useMemo(() => {
		if (status === "saving") {
			return isEdit ? "Updating…" : "Publishing…";
		}
		if (currentStep < steps.length - 1) {
			return "Next step";
		}
		return isEdit ? "Update project" : "Publish project";
	}, [currentStep, isEdit, status]);

	const pageTitle = useMemo(() => (isEdit ? "Update project" : "Add project"), [isEdit]);

	if (loading) {
		return (
			<main className="page-shell">
				<div style={{ textAlign: "center", color: "var(--page-muted)" }}>Loading project…</div>
			</main>
		);
	}

	const renderBasicsStep = () => (
		<section className="editor-section">
			<header className="editor-section__header">
				<div>
					<p className="editor-section__kicker">Step 1</p>
					<h2>Project essentials</h2>
					<p className="editor-section__hint">Give your project a clear identity and choose how visible it should be.</p>
				</div>
			</header>
			<div className="editor-grid">
				<label>
					Project title*
					<input
						name="title"
						value={form.title}
						onChange={handleChange}
						placeholder="Synthwave Croner"
						autoComplete="off"
					/>
				</label>
				<label>
					Visibility
					<select name="visibility" value={form.visibility} onChange={handleChange}>
						<option value="public">Public — shown in Explore</option>
						<option value="private">Private — only visible to you</option>
					</select>
				</label>
				<label>
					Status
					<select name="status" value={form.status} onChange={handleChange}>
						<option value="published">Published</option>
						<option value="draft">Draft</option>
					</select>
				</label>
			</div>
			<label>
				Short summary*
				<textarea
					name="summary"
					value={form.summary}
					onChange={handleChange}
					placeholder="Give people the headline version of this update"
				/>
			</label>
		</section>
	);

	const renderNarrativeStep = () => (
		<section className="editor-section">
			<header className="editor-section__header">
				<div>
					<p className="editor-section__kicker">Step 2</p>
					<h2>Shape the narrative</h2>
					<p className="editor-section__hint">Explain the problem, your solution, and what success looks like.</p>
				</div>
			</header>
			<label>
				Objective
				<textarea
					name="objective"
					value={form.objective}
					onChange={handleChange}
					placeholder="What are you hoping to achieve with this project?"
					rows={3}
				/>
			</label>
			<label>
				Problem statement
				<textarea
					name="problemStatement"
					value={form.problemStatement}
					onChange={handleChange}
					placeholder="Describe the challenge or opportunity you are tackling."
					rows={4}
				/>
			</label>
			<label>
				Solution overview
				<textarea
					name="solutionOverview"
					value={form.solutionOverview}
					onChange={handleChange}
					placeholder="Share how you are solving the problem and what makes it distinct."
					rows={4}
				/>
			</label>
			<label>
				Success metrics
				<textarea
					name="successMetrics"
					value={form.successMetrics}
					onChange={handleChange}
					placeholder="How will you measure progress or success?"
					rows={3}
				/>
			</label>
			<label>
				Full description
				<textarea
					name="description"
					value={form.description}
					onChange={handleChange}
					placeholder="Share context, embed links, and outline what is next."
					rows={6}
				/>
			</label>
		</section>
	);

	const renderScopeStep = () => (
		<section className="editor-section">
			<header className="editor-section__header">
				<div>
					<p className="editor-section__kicker">Step 3</p>
					<h2>Clarify the scope</h2>
					<p className="editor-section__hint">Highlight the tech stack, collaborators, and upcoming milestones.</p>
				</div>
			</header>
			<label>
				Tech stack / tags
				<textarea
					name="tags"
					value={form.tags}
					onChange={handleChange}
					placeholder="design system, ai, infra"
					rows={3}
				/>
			</label>
			<label>
				Key features
				<textarea
					name="keyFeatures"
					value={form.keyFeatures}
					onChange={handleChange}
					placeholder="List standout capabilities or deliverables"
					rows={3}
				/>
				<small className="editor-field-hint">One feature per line. Up to 20 items.</small>
			</label>
			<label>
				Collaborators
				<textarea
					name="collaborators"
					value={form.collaborators}
					onChange={handleChange}
					placeholder="Name teammates, partners, or advisors"
					rows={3}
				/>
				<small className="editor-field-hint">One collaborator per line. Up to 20 entries.</small>
			</label>
			<label>
				Budget or resources
				<input
					name="budget"
					value={form.budget}
					onChange={handleChange}
					placeholder="Optional: tooling, funding, or constraints"
				/>
			</label>
			<div className="editor-roadmap">
				<div className="editor-roadmap__header">
					<h3>Milestones</h3>
					<button type="button" className="page-button secondary" onClick={handleAddMilestone}>
						Add milestone
					</button>
				</div>
				{roadmap.length === 0 && (
					<p className="editor-roadmap__empty">Outline the next few checkpoints to show momentum.</p>
				)}
				{roadmap.map((item, index) => (
					<div key={item.id} className="editor-roadmap__item">
						<div className="editor-roadmap__item-header">
							<span>Milestone {index + 1}</span>
							<button
								type="button"
								className="editor-roadmap__remove"
								onClick={() => handleRemoveMilestone(item.id)}
							>
								Remove
							</button>
						</div>
						<div className="editor-grid editor-grid--compact">
							<label>
								Title
								<input
									value={item.title}
									onChange={(event) => handleMilestoneChange(item.id, "title", event.target.value)}
									placeholder="Ship MVP"
								/>
							</label>
							<label>
								Target date
								<input
									type="date"
									value={item.dueDate}
									onChange={(event) => handleMilestoneChange(item.id, "dueDate", event.target.value)}
								/>
							</label>
						</div>
						<label>
							Notes
							<textarea
								value={item.description}
								onChange={(event) => handleMilestoneChange(item.id, "description", event.target.value)}
								placeholder="What will be delivered or learned at this stage?"
								rows={3}
							/>
						</label>
					</div>
				))}
			</div>
		</section>
	);

	const renderLaunchStep = () => (
		<section className="editor-section">
			<header className="editor-section__header">
				<div>
					<p className="editor-section__kicker">Step 4</p>
					<h2>Polish and publish</h2>
					<p className="editor-section__hint">Add visuals, helpful links, and a clear call to action.</p>
				</div>
			</header>
			<fieldset className="page-form-file">
				<legend>Hero image</legend>
				{heroPreview ? (
					<div className="page-form-file__preview">
						<img src={heroPreview} alt="Selected hero preview" />
					</div>
				) : (
					<p className="page-form-file__placeholder">Upload a featured image to showcase your project.</p>
				)}
				<div className="page-form-file__controls">
					<input ref={fileInputRef} type="file" accept="image/*" onChange={handleHeroChange} />
					{(heroPreview || existingHero) && (
						<button type="button" className="page-button secondary" onClick={handleRemoveHero}>
							Remove image
						</button>
					)}
				</div>
				<small className="page-form-file__hint">Recommended 1200×630 PNG or JPG, up to 8MB.</small>
			</fieldset>

			<fieldset className="page-form-file">
				<legend>Project gallery</legend>
				{galleryItems.length > 0 ? (
					<div className="editor-gallery">
						{galleryItems.map((item) => (
							<div key={item.id} className="editor-gallery__item">
								<img src={item.preview} alt="Project gallery preview" />
								<button type="button" onClick={() => handleRemoveGalleryItem(item)}>
									Remove
								</button>
							</div>
						))}
					</div>
				) : (
					<p className="page-form-file__placeholder">Add multiple shots, sketches, or production images.</p>
				)}
				<div className="page-form-file__controls">
					<input
						ref={galleryInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleGalleryChange}
					/>
					{galleryItems.length > 0 && (
						<small className="editor-field-hint">{`${galleryItems.length} / ${MAX_GALLERY_ITEMS} images`}</small>
					)}
				</div>
				<small className="page-form-file__hint">PNG, JPG, or WEBP up to 8MB each. Max 12 images.</small>
			</fieldset>

			<label>
				GitHub URL
				<input
					name="githubUrl"
					value={form.githubUrl}
					onChange={handleChange}
					placeholder="https://github.com/workyard"
					autoComplete="off"
				/>
			</label>

			<label>
				Live URL
				<input
					name="liveUrl"
					value={form.liveUrl}
					onChange={handleChange}
					placeholder="https://app.workyard.dev"
					autoComplete="off"
				/>
			</label>

			<label>
				Additional links
				<textarea
					name="otherLinks"
					value={form.otherLinks}
					onChange={handleChange}
					placeholder="conference deck, product video, documentation"
					rows={3}
				/>
				<small className="editor-field-hint">One link per line. We will keep the first 20.</small>
			</label>

			<label>
				Call to action
				<input
					name="callToAction"
					value={form.callToAction}
					onChange={handleChange}
					placeholder="E.g. Request early access or join the waitlist"
				/>
			</label>
		</section>
	);

	const renderCurrentStep = () => {
		switch (currentStep) {
			case 0:
				return renderBasicsStep();
			case 1:
				return renderNarrativeStep();
			case 2:
				return renderScopeStep();
			default:
				return renderLaunchStep();
		}
	};

	return (
		<main className="page-shell">
			<header className="page-header">
				<p className="page-kicker">{pageTitle}</p>
				<h1>{isEdit ? "Keep the momentum going" : "Tell people what you are building"}</h1>
				<p className="page-subtitle">
					{isEdit
						? "Refresh your project details and keep followers updated."
						: "Capture the latest milestone, tag collaborators, and share the next experiment."}
				</p>
			</header>

			<nav className="page-stepper" aria-label="Project creation steps">
				{steps.map((step, index) => {
					const isActive = index === currentStep;
					const isComplete = index < currentStep;
					return (
						<button
							key={step.id}
							type="button"
							className={`page-stepper__item${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
							onClick={() => goToStep(index)}
						>
							<span className="page-stepper__bullet">{index + 1}</span>
							<span className="page-stepper__texts">
								<span className="page-stepper__label">{step.label}</span>
								<span className="page-stepper__hint">{step.hint}</span>
							</span>
						</button>
					);
				})}
			</nav>

			<article className="page-card">
				<form className="page-form" onSubmit={handleFormSubmit}>
					{renderCurrentStep()}

					{message && <p className={`page-alert ${status === "error" ? "error" : "success"}`}>{message}</p>}

					<div className="page-actions">
						{currentStep > 0 && (
							<button type="button" className="page-button secondary" onClick={handlePrevStep} disabled={disableSubmit}>
								Previous
							</button>
						)}
						<button type="submit" className="page-button primary" disabled={disableSubmit}>
							{primaryActionLabel}
						</button>
					</div>
				</form>
			</article>
		</main>
	);
}

