import { NextRequest, NextResponse } from "next/server";

// Define the root domain (you may want to set this via environment variable)
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "payany.link";

// Reserved subdomains that should not be treated as ENS names
const RESERVED = new Set(["www", "app", "api", "admin", "dashboard", "support"]);

export default function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
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
    if (!hostWithoutPort) {
      console.log("❌ Invalid host after port removal");
      return NextResponse.next();
    }

    console.log("🔍 Host without port:", hostWithoutPort);

    // Check if this is a subdomain of our root domain
    if (hostWithoutPort.endsWith(ROOT_DOMAIN)) {
      // Parse host and root domain into parts
      const hostParts = hostWithoutPort.split(".");
      const rootParts = ROOT_DOMAIN.split(".");

      console.log("🔍 Host parts:", hostParts);
      console.log("🔍 Root parts:", rootParts);

      // Extract subdomain parts (everything before the root domain)
      if (hostParts.length > rootParts.length) {
        const subdomainParts = hostParts.slice(0, hostParts.length - rootParts.length);
        const firstSubdomain = subdomainParts[0];

        console.log("🔍 Subdomain parts:", subdomainParts);
        console.log("🔍 First subdomain:", firstSubdomain);

        // Only check the first subdomain part against reserved list
        if (firstSubdomain && !RESERVED.has(firstSubdomain)) {
          const fullSubdomain = subdomainParts.join(".");
          console.log("✅ Valid ENS subdomain:", fullSubdomain);

          // Check if the path is /profile
          if (pathname === "/profile") {
            console.log("📝 Profile route detected");
            const url = request.nextUrl.clone();
            url.pathname = `/sub/${fullSubdomain}/profile`;
            console.log("🔄 Rewriting to:", url.pathname);
            return NextResponse.rewrite(url);
          }

          // Rewrite to the dynamic route
          const url = request.nextUrl.clone();
          url.pathname = `/sub/${fullSubdomain}${pathname}`;

          console.log("🔄 Rewriting to:", url.pathname);
          return NextResponse.rewrite(url);
        } else if (firstSubdomain && RESERVED.has(firstSubdomain)) {
          console.log("⏭️ Skipping - reserved first subdomain:", firstSubdomain);
        }
      } else {
        console.log("🏠 Main domain - no subdomain");
      }
    } else {
      console.log("🔍 Not our root domain, skipping");
    }

    return NextResponse.next();
  } catch (error) {
    console.error("❌ Middleware error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
