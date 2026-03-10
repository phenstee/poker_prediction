import { ApiError, apiGet, apiPost, getApiConfig } from "./client";
import {
  type AdviceRequest,
  type AdviceResponse,
  adviceRequestSchema,
  adviceResponseSchema,
  validateNoDuplicates,
} from "../utils/validation";

export type RecommendationSource = "api" | "offline" | "none";
export type ApiStatus = "ok" | "unreachable" | "error";

export interface AdviceResult {
  source: RecommendationSource;
  apiStatus: ApiStatus;
  errorMessage?: string;
  requestId?: string;
  createdAt: number;
  request: AdviceRequest;
  response?: AdviceResponse;
  rawResponse?: unknown;
  rawError?: string;
  httpStatus?: number;
  apiBaseUrl: string;
  resolvedUrl?: string;
}

export interface HealthResult {
  ok: boolean;
  apiStatus: ApiStatus;
  errorMessage?: string;
  httpStatus?: number;
  rawBody?: unknown;
  resolvedUrl: string;
  apiBaseUrl: string;
  backendOrigin: string;
  warning?: string;
}

export async function checkHealth(): Promise<HealthResult> {
  const cfg = getApiConfig();

  try {
    const { data, status, url } = await apiGet<unknown>("/health");
    return {
      ok: true,
      apiStatus: "ok",
      httpStatus: status,
      rawBody: data,
      resolvedUrl: url,
      apiBaseUrl: cfg.baseUrl,
      backendOrigin: cfg.backendOrigin,
      warning: cfg.warning,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      const unreachable = error.status === undefined;
      return {
        ok: false,
        apiStatus: unreachable ? "unreachable" : "error",
        errorMessage: error.message,
        httpStatus: error.status,
        rawBody: error.responseBody,
        resolvedUrl: error.url,
        apiBaseUrl: cfg.baseUrl,
        backendOrigin: cfg.backendOrigin,
        warning: cfg.warning,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown health check error";
    return {
      ok: false,
      apiStatus: "error",
      errorMessage: message,
      rawBody: message,
      resolvedUrl: `${cfg.baseUrl}/health`,
      apiBaseUrl: cfg.baseUrl,
      backendOrigin: cfg.backendOrigin,
      warning: cfg.warning,
    };
  }
}

export async function fetchAdvice(input: AdviceRequest): Promise<AdviceResult> {
  const payload = adviceRequestSchema.parse(input);
  validateNoDuplicates([...payload.hero_hole, ...payload.board]);
  const cfg = getApiConfig();

  try {
    const { data, status, requestId, url } = await apiPost<unknown, AdviceRequest>("/advice", payload);
    const parsed = adviceResponseSchema.parse(data);
    return {
      source: "api",
      apiStatus: "ok",
      requestId,
      createdAt: Date.now(),
      request: payload,
      response: parsed,
      rawResponse: data,
      httpStatus: status,
      apiBaseUrl: cfg.baseUrl,
      resolvedUrl: url,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      const unreachable = error.status === undefined;
      return {
        source: "none",
        apiStatus: unreachable ? "unreachable" : "error",
        errorMessage: error.message,
        createdAt: Date.now(),
        request: payload,
        rawError: error.responseBody ?? error.message,
        httpStatus: error.status,
        apiBaseUrl: cfg.baseUrl,
        resolvedUrl: error.url,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      source: "none",
      apiStatus: "error",
      errorMessage: message,
      createdAt: Date.now(),
      request: payload,
      rawError: message,
      apiBaseUrl: cfg.baseUrl,
      resolvedUrl: `${cfg.baseUrl}/advice`,
    };
  }
}
