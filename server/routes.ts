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

  // Extract Storyline/Plot - look for common patterns
  const storyPatterns = [
    /<strong>Story(?:line)?[:\s]*<\/strong>\s*([^<]+)/i,
    /<p[^>]*>(?:Story(?:line)?|Plot|Synopsis)[:\s]*([^<]{50,500})/i,
    /class="entry-content"[^>]*>[\s\S]*?<p>([^<]{100,500})<\/p>/i,
  ];
  for (const pattern of storyPatterns) {
    const storyMatch = html.match(pattern);
    if (storyMatch && storyMatch[1]) {
      details.storyline = decodeHtml(storyMatch[1]).trim();
      break;
    }
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

  // Store mdrive links with labels (hubcloud links will be resolved separately)
  for (let i = 0; i < uniqueLinks.length; i++) {
    const link: DownloadLink = {
      url: uniqueLinks[i],
      label: downloadLabels[i] || `Download Link ${i + 1}`,
    };
    details.downloadLinks.push(link);
  }

  return details;
}

// Fetch hubcloud.foo link from mdrive.today page
async function fetchHubcloudLink(mdriveUrl: string): Promise<string | null> {
  try {
    const response = await fetch(mdriveUrl, { headers, redirect: 'follow' });
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extract hubcloud.foo link
    const hubcloudMatch = html.match(/href="(https?:\/\/hubcloud\.foo[^"]+)"/i);
    if (hubcloudMatch) {
      return hubcloudMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching hubcloud from ${mdriveUrl}:`, error);
    return null;
  }
}

// Resolve all mdrive links to hubcloud links
async function resolveHubcloudLinks(downloadLinks: DownloadLink[]): Promise<DownloadLink[]> {
  const resolvedLinks: DownloadLink[] = [];
  
  // Process links in parallel for speed
  const promises = downloadLinks.map(async (link) => {
    const hubcloudUrl = await fetchHubcloudLink(link.url);
    return {
      url: hubcloudUrl || link.url, // fallback to mdrive if hubcloud not found
      label: link.label,
    };
  });
  
  const results = await Promise.all(promises);
  return results.filter(link => link.url.includes('hubcloud.foo'));
}

function generateWordPressContent(details: MovieDetails): string {
  // Extract short movie name from title (before year)
  const shortName = details.title.replace(/\s*\(\d{4}\).*$/, '').trim();
  const imdbRating = details.imdbRating || '7.0/10';
  const language = details.language || 'Hindi';
  const genre = details.genre || 'Drama';
  const quality = details.quality || 'WEB-DL 480p | 720p | 1080p';
  
  let content = '';

  // [How To Download] Section - Link
  content += `<h2><a href="https://extramovies.miami/how-to-download/">[How To Download]</a></h2>\n\n`;
  
  // Intro paragraph with bold formatting
  content += `<p>Download <strong>${details.title}</strong> [<strong>${language}</strong>] <strong>${quality}</strong> Dual Audio [x264/ESubs] | Full Movie, based on <strong>${genre}</strong> and Available In <strong>${language.split('(')[0].trim()}</strong> available</p>\n\n`;
  
  // Poster image (if available)
  if (details.posterImage) {
    content += `<p><img src="${details.posterImage}" alt="${shortName}" /></p>\n\n`;
  }
  
  // Download header - H2
  content += `<h2>Download ${shortName}</h2>\n\n`;
  
  // Platform intro with bold formatting
  content += `<p><a href="https://moviesdrive.cc/"><strong>MoviesDrive</strong></a> is the best online platform for downloading <strong>Bollywood</strong> &amp; <strong>Hollywood</strong> <strong>Movies</strong> and <strong>Indian Movies</strong> and <strong>Web Series</strong>. We also provide <strong>south</strong> movies like <strong>Hindi Dubbed</strong>, <strong>Tamil</strong>, <strong>Telugu</strong>, <strong>Malayalam</strong>, <strong>Punjabi</strong>, and other local Movies. We offer direct <strong>G-Drive</strong> download links for fast and secure downloading. Click the <strong>download</strong> button below and follow the steps to start the download.</p>\n\n`;
  
  // Movie Information Section - H2 with italic
  content += `<h2><em>Movie Information</em></h2>\n\n`;
  content += `<p>iMDB Rating: ${imdbRating}</p>\n`;
  content += `<p>Movie Name: ${details.title}</p>\n`;
  content += `<p>Genre: ${genre}</p>\n`;
  if (details.director) {
    content += `<p>Director: ${details.director}</p>\n`;
  }
  content += `<p>Language:[${language}] / ESubs</p>\n`;
  content += `<p>Quality: ${quality}</p>\n`;
  content += `<p>Format: MKV</p>\n\n`;
  
  // StoryLine Section - H2 with italic
  content += `<h2><em>StoryLine</em></h2>\n\n`;
  if (details.storyline) {
    content += `<p><a href="#">${details.title} ${details.storyline}</a></p>\n\n`;
  } else {
    content += `<p><a href="#">${details.title} - Watch and download this amazing movie in high quality HD format.</a></p>\n\n`;
  }
  
  // Screenshots Section - H2
  if (details.screenshots.length > 0) {
    content += `<h2>Screenshots: (Must See Before Downloading)</h2>\n\n`;
    content += `<p>`;
    for (const ss of details.screenshots.slice(0, 8)) {
      content += `<img src="${ss}" alt="Screenshot" />`;
    }
    content += `</p>\n\n`;
  }
  
  // Download Links - Each as H3 heading with MaxButton shortcode
  if (details.downloadLinks.length > 0) {
    for (const link of details.downloadLinks) {
      content += `<h3>${link.label}</h3>\n`;
      content += `[maxbutton id="8" text="DOWNLOAD NOW" url="${link.url}"]\n\n`;
    }
  }
  
  // Telegram link
  content += `<p><a href="https://t.me/extramovies_16" target="_blank" rel="noopener">Join Telegram</a></p>\n\n`;
  
  // Footer/SEO text
  content += `<p><strong>Extra Movies</strong> <strong>extramovies, extramovies casa, Extra Movies, extramovies. , extramovies hub, extramovies 2022, extramovies in, extramovies cc, extramovies click, extra movies team, webs</strong> Download ${details.title}</p>\n\n`;
  
  // How to download link
  content += `<p><a href="https://extramovies.miami/how-to-download/" title="How to download">DOWNLOAD कैसे करे</a></p>\n\n`;
  
  // Winding Up - H3
  content += `<h3>Winding Up</h3>\n\n`;
  content += `<p>Thank You For Visiting <strong><a href="https://extramovies.miami/">ExtraMovies.Africa</a></strong> The Prefect Spot For HD Dual Audio (Hindi-English) Movies &amp; TV Series Download. So Please Keep Downloading &amp; Keep Sharing. Enjoy!</p>`;

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
      
      // Resolve mdrive.today links to hubcloud.foo links
      console.log(`Resolving ${movieDetails.downloadLinks.length} mdrive links to hubcloud...`);
      const hubcloudLinks = await resolveHubcloudLinks(movieDetails.downloadLinks);
      console.log(`Found ${hubcloudLinks.length} hubcloud links`);
      
      // Update movie details with hubcloud links
      if (hubcloudLinks.length > 0) {
        movieDetails.downloadLinks = hubcloudLinks;
      }
      
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

      // Create the post - raw HTML for Classic editor
      const postData: any = {
        title: movieDetails.title,
        content: content,
        status: 'draft',
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
