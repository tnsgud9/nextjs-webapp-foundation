import { type KeyObject, createECDH, createHash, createPrivateKey, createPublicKey, createSign } from "node:crypto";
import { type Server, createServer } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A local server standing in for Supabase Auth, plus session cookies. Shared by Vitest and Playwright.
 *
 * - It serves a JWKS (public keys), so Supabase `getClaims()` really verifies token signatures.
 * - It answers the refresh-token grant, so refreshing an expired session (proxy) can be tested.
 * - An `unresponsive` session's refresh never gets an answer, so time limits can be tested.
 * - The signing key comes from a fixed seed: server and tests share it across processes, and no key is stored in the repo.
 * - Playwright starts the server before the app through test-utils/playwright/supabase-auth-server.mjs.
 *
 * Node runs this file by stripping types, so it imports nothing but node: built-ins.
 */
export interface SessionClaims {
  sub: string;
  email?: string;
  is_anonymous?: boolean;
  /** The access token's role. `authenticated` by default, like every user session. */
  role?: string;
  /** Seconds until expiry. Negative means the token has already expired. */
  expiresIn?: number;
}

export interface SessionOptions {
  /** Sign with a key other than the server's. */
  forged?: boolean;
  /** When false, the refresh token is rejected (revoked session). Refreshable by default. */
  refreshable?: boolean;
  /** When true, the server never answers the refresh (a hanging Auth server). */
  unresponsive?: boolean;
}

/** Fake server host. An IPv4 address instead of localhost, so server and client use the same address. */
export const LOOPBACK = "127.0.0.1";
const KID = "test-key";
const SERVER_KEY = keyFromSeed("fake-supabase-auth");
const FORGED_KEY = keyFromSeed("forged");
const REVOKED = "revoked";
const UNRESPONSIVE = "unresponsive";

/** Environment with `NEXT_PUBLIC_SUPABASE_*` pointing at the fake server. */
export function fakeSupabaseEnv(url: string): Record<string, string> {
  return { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
}

/** A session cookie like the ones the fake server at `url` issues. */
export function sessionCookie(url: string, claims: SessionClaims, options: SessionOptions = {}) {
  const refreshToken = options.unresponsive
    ? UNRESPONSIVE
    : options.refreshable === false
      ? REVOKED
      : base64url(JSON.stringify(identity(claims)));
  const session = issueSession(url, claims, refreshToken, options.forged ? FORGED_KEY : SERVER_KEY);
  // The default @supabase/ssr storage key (sb-<first host label>-auth-token) and base64 cookie format.
  const name = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  return { name, value: `base64-${base64url(JSON.stringify(session))}` };
}

/** Starts the fake Auth server. A `port` of 0 picks a free port. */
export async function startFakeSupabaseAuth(port = 0): Promise<{ url: string; close: () => Promise<void> }> {
  const jwk = { ...createPublicKey(SERVER_KEY).export({ format: "jwk" }), kid: KID, alg: "ES256", use: "sig" };
  let url = "";
  const server: Server = createServer((request, response) => {
    const reply = (status: number, body: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    const path = request.url ?? "";
    if (path.startsWith("/auth/v1/.well-known/jwks.json")) return reply(200, { keys: [jwk] });
    if (request.method === "POST" && path.startsWith("/auth/v1/token?grant_type=refresh_token")) {
      let body = "";
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => {
        if (body.includes(UNRESPONSIVE)) return;
        const claims = parseRefreshToken(body);
        if (!claims) return reply(400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
        reply(200, issueSession(url, claims, JSON.parse(body).refresh_token, SERVER_KEY));
      });
      return;
    }
    reply(401, { code: 401, msg: "not supported by the fake Supabase Auth" });
  });
  // localhost may resolve to ::1 or 127.0.0.1 first depending on the environment (Linux containers), so pin IPv4.
  await new Promise<void>((resolve) => server.listen(port, LOOPBACK, resolve));
  url = `http://${LOOPBACK}:${(server.address() as AddressInfo).port}`;
  const close = () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      // Unanswered requests would otherwise keep the server open.
      server.closeAllConnections();
    });
  return { url, close };
}

function issueSession(url: string, claims: SessionClaims, refreshToken: string, key: KeyObject) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = claims.expiresIn ?? 3600;
  const { sub, email, is_anonymous } = identity(claims);
  const accessToken = signJwt(key, {
    sub,
    email,
    is_anonymous,
    aud: "authenticated",
    role: claims.role ?? "authenticated",
    iss: `${url}/auth/v1`,
    iat: now - 60,
    exp: now + expiresIn,
    session_id: "test-session",
  });
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: now + expiresIn,
    user: { id: sub, aud: "authenticated", role: "authenticated", email, is_anonymous, app_metadata: {}, user_metadata: {} },
  };
}

function identity({ sub, email, is_anonymous = false }: SessionClaims) {
  return { sub, email, is_anonymous };
}

function parseRefreshToken(body: string): SessionClaims | undefined {
  try {
    const token: unknown = JSON.parse(body).refresh_token;
    if (typeof token !== "string" || token === REVOKED) return undefined;
    return identity(JSON.parse(Buffer.from(token, "base64url").toString()));
  } catch {
    return undefined;
  }
}

/** The same seed always yields the same P-256 key. */
function keyFromSeed(seed: string): KeyObject {
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(createHash("sha256").update(seed).digest());
  const point = ecdh.getPublicKey();
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: point.subarray(1, 33).toString("base64url"),
    y: point.subarray(33).toString("base64url"),
    d: ecdh.getPrivateKey().toString("base64url"),
  };
  return createPrivateKey({ key: jwk, format: "jwk" });
}

function signJwt(key: KeyObject, payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: KID }));
  const body = base64url(JSON.stringify(payload));
  const signature = createSign("SHA256").update(`${header}.${body}`).sign({ key, dsaEncoding: "ieee-p1363" });
  return `${header}.${body}.${signature.toString("base64url")}`;
}

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}
