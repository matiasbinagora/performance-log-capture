export function isLikelyRouteToken(pathToken: string): boolean;
export function safeRelativePath(root: string, path: string): string | null;
export function sanitizeContent(content: string, root: string): string;
export function sanitizeStructuredValue(
  value: string,
  provenance: "filePath" | "route" | "url" | "content",
  root: string,
): string;
