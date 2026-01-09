const apiBase = import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || "";

type ApiOptions = RequestInit & { token?: string };

export function getApiBase() {
  return apiBase;
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase}${normalized}`;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  const body = rest.body as BodyInit | null | undefined;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  if (body && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
  });

  const text = await response.text();
  const parseJson = () => {
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch (err) {
      throw new Error("Unable to parse response payload");
    }
  };

  if (!response.ok) {
    const parsed = (() => {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    })() as { message?: string };
    const message = parsed?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parseJson();
}

export function resolveMediaUrl(path?: string | null) {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!path.startsWith("/")) {
    return `${apiBase}/${path}`;
  }
  return `${apiBase}${path}`;
}
