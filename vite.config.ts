import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Server-side search middleware. Performs the upstream HTTP request from the
// Vite dev server (Node) so the browser never sees CORS / bot challenges.
function searchMiddleware(): Plugin {
  return {
    name: 'search-middleware',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const q = url.searchParams.get('q') || ''
          if (!q) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'missing q' }))
            return
          }

          const results = await fetchBraveResults(q)
          console.log(`[search] q="${q.slice(0, 60)}…" results=${results.length}`)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ results }))
        } catch (e) {
          console.error('[search] error', e)
          res.statusCode = 500
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }))
        }
      })
    },
  }
}

interface SearchHit {
  title: string
  url: string
  snippet: string
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchBraveResults(q: string): Promise<SearchHit[]> {
  const url = `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
    },
  })
  if (!res.ok) {
    console.log(`[brave] HTTP ${res.status}`)
    return []
  }
  const html = await res.text()
  return parseBrave(html)
}

function parseBrave(html: string): SearchHit[] {
  const hits: SearchHit[] = []

  // Find all positions of result blocks
  const blockMarker = /<div class="snippet[^"]*svelte-[a-z0-9]+" data-pos="\d+" data-type="web"/g
  const positions: number[] = []
  let m: RegExpExecArray | null
  while ((m = blockMarker.exec(html)) !== null) {
    positions.push(m.index)
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]
    const end = i + 1 < positions.length ? positions[i + 1] : Math.min(start + 4000, html.length)
    const block = html.slice(start, end)

    // Extract first href (the result link)
    const hrefMatch = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*l1[^"]*"/.exec(block)
      || /<a[^>]+href="(https?:\/\/[^"]+)"/.exec(block)
    if (!hrefMatch) continue
    const url = decodeHtml(hrefMatch[1])

    // Extract title — prefer the title attribute on the title div
    const titleAttrMatch = /<div class="title search-snippet-title[^"]*"[^>]*title="([^"]+)"/.exec(block)
    let title = ''
    if (titleAttrMatch) {
      title = decodeHtml(titleAttrMatch[1])
    } else {
      const titleTextMatch = /<div class="title search-snippet-title[^"]*"[^>]*>([^<]+)<\/div>/.exec(block)
      if (titleTextMatch) title = decodeHtml(titleTextMatch[1]).trim()
    }
    if (!title) continue

    // Extract snippet
    const snippetMatch = /<div class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)
    const snippet = snippetMatch ? stripTags(snippetMatch[1]).trim() : ''

    hits.push({ title, url, snippet })
  }

  return hits
}

function stripTags(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export default defineConfig({
  plugins: [react(), searchMiddleware()],
  server: { port: 5174 },
})
