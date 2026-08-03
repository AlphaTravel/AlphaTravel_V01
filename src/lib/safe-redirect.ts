const localOrigin = "https://alphatravel.invalid";

export function safeLocalPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;

  try {
    const target = new URL(value, localOrigin);
    if (target.origin !== localOrigin || !value.startsWith("/")) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
