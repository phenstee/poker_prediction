export interface ApiConfig {
  baseUrl: string;
  backendOrigin: string;
  warning?: string;
}

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_ORIGIN ?? "http://localhost:8000").replace(/\/+$/, "");

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveApiConfig(): ApiConfig {
  const fallbackBase = "/api";

  if (!RAW_API_BASE_URL) {
    return {
      baseUrl: fallbackBase,
      backendOrigin: BACKEND_ORIGIN,
    };
  }

  const normalized = normalizeBaseUrl(RAW_API_BASE_URL);

  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(normalized, window.location.origin);
      if (parsed.origin === window.location.origin && !normalized.startsWith("/api")) {
        return {
          baseUrl: fallbackBase,
          backendOrigin: BACKEND_ORIGIN,
          warning:
            `VITE_API_BASE_URL (${normalized}) points to the frontend origin (${window.location.origin}). ` +
            "Falling back to /api proxy.",
        };
      }
    } catch {
      return {
        baseUrl: fallbackBase,
        backendOrigin: BACKEND_ORIGIN,
        warning: `Invalid VITE_API_BASE_URL (${normalized}). Falling back to /api proxy.`,
      };
    }
  }

  return {
    baseUrl: normalized,
    backendOrigin: BACKEND_ORIGIN,
  };
}

const API_CONFIG = resolveApiConfig();

export interface ApiSuccess<T> {
  data: T;
  status: number;
  requestId?: string;
  url: string;
}

export class ApiError extends Error {
  status?: number;
  url: string;
  responseBody?: string;

  constructor(message: string, options: { status?: number; url: string; responseBody?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.url = options.url;
    this.responseBody = options.responseBody;
  }
}

function buildUrl(path: string): string {
  return `${API_CONFIG.baseUrl}${path}`;
}

export function getApiConfig(): ApiConfig {
  return API_CONFIG;
}

export async function apiGet<TResponse>(path: string): Promise<ApiSuccess<TResponse>> {
  const url = buildUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(message, { url });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed (${response.status})`, {
      status: response.status,
      url,
      responseBody: text,
    });
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  return {
    data: (await response.json()) as TResponse,
    status: response.status,
    requestId,
    url,
  };
}

export async function apiPost<TResponse, TRequest>(path: string, body: TRequest): Promise<ApiSuccess<TResponse>> {
  const url = buildUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(message, { url });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(text || `Request failed (${response.status})`, {
      status: response.status,
      url,
      responseBody: text,
    });
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  return {
    data: (await response.json()) as TResponse,
    status: response.status,
    requestId,
    url,
  };
}
