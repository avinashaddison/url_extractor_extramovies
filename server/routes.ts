import type { Express } from "express";
import { createServer, type Server } from "http";
import type { MovieListResult, LinkFinderResult, MoviePost, MovieDetails, DownloadLink, WordPressPostRequest, WordPressPostResult } from "@shared/schema";
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

function decodeHtml(text: string): string {
  return text
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractMovieDetails(html: string, sourceUrl: string): MovieDetails {
  const details: MovieDetails = {
    title: '',
    screenshots: [],
    downloadLinks: [],
    sourceUrl,
  };

  // Extract title from h1 or title tag
  const titleMatch = html.match(/<h1[^>]*class="post-title"[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    details.title = decodeHtml(titleMatch[1]);
  } else {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      details.title = decodeHtml(h1Match[1]);
    }
  }

  // Extract poster image (usually from TMDB or first aligncenter image)
  const posterMatch = html.match(/<img[^>]+class="[^"]*aligncenter[^"]*"[^>]+src="([^"]+)"[^>]*>/i);
  if (posterMatch) {
    details.posterImage = posterMatch[1];
  }

  // Extract screenshots (images from catimages or similar)
  const screenshotRegex = /<img[^>]+src="(https:\/\/catimages\.org[^"]+)"[^>]*>/gi;
  let ssMatch;
  while ((ssMatch = screenshotRegex.exec(html)) !== null) {
    if (!details.screenshots.includes(ssMatch[1])) {
      details.screenshots.push(ssMatch[1]);
    }
  }

  // Extract IMDB rating
  const imdbMatch = html.match(/iMDB Rating:\s*<\/strong>\s*([^<]+)/i);
  if (imdbMatch) {
    details.imdbRating = decodeHtml(imdbMatch[1]).trim();
  }

  // Extract Genre
  const genreMatch = html.match(/Genre:\s*([^<]+)</i);
  if (genreMatch) {
    details.genre = decodeHtml(genreMatch[1]).trim();
  }

  // Extract Language
  const langMatch = html.match(/Language:\s*<\/strong>\s*<strong>([^<]+)</i);
  if (langMatch) {
    details.language = decodeHtml(langMatch[1]).replace(/[\[\]]/g, '').trim();
  }

  // Extract Quality
  const qualityMatch = html.match(/Quality:\s*<\/strong>\s*<strong>([^<]+)<\/strong>\s*<strong>([^<]+)</i);
  if (qualityMatch) {
    details.quality = decodeHtml(qualityMatch[1] + ' ' + qualityMatch[2]).trim();
  }

  // Extract Director
  const directorMatch = html.match(/Director:\s*<\/strong>\s*([^<]+)/i);
  if (directorMatch) {
    details.director = decodeHtml(directorMatch[1]).trim();
  }

  // Extract download links with labels from h5 headings
  // Find all h5 tags that contain download quality info
  const h5Regex = /<h5[^>]*>([^<]*(?:480p|720p|1080p|2160p|4k)[^<]*)<\/h5>/gi;
  const downloadLabels: string[] = [];
  let h5Match;
  while ((h5Match = h5Regex.exec(html)) !== null) {
    const label = decodeHtml(h5Match[1]).trim();
    if (label && !label.includes('DOWNLOAD LINKS')) {
      downloadLabels.push(label);
    }
  }

  // Extract mdrive links - using href attribute pattern for reliability
  const hrefRegex = /href="(https?:\/\/mdrive\.today[^"]+)"/gi;
  const allUrls: string[] = [];
  let urlMatch;
  while ((urlMatch = hrefRegex.exec(html)) !== null) {
    allUrls.push(urlMatch[1]);
  }
  const uniqueLinks = Array.from(new Set(allUrls));

  // Match labels with links (they typically appear in order)
  for (let i = 0; i < uniqueLinks.length; i++) {
    const link: DownloadLink = {
      url: uniqueLinks[i],
      label: downloadLabels[i] || `Download Link ${i + 1}`,
    };
    details.downloadLinks.push(link);
  }

  return details;
}

function generateWordPressContent(details: MovieDetails): string {
  let content = '';

  // Poster image
  if (details.posterImage) {
    content += `<p style="text-align: center;"><img src="${details.posterImage}" alt="${details.title}" /></p>\n\n`;
  }

  // Movie info section
  content += `<h3>Movie Info</h3>\n`;
  content += `<ul>\n`;
  if (details.imdbRating) {
    content += `<li><strong>IMDB Rating:</strong> ${details.imdbRating}</li>\n`;
  }
  if (details.genre) {
    content += `<li><strong>Genre:</strong> ${details.genre}</li>\n`;
  }
  if (details.language) {
    content += `<li><strong>Language:</strong> ${details.language}</li>\n`;
  }
  if (details.quality) {
    content += `<li><strong>Quality:</strong> ${details.quality}</li>\n`;
  }
  if (details.director) {
    content += `<li><strong>Director:</strong> ${details.director}</li>\n`;
  }
  content += `</ul>\n\n`;

  // Screenshots
  if (details.screenshots.length > 0) {
    content += `<h3>Screenshots</h3>\n`;
    content += `<p style="text-align: center;">\n`;
    for (const ss of details.screenshots.slice(0, 6)) {
      content += `<img src="${ss}" style="max-width: 300px; margin: 5px;" />\n`;
    }
    content += `</p>\n\n`;
  }

  // Download links
  if (details.downloadLinks.length > 0) {
    content += `<h3>Download Links</h3>\n`;
    content += `<table style="width: 100%; border-collapse: collapse;">\n`;
    content += `<tbody>\n`;
    for (const link of details.downloadLinks) {
      content += `<tr>\n`;
      content += `<td style="padding: 10px; border: 1px solid #ddd;"><strong>${link.label}</strong></td>\n`;
      content += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;"><a href="${link.url}" target="_blank" rel="nofollow">Download</a></td>\n`;
      content += `</tr>\n`;
    }
    content += `</tbody>\n`;
    content += `</table>\n\n`;
  }

  // Source attribution
  content += `<p><em>Source: <a href="${details.sourceUrl}" rel="nofollow">${details.sourceUrl}</a></em></p>`;

  return content;
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
      
      // Extract full movie details
      const movieDetails = extractMovieDetails(html, url);
      
      // Also get simple list of links for backward compatibility
      const matchedLinks = movieDetails.downloadLinks.map(dl => dl.url);

      const result: LinkFinderResult = {
        url,
        matchedLinks,
        totalFound: matchedLinks.length,
        processingTime: Date.now() - startTime,
        movieDetails,
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
      const { movieDetails, settings } = req.body as WordPressPostRequest;

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

      // Generate WordPress content from movie details
      const content = generateWordPressContent(movieDetails);
      
      console.log('WordPress content generated:', content.substring(0, 500));

      // Create the post - wrap content for Gutenberg compatibility
      const postData: any = {
        title: movieDetails.title,
        content: `<!-- wp:html -->\n${content}\n<!-- /wp:html -->`,
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
