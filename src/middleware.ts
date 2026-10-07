import { NextResponse, type NextRequest } from "next/server";

// "/" и пути без языка ведут на русскую версию (или узбекскую, если браузер на uz).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (/^\/(ru|uz)(\/|$)/.test(pathname) || /^\/admin(\/|$)/.test(pathname)) return NextResponse.next();
  const prefersUz = (req.headers.get("accept-language") || "").toLowerCase().startsWith("uz");
  const url = req.nextUrl.clone();
  url.pathname = `/${prefersUz ? "uz" : "ru"}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"] };
