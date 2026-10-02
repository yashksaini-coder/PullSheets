import { NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
  toResponse() {
    return NextResponse.json({ error: this.message, code: this.code, ...this.details }, { status: this.status });
  }
}
export class BadRequest extends AppError {
  constructor(m: string, d?: Record<string, unknown>) {
    super(400, 'bad_request', m, d);
  }
}
export class Unauthorized extends AppError {
  constructor(m = 'Sign in required') {
    super(401, 'unauthorized', m);
  }
}
export class Forbidden extends AppError {
  constructor(code: string, m: string) {
    super(403, code, m);
  }
}
export class NotFound extends AppError {
  constructor(code: string, m: string) {
    super(404, code, m);
  }
}
export class RateLimited extends AppError {
  constructor(resetAt: string) {
    super(429, 'rate_limited', 'GitHub rate limit reached', { resetAt });
  }
}
export class FeatureUnconfigured extends AppError {
  constructor(missing: string[]) {
    super(503, 'feature_unconfigured', `Feature not configured: set ${missing.join(', ')}`, { missing });
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;
export function withRoute<C>(h: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await h(req, ctx);
    } catch (e) {
      if (e instanceof AppError) return e.toResponse();
      console.error('[route]', e);
      return NextResponse.json({ error: 'Internal error', code: 'internal' }, { status: 500 });
    }
  };
}
