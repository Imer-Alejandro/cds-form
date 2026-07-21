export function generateSurveyUrl(surveyId: string, baseUrl: string = ""): string {
  const url = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${url}/survey/${surveyId}`;
}

export function generateQRCodeUrl(
  surveyUrl: string,
  size: number = 300
): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(surveyUrl)}`;
}

export function calculateCompletionRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return (completed / total) * 100;
}

export function calculateAverageCompletionTime(
  times: number[]
): number | undefined {
  if (times.length === 0) return undefined;
  const sum = times.reduce((a, b) => a + b, 0);
  return Math.round(sum / times.length);
}

export function generateShareableLink(surveyId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return generateSurveyUrl(surveyId, baseUrl);
}

export function parseJsonSafe<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (e) {
    return fallback;
  }
}
