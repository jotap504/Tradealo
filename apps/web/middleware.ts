import { NextRequest, NextResponse } from 'next/server';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'trocalia.ar';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  if (
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}` ||
    host.startsWith('localhost') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, '');
    const url = request.nextUrl.clone();
    url.pathname = `/shop/${slug}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
