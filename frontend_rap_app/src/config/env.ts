function readEnv(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export const env = {
  appName: readEnv("VITE_APP_NAME", "Rap App Frontend"),
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "/api"),
  backendProxyTarget: readEnv("VITE_BACKEND_PROXY_TARGET", "http://127.0.0.1:8000"),
};
