import { SerafortClient } from '@serafort/core';
import { NextRequest, NextResponse } from 'next/server';
import { SerafortNextOptions } from '../types.js';

/**
 * Creates a Next.js Edge / Node middleware function to automatically guard routes,
 * forward user identity headers, and redirect unauthenticated requests.
 */
export function serafortMiddleware(options: SerafortNextOptions = {}) {
  const cookieName = options.cookieName || '__serafort_token';
  const loginUrl = options.loginUrl || '/login';
  const publicRoutes = options.publicRoutes || ['/login', '/register', '/api/public'];

  const client =
    options.client ||
    new SerafortClient({
      endpoint: options.endpoint || process.env.NEXT_PUBLIC_SERAFORT_ENDPOINT || process.env.SERAFORT_ENDPOINT || 'https://api.serafort.com',
    });

  return async function middleware(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl;

    // Skip internal Next.js assets
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.includes('.') // file extension like favicon.ico, images
    ) {
      return NextResponse.next();
    }

    // Check if current route is exempt
    const isPublic = publicRoutes.some((route) => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route;
    });

    if (isPublic) {
      return NextResponse.next();
    }

    // Extract token from Authorization header or session cookie
    let token: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = req.cookies.get(cookieName)?.value || null;
    }

    if (!token) {
      return handleUnauthenticated(req, loginUrl);
    }

    try {
      const user = await client.b2b.validateToken(token);

      // Clone request headers and inject identity headers for downstream handlers
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-serafort-user-id', user.userId);
      requestHeaders.set('x-serafort-tenant-id', user.tenantId);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      return handleUnauthenticated(req, loginUrl);
    }
  };
}

function handleUnauthenticated(req: NextRequest, loginUrl: string): NextResponse {
  // If it's an API route, return 401 JSON instead of redirecting
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  const redirectUrl = new URL(loginUrl, req.url);
  redirectUrl.searchParams.set('redirect', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(redirectUrl);
}
