// Google Maps JS API loader
// Usage: await loadGoogleMaps()
// Fetches key from backend endpoint: /api/visitor/maps-api-key
import { getApiBaseUrl } from "../apiClient";

const PROMISE_KEY = "__boothtalkMapsPromise";

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in browser"));
  }

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }

  const sharedPromise = window[PROMISE_KEY];
  if (sharedPromise) {
    return sharedPromise;
  }

  const promise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById("google-maps-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", reject);
      return;
    }

    const envBackendUrl =
      import.meta?.env?.VITE_BACKEND_URL &&
      String(import.meta.env.VITE_BACKEND_URL).trim();
    const backendBase = (envBackendUrl || getApiBaseUrl()).replace(/\/$/, "");

    const candidates = [
      `${backendBase}/api/visitor/maps-api-key`,
      `${backendBase}/api/maps-api-key`,
      `${backendBase}/maps-api-key`,
    ];

    const tryFetch = async (urls) => {
      let lastErr;
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!data?.key) throw new Error("Empty key");

          const script = document.createElement("script");
          script.id = "google-maps-js";
          script.async = true;
          script.defer = true;
          script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}`;
          script.onload = () => resolve(window.google);
          script.onerror = (err) => {
            document.head.removeChild(script);
            reject(err);
          };
          document.head.appendChild(script);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Failed to fetch API key");
    };

    tryFetch(candidates).catch((err) => {
      console.error("[Maps] Failed to load API key:", err);
      window[PROMISE_KEY] = undefined;
      reject(err);
    });
  });

  window[PROMISE_KEY] = promise;
  return promise;
}
