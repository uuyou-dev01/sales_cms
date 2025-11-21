export function ok(data: unknown, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(code: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json(
    extra ? { error: code, ...extra } : { error: code },
    { status }
  );
}

export function badRequest(code = 'BAD_REQUEST', extra?: Record<string, unknown>) {
  return fail(code, 400, extra);
}

export function unauthorized(code = 'UNAUTHORIZED', extra?: Record<string, unknown>) {
  return fail(code, 401, extra);
}

export function forbidden(code = 'FORBIDDEN', extra?: Record<string, unknown>) {
  return fail(code, 403, extra);
}

export function notFound(code = 'NOT_FOUND', extra?: Record<string, unknown>) {
  return fail(code, 404, extra);
}

export function serverError(code = 'INTERNAL_SERVER_ERROR', extra?: Record<string, unknown>) {
  return fail(code, 500, extra);
}


