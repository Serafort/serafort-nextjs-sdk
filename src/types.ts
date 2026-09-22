import { UserContext, SerafortClient } from '@serafort/core';

export interface SerafortNextOptions {
  /** Serafort IAM backend endpoint */
  endpoint?: string;
  /** Name of the session cookie. Default: '__serafort_token' */
  cookieName?: string;
  /** URL to redirect unauthenticated users to (e.g. '/login'). Default: '/login' */
  loginUrl?: string;
  /** Route patterns to exempt from middleware authentication (e.g. ['/login', '/api/public/*']) */
  publicRoutes?: string[];
  /** Pre-configured SerafortClient instance */
  client?: SerafortClient;
}

export interface AuthSession {
  user: UserContext | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface ProtectOptions {
  /** Required granular permissions (supports wildcards like 'org:*') */
  permissions?: string[];
  /** Required roles */
  roles?: string[];
  /** Required tenant ID */
  tenantId?: string;
  /** Optional custom redirect URL instead of throwing */
  redirectTo?: string;
}
