import type { Express } from "express";
import { createServer, type Server } from "http";
import type { MovieListResult, LinkFinderResult, MoviePost, WordPressPostRequest, WordPressPostResult } from "@shared/schema";
import { wordpressSettingsSchema } from "@shared/schema";

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

  // WordPress posting endpoint
  app.post("/api/wordpress/post", async (req, res) => {
    try {
      const { title, content, thumbnail, settings } = req.body as WordPressPostRequest;

      // Validate settings
      const settingsResult = wordpressSettingsSchema.safeParse(settings);
      if (!settingsResult.success) {
        const result: WordPressPostResult = {
          success: false,
          error: settingsResult.error.errors[0]?.message || "Invalid WordPress settings",
        };
        return res.status(400).json(result);
      }

      const { siteUrl, username, appPassword } = settingsResult.data;
      
      // Clean up site URL
      const baseUrl = siteUrl.replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

      // Create auth header (Basic Auth with application password)
      const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

      // Create the post
      const postData: any = {
        title: title,
        content: content,
        status: 'draft', // Create as draft so user can review
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `WordPress API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {}
        
        const result: WordPressPostResult = {
          success: false,
          error: errorMessage,
        };
        return res.json(result);
      }

      const postResult = await response.json();
      
      const result: WordPressPostResult = {
        success: true,
        postId: postResult.id,
        postUrl: postResult.link,
      };

      res.json(result);
    } catch (error) {
      const result: WordPressPostResult = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post to WordPress",
      };
      res.json(result);
    }
  });

  // Test WordPress connection
  app.post("/api/wordpress/test", async (req, res) => {
    try {
      const { siteUrl, username, appPassword } = req.body;

      const settingsResult = wordpressSettingsSchema.safeParse({ siteUrl, username, appPassword });
      if (!settingsResult.success) {
        return res.json({ 
          success: false, 
          error: settingsResult.error.errors[0]?.message 
        });
      }

      const baseUrl = siteUrl.replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wp-json/wp/v2/users/me`;

      const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        return res.json({ 
          success: false, 
          error: `Connection failed: ${response.status} - Check your credentials` 
        });
      }

      const user = await response.json();
      res.json({ 
        success: true, 
        message: `Connected as ${user.name || user.slug}` 
      });
    } catch (error) {
      res.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      });
    }
  });

  return httpServer;
}
