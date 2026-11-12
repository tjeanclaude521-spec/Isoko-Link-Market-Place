import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_ORIGIN = "https://isoko-link-agricultu-llbz.bolt.host";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/browse", changefreq: "daily", priority: "0.9" },
  { path: "/featured", changefreq: "daily", priority: "0.8" },
  { path: "/sell", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/assistant", changefreq: "monthly", priority: "0.5" },
];

async function fetchActiveProducts(supabaseUrl: string, supabaseKey: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("products")
    .select("id, name, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching products for sitemap:", error.message);
    return [];
  }
  return data || [];
}

function buildSitemap(staticPages: typeof STATIC_PAGES, products: { id: string; created_at: string }[]) {
  const urls: string[] = [];

  for (const page of staticPages) {
    urls.push(
      `  <url>
    <loc>${SITE_ORIGIN}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    );
  }

  for (const product of products) {
    const lastmod = new Date(product.created_at).toISOString().split("T")[0];
    urls.push(
      `  <url>
    <loc>${SITE_ORIGIN}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    const xml = buildSitemap(STATIC_PAGES, []);
    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const products = await fetchActiveProducts(supabaseUrl!, supabaseKey!);
  const xml = buildSitemap(STATIC_PAGES, products);

  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
