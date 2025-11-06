import axios, { AxiosError } from "axios";

function sanitizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function isRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function pickEnvBaseUrl(): string | null {
  const env = import.meta.env || {};
  const candidates = [
    env.VITE_API_BASE_URL,
    env.VITE_BACKEND_URL,
  ] as Array<string | undefined>;

  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = String(candidate).trim();
    if (!value) continue;

    if (isRelativePath(value) && typeof window !== "undefined") {
      return sanitizeUrl(`${window.location.origin}${value}`);
    }

    if (/^https?:\/\//i.test(value)) {
      return sanitizeUrl(value);
    }
  }

  return null;
}

function buildFallbackBaseUrl(): string {
  const defaultPort =
    (import.meta.env.VITE_BACKEND_PORT &&
      String(import.meta.env.VITE_BACKEND_PORT)) ||
    "8000";

  if (typeof window === "undefined") {
    return `http://127.0.0.1:${defaultPort}`;
  }

  const { origin, protocol, hostname } = window.location;
  if (origin) return origin;

  return `${protocol}//${hostname}:${defaultPort}`;
}

const rawBaseUrl = pickEnvBaseUrl() || buildFallbackBaseUrl();
const API_BASE_URL = sanitizeUrl(rawBaseUrl);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string;
      message?: string;
    }>;
    return (
      axiosError.response?.data?.detail ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      "요청 처리 중 오류가 발생했습니다."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function login(payload: Record<string, unknown>) {
  try {
    const { data } = await apiClient.post("/api/auth/login", payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getVisitorEvents(params?: Record<string, unknown>) {
  try {
    const { data } = await apiClient.get("/api/visitor/events", { params });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getVisitorEventDetail(
  eventId: number | string,
  params?: Record<string, unknown>
) {
  try {
    const { data } = await apiClient.get(`/api/visitor/events/${eventId}`, {
      params,
    });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getSurveyDetail(surveyId: number | string) {
  try {
    const { data } = await apiClient.get(`/api/visitor/surveys/${surveyId}`);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function submitSurveyResponse(
  surveyId: number | string,
  payload: Record<string, unknown>
) {
  try {
    const { data } = await apiClient.post(
      `/api/visitor/surveys/${surveyId}/responses`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function requestMagicLink(payload: Record<string, unknown>) {
  try {
    const { data } = await apiClient.post("/api/auth/magic-link", payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function verifyMagicLink(token: string) {
  try {
    const { data } = await apiClient.get("/api/auth/verify", {
      params: { token },
    });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function analyzeEventImage(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await apiClient.post(
      "/api/events/analyze-image",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function createEvent(payload: Record<string, unknown>) {
  try {
    const { data } = await apiClient.post("/api/events", payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getCompanyDashboard(companyId: number | string) {
  try {
    const { data } = await apiClient.get(
      `/api/companies/${companyId}/dashboard`
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getCompanyEvents(companyId: number | string) {
  try {
    const { data } = await apiClient.get(`/api/companies/${companyId}/events`);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getCompanySurveys(companyId: number | string) {
  try {
    const { data } = await apiClient.get(`/api/companies/${companyId}/surveys`);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getSurveyStatistics(surveyId: number | string) {
  try {
    const { data } = await apiClient.get(
      `/api/companies/surveys/${surveyId}/stats`
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getAdminDashboard() {
  try {
    const { data } = await apiClient.get("/api/admin/dashboard");
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getAdminCompanies() {
  try {
    const { data } = await apiClient.get("/api/admin/companies");
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getAdminEvents() {
  try {
    const { data } = await apiClient.get("/api/admin/events");
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function getAdminResponses(params?: Record<string, unknown>) {
  try {
    const { data } = await apiClient.get("/api/admin/responses", { params });
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function createCompanyAccount(payload: Record<string, unknown>) {
  try {
    const { data } = await apiClient.post("/api/admin/companies", payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function addEventManager(
  eventId: number | string,
  payload: Record<string, unknown>
) {
  try {
    const { data } = await apiClient.post(
      `/api/admin/events/${eventId}/managers`,
      payload
    );
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export default apiClient;
