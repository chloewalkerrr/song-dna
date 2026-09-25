// Base URL of the FastAPI backend. Override with VITE_API_URL (e.g. in
// frontend/.env.local) when the backend isn't on the default local address.
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
