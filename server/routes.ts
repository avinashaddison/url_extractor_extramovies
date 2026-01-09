import type { Express } from "express";
import { createServer, type Server } from "http";
import type { MovieListResult, LinkFinderResult, MoviePost } from "@shared/schema";

const BASE_URL = "https://moviesdrive.forum";
const MDRIVE_PATTERN = "mdrive.today";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

function extractMoviePosts(html: string): MoviePost[] {
  const posts: MoviePost[] = [];
  const seen = new Set<string>();

  // Pattern: <a href="URL"><div class="poster-card">...<img src="THUMB">...<p class="poster-title">TITLE</p>...</div></a>
  const posterPattern = /<a\s+href="(https:\/\/moviesdrive\.forum\/[^"]+)"[^>]*>\s*<div\s+class="poster-card"[^>]*>[\s\S]*?<img\s+src="([^"]*)"[^>]*>[\s\S]*?<p\s+class="poster-title">([^<]+)<\/p>[\s\S]*?<\/div>\s*<\/a>/gi;
  
  let match;
  while ((match = posterPattern.exec(html)) !== null) {
    const url = match[1];
    const thumbnail = match[2];
    const title = match[3]
      .replace(/&#038;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&[^;]+;/g, ' ')
      .trim();
    
    if (!seen.has(url) && title.length > 5) {
      seen.add(url);
      posts.push({ title, url, thumbnail });
    }
  }

  // Fallback: simpler pattern if above doesn't match
  if (posts.length === 0) {
    const simplePattern = /href="(https:\/\/moviesdrive\.forum\/[^"]*\d{4}[^"]*)"[^>]*>[\s\S]*?<p\s+class="poster-title">([^<]+)<\/p>/gi;
    while ((match = simplePattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2]
        .replace(/&#038;/g, '&')
        .replace(/&amp;/g, '&')
        .replace(/&[^;]+;/g, ' ')
        .trim();
      
      if (!seen.has(url) && title.length > 5) {
        seen.add(url);
        posts.push({ title, url });
      }
    }
  }

  return posts.slice(0, 30);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/movies", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const url = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;
      
      const response = await fetch(url, { headers, redirect: 'follow' });

      if (!response.ok) {
        const result: MovieListResult = {
          posts: [],
          totalFound: 0,
          error: `Failed to fetch: ${response.status} ${response.statusText}`,
        };
        return res.json(result);
      }

      const html = await response.text();
      const posts = extractMoviePosts(html);

      const result: MovieListResult = {
        posts,
        totalFound: posts.length,
      };

      res.json(result);
    } catch (error) {
      const result: MovieListResult = {
        posts: [],
        totalFound: 0,
        error: error instanceof Error ? error.message : "An error occurred",
      };
      res.json(result);
    }
  });

  app.post("/api/extract-links", async (req, res) => {
    const startTime = Date.now();
    const { url } = req.body;

    if (!url) {
      const result: LinkFinderResult = {
        url: "",
        matchedLinks: [],
        totalFound: 0,
        processingTime: Date.now() - startTime,
        error: "URL is required",
      };
      return res.status(400).json(result);
    }

    try {
      const response = await fetch(url, { headers, redirect: 'follow' });

      if (!response.ok) {
        const result: LinkFinderResult = {
          url,
          matchedLinks: [],
          totalFound: 0,
          processingTime: Date.now() - startTime,
          error: `Failed to fetch: ${response.status}`,
        };
        return res.json(result);
      }

      const html = await response.text();
      
      // Find all URLs containing mdrive.today
      const urlRegex = /https?:\/\/[^\s"'<>()\\]+/gi;
      const allUrls = html.match(urlRegex) || [];
      
      const matchedLinks = [...new Set(
        allUrls
          .filter(link => link.toLowerCase().includes(MDRIVE_PATTERN))
          .map(link => link.replace(/[\\'"]+$/, ''))
      )];

      const result: LinkFinderResult = {
        url,
        matchedLinks,
        totalFound: matchedLinks.length,
        processingTime: Date.now() - startTime,
      };

      res.json(result);
    } catch (error) {
      const result: LinkFinderResult = {
        url,
        matchedLinks: [],
        totalFound: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "An error occurred",
      };
      res.json(result);
    }
  });

  return httpServer;
}
