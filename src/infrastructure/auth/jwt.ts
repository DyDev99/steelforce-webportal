/**
 * Reads claims out of the access token issued by the OpenIddict token
 * endpoint (Authentication.md, "Claims in the access token").
 *
 * Deliberately does NOT verify the signature. That is not a shortcut taken
 * for convenience: a browser has no secret it could hold that would make a
 * client-side signature check mean anything (the "secret" would ship in the
 * bundle), and it is not where trust boundaries in this system live — every
 * resource server re-validates the token on every request. This decoder only
 * ever feeds the UI (name, permissions to gate a button), never an
 * authorization decision the server hasn't also made.
 */
export interface DecodedAccessToken {
  sub: string;
  email?: string;
  name?: string;
  /** One or more `role` claims. */
  role: string[];
  /** `isi:permission` — the effective permission set at issuance. */
  permissions: string[];
  /** `isi:sid` — the device/session row this token is tied to. */
  sid?: string;
  employeeCode?: string;
  exp: number;
  iat: number;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  // atob gives us a byte string; decode it as UTF-8 so non-ASCII names survive.
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function asStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

export function decodeAccessToken(token: string): DecodedAccessToken {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Malformed access token: expected a JWT with a payload segment.');
  }

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new Error('Malformed access token: payload was not valid JSON.');
  }

  const sub = claims.sub;
  const exp = claims.exp;
  const iat = claims.iat;
  if (typeof sub !== 'string' || typeof exp !== 'number' || typeof iat !== 'number') {
    throw new Error('Malformed access token: missing sub/exp/iat.');
  }

  return {
    sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    role: asStringArray(claims.role),
    permissions: asStringArray(claims['isi:permission']),
    sid: typeof claims['isi:sid'] === 'string' ? (claims['isi:sid'] as string) : undefined,
    employeeCode:
      typeof claims['isi:employee_code'] === 'string' ? (claims['isi:employee_code'] as string) : undefined,
    exp,
    iat,
  };
}
