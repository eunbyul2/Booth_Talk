// Google Maps JS API loader
// Usage: await loadGoogleMaps()
// Fetches key from backend endpoint: /api/visitor/maps-api-key
import { getApiBaseUrl } from "../apiClient";

export function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    // If script already being loaded
    const existing = document.getElementById('google-maps-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }

    // Backend base URL: reuse API 클라이언트 설정 (혼합 콘텐츠 방지)
    const envBackendUrl =
      import.meta?.env?.VITE_BACKEND_URL &&
      String(import.meta.env.VITE_BACKEND_URL).trim();
    const backendBase = (envBackendUrl || getApiBaseUrl()).replace(/\/$/, "");

    // Fetch API key from backend with fallbacks
    const candidates = [
      `${backendBase}/api/visitor/maps-api-key`,
      `${backendBase}/api/maps-api-key`,
      `${backendBase}/maps-api-key`,
    ]

    const tryFetch = async (urls) => {
      let lastErr
      for (const url of urls) {
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          if (!data?.key) throw new Error('Empty key')

          const script = document.createElement('script')
          script.id = 'google-maps-js'
          script.async = true
          script.defer = true
          script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}`
          script.onload = () => resolve(window.google)
          script.onerror = reject
          document.head.appendChild(script)
          return
        } catch (e) {
          lastErr = e
        }
      }
      throw lastErr || new Error('Failed to fetch API key')
    }

    tryFetch(candidates)
      .catch((err) => {
        console.error('[Maps] Failed to load API key:', err);
        reject(err);
      });
  });
}
