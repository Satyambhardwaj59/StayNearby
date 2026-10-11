import { z } from 'zod';

/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* values are read here — the
 * frontend must never be able to see a backend secret.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1).default('http://localhost:5000/api/v1'),
  NEXT_PUBLIC_SITE_URL: z.string().min(1).default('http://localhost:3000'),
  NEXT_PUBLIC_SOCKET_URL: z.string().min(1).default('http://localhost:5000'),
  NEXT_PUBLIC_MAP_TILE_URL: z
    .string()
    .min(1)
    .default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z.string().default('© OpenStreetMap contributors'),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  NEXT_PUBLIC_MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL,
  NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid frontend environment configuration:\n${issues.join('\n')}`);
}

export const publicEnv = parsed.data;

export const apiBaseUrl = publicEnv.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
export const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
export const socketUrl = publicEnv.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, '');
