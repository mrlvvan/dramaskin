export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

/** Origin API без суффикса /api — для статики загрузок (/uploads/...) */
export function getApiAssetOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/i, "");
}

/** Путь картинки товара: абсолютный URL, /uploads/... с API-хоста, иначе как есть (например /krem1.png с фронта) */
export function resolveProductImageUrl(imageUrl: string | null | undefined, fallback = "/krem1.png"): string {
  const raw = String(imageUrl ?? "").trim();
  const u = raw || fallback;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/uploads/")) {
    return `${getApiAssetOrigin()}${u}`;
  }
  return u;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

async function parseErrorMessage(response: Response) {
  let message = "Не удалось выполнить запрос";
  try {
    const data = (await response.json()) as { message?: string };
    if (data?.message) message = data.message;
  } catch {
    // ignore json parse errors and keep fallback message
  }
  return message;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("dramma_refresh_token");
    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };

    localStorage.setItem("dramma_access_token", data.accessToken);
    localStorage.setItem("dramma_refresh_token", data.refreshToken);
    return data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/** POST multipart с тем же refresh по 401, что и apiRequest (без Content-Type — задаст браузер) */
export async function authenticatedUpload(path: string, formData: FormData): Promise<Response> {
  const accessToken = localStorage.getItem("dramma_access_token");
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401 && accessToken) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${newAccessToken}` },
        body: formData,
      });
    }
  }

  return response;
}

function buildHeaders(auth: boolean) {
  const accessToken = localStorage.getItem("dramma_access_token");
  return {
    "Content-Type": "application/json",
    ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function apiRequest<T>(path: string, { method = "GET", body, auth = false }: RequestOptions = {}): Promise<T> {
  let response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(auth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (auth && response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(auth),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
