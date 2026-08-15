export const sanitizeDownloadName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 180) || "wireforge-export";
