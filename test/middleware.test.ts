import { describe, it, expect, vi } from 'vitest';
import { serafortMiddleware } from '../src/server/middleware.js';
import { SerafortClient } from '@serafort/core';
import { NextRequest } from 'next/server';

describe('Next.js serafortMiddleware', () => {
  const mockClient = {
    b2b: {
      validateToken: vi.fn(),
      hasPermission: vi.fn(),
    },
  } as unknown as SerafortClient;

  it('should allow public routes without authentication', async () => {
    const middleware = serafortMiddleware({
      client: mockClient,
      publicRoutes: ['/login', '/public/*'],
    });

    const req = new NextRequest('https://app.acme.com/public/about');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('should redirect unauthenticated users to loginUrl on protected route', async () => {
    const middleware = serafortMiddleware({
      client: mockClient,
      loginUrl: '/auth/login',
    });

    const req = new NextRequest('https://app.acme.com/dashboard');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/auth/login');
    expect(location).toContain('redirect=%2Fdashboard');
  });

  it('should return 401 JSON for unauthenticated /api/* requests', async () => {
    const middleware = serafortMiddleware({
      client: mockClient,
    });

    const req = new NextRequest('https://app.acme.com/api/users');
    const res = await middleware(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('should validate token and forward user identity headers', async () => {
    const mockUser = {
      userId: 'usr_next_123',
      tenantId: 'ten_next_org',
      roles: ['admin'],
      permissions: ['write:all'],
      claims: {},
    };

    vi.mocked(mockClient.b2b.validateToken).mockResolvedValueOnce(mockUser);

    const middleware = serafortMiddleware({
      client: mockClient,
    });

    const req = new NextRequest('https://app.acme.com/dashboard', {
      headers: {
        authorization: 'Bearer valid_next_token',
      },
    });

    const res = await middleware(req);
    expect(res.status).toBe(200);
  });
});
