import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Get host from headers
    const host = request.headers.get("host");

    console.log("🔍 Host from headers:", host);
    console.log("🔍 Pathname:", pathname);

    // Skip middleware for API routes, static files, and Next.js internals
    if (
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/static/") ||
      (pathname.includes(".") && !pathname.endsWith("/"))
    ) {
      console.log("⏭️ Skipping - static/api route");
      return NextResponse.next();
    }

    if (!host) {
      console.log("❌ No host found");
      return NextResponse.next();
    }

    // Remove port from host if present
    const hostWithoutPort = host.split(":")[0];
    console.log("🔍 Host without port:", hostWithoutPort);

    // Split host into parts
    const hostParts = hostWithoutPort.split(".");
    console.log("🔍 Host parts:", hostParts);

    // We need at least 3 parts to have a subdomain
    // e.g., vitalik.eth.mydomain.com = ['vitalik', 'eth', 'mydomain', 'com']
    if (hostParts.length >= 3) {
      // Find your main domain (mydomain.com, payany.com, etc.)
      // Assuming your main domain is the last 2 parts
      const mainDomainParts = hostParts.slice(-2); // ['mydomain', 'com']
      const subdomainParts = hostParts.slice(0, -2); // ['vitalik', 'eth'] or ['jesse', 'base', 'eth']

      console.log("🔍 Main domain parts:", mainDomainParts);
      console.log("🔍 Subdomain parts:", subdomainParts);

      // Skip if it's www
      if (subdomainParts.length === 1 && subdomainParts[0] === "www") {
        console.log("⏭️ Skipping - www subdomain");
        return NextResponse.next();
      }

      // If we have subdomain parts, construct the ENS name
      if (subdomainParts.length > 0) {
        const ensName = subdomainParts.join(".");
        console.log("✅ Extracted ENS name:", ensName);

        // Rewrite to the dynamic route
        const url = request.nextUrl.clone();
        url.pathname = `/sub/${ensName}${pathname}`;

        console.log("🔄 Rewriting to:", url.pathname);

        return NextResponse.rewrite(url);
      }
    }

    console.log("🏠 Main domain - no rewrite needed");
    return NextResponse.next();
  } catch (error) {
    console.error("❌ Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
