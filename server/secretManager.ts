import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * In-memory cache interface for Secret Manager payloads.
 * Protects against excessive API latency and quota consumption,
 * while enabling automatic secret rotation when TTL expires.
 */
interface CachedSecret {
  value: string;
  expiresAt: number;
}

let secretClient: SecretManagerServiceClient | null = null;
let cachedGeminiKey: CachedSecret | null = null;

// Cache TTL: 1 hour (3600 seconds)
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Sanitizes any error message or string to ensure that API keys, auth tokens,
 * bearer tokens, or secret payloads are never emitted in logs or exceptions.
 */
function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage) return 'Unknown error';
  return rawMessage
    // Redact Google API key patterns (e.g., AIzaSy...)
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]')
    // Redact OAuth/ADC access token patterns (e.g., ya29....)
    .replace(/ya29\.[0-9A-Za-z\-_]+/g, '[REDACTED_OAUTH_TOKEN]')
    // Redact generic Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    // Redact potential secret payload strings
    .slice(0, 160);
}

/**
 * Lazy initialization of Google Cloud Secret Manager Client.
 * Authenticates via Google Cloud Application Default Credentials (ADC)
 * using the Cloud Run runtime service account instance metadata.
 * No service account JSON keys are ever created or downloaded.
 */
function getSecretClient(): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = new SecretManagerServiceClient();
  }
  return secretClient;
}

/**
 * Determines the target Google Cloud Project ID for Secret Manager.
 * Explicitly checks GCP environment variables without guessing against client Firebase configs.
 */
function resolveProjectId(): string | undefined {
  if (process.env.GCP_PROJECT_ID && process.env.GCP_PROJECT_ID.trim()) {
    return process.env.GCP_PROJECT_ID.trim();
  }
  if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_PROJECT.trim()) {
    return process.env.GOOGLE_CLOUD_PROJECT.trim();
  }
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT.trim()) {
    return process.env.GCLOUD_PROJECT.trim();
  }
  if (process.env.PROJECT_ID && process.env.PROJECT_ID.trim()) {
    return process.env.PROJECT_ID.trim();
  }
  return undefined;
}

/**
 * Securely retrieves the Gemini API Key.
 *
 * Security Protocol:
 * 1. Checks in-memory cache first.
 * 2. When a GCP project is configured (production / Cloud Run):
 *    - Connects to Secret Manager via ADC (Application Default Credentials).
 *    - Accesses projects/{projectId}/secrets/{secretName}/versions/{secretVersion}.
 *    - If Secret Manager fails, throws an error / fails the request (DOES NOT fallback to env vars).
 * 3. When NO GCP project is configured (local / non-GCP development preview):
 *    - Allows fallback to process.env.GEMINI_API_KEY.
 * 4. NEVER logs secret values, payloads, or auth tokens.
 */
export async function getGeminiApiKeyFromSecretManager(): Promise<string | null> {
  const now = Date.now();

  // Return active cached secret if valid
  if (cachedGeminiKey && cachedGeminiKey.expiresAt > now) {
    return cachedGeminiKey.value;
  }

  const projectId = resolveProjectId();
  const secretName = process.env.GEMINI_SECRET_NAME || 'GEMINI_API_KEY';
  const secretVersion = process.env.GEMINI_SECRET_VERSION || 'latest';

  if (projectId) {
    try {
      const client = getSecretClient();
      const name = `projects/${projectId}/secrets/${secretName}/versions/${secretVersion}`;

      const [version] = await client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();

      if (payload && payload.trim().length > 0) {
        const apiKey = payload.trim();
        cachedGeminiKey = {
          value: apiKey,
          expiresAt: now + CACHE_TTL_MS,
        };
        return apiKey;
      }
      throw new Error(`Secret Manager payload for "${secretName}" was empty.`);
    } catch (err: unknown) {
      const rawErrMsg = err instanceof Error ? err.message : 'Unknown error';
      const sanitizedMsg = sanitizeErrorMessage(rawErrMsg);
      console.error(`[Security] Secret Manager retrieval failed in GCP project "${projectId}": ${sanitizedMsg}`);
      // In GCP/production environment, Secret Manager failure MUST fail the request (no fallback allowed)
      throw new Error(`Secret Manager access failed in GCP project "${projectId}": ${sanitizedMsg}`);
    }
  }

  // Fallback allowed ONLY when NO GCP project ID is configured (e.g. local / sandbox development)
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  return null;
}

/**
 * Invalidate the secret cache immediately (e.g., if rotation occurs or an auth error is detected).
 */
export function invalidateSecretCache(): void {
  cachedGeminiKey = null;
}
