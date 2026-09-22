import { SerafortClient, UserContext, AuthenticationError } from '@serafort/core';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthSession, ProtectOptions, SerafortNextOptions } from '../types.js';

let defaultClient: SerafortClient | null = null;

function getDefaultClient(): SerafortClient {
  if (!defaultClient) {
    defaultClient = new SerafortClient({
      endpoint: process.env.NEXT_PUBLIC_SERAFORT_ENDPOINT || process.env.SERAFORT_ENDPOINT || 'https://api.serafort.com',
    });
  }
  return defaultClient;
}

/**
 * Resolves the authenticated user session in Next.js Server Components, Server Actions,
 * and Route Handlers by inspecting headers and cookies.
 */
export async function auth(options: SerafortNextOptions = {}): Promise<AuthSession> {
  const client = options.client || getDefaultClient();
  const cookieName = options.cookieName || '__serafort_token';

  let token: string | null = null;

  // 1. Try Authorization header
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  } catch {
    // headers() might not be available in non-request contexts
  }

  // 2. Try cookie
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(cookieName)?.value || null;
    } catch {
      // cookies() might not be available
    }
  }

  if (!token) {
    return { user: null, token: null, isAuthenticated: false };
  }

  try {
    const user = await client.b2b.validateToken(token);
    return {
      user,
      token,
      isAuthenticated: true,
    };
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
}

/**
 * Returns the currently authenticated UserContext or null.
 */
export async function currentUser(options: SerafortNextOptions = {}): Promise<UserContext | null> {
  const session = await auth(options);
  return session.user;
}

/**
 * Protects a Server Component or Server Action.
 * Verifies that the user is authenticated and satisfies all specified RBAC permissions and roles.
 * If unauthorized, either redirects or throws an error.
 */
export async function protect(
  protectOptions: ProtectOptions = {},
  sdkOptions: SerafortNextOptions = {}
): Promise<UserContext> {
  const client = sdkOptions.client || getDefaultClient();
  const session = await auth(sdkOptions);

  if (!session.isAuthenticated || !session.user) {
    const loginUrl = protectOptions.redirectTo || sdkOptions.loginUrl || '/login';
    redirect(loginUrl);
    throw new AuthenticationError('Authentication required');
  }

  const user = session.user;

  // Check tenant requirement
  if (protectOptions.tenantId && user.tenantId !== protectOptions.tenantId) {
    throw new AuthenticationError('Tenant access denied');
  }

  // Check roles requirement
  if (protectOptions.roles && protectOptions.roles.length > 0) {
    const hasRole = protectOptions.roles.some((r) => user.roles.includes(r));
    if (!hasRole) {
      throw new AuthenticationError(`User lacks required role: ${protectOptions.roles.join(', ')}`);
    }
  }

  // Check permissions requirement (with wildcards)
  if (protectOptions.permissions && protectOptions.permissions.length > 0) {
    for (const perm of protectOptions.permissions) {
      if (!client.b2b.hasPermission(user, perm)) {
        throw new AuthenticationError(`User lacks required permission: ${perm}`);
      }
    }
  }

  return user;
}
