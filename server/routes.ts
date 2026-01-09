import type { Express } from "express";
import { createServer, type Server } from "http";
import { linkFinderRequestSchema, type LinkFinderResult } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/find-links", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const parseResult = linkFinderRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const result: LinkFinderResult = {
          url: req.body.url || "",
          matchedLinks: [],
          totalFound: 0,
          processingTime: Date.now() - startTime,
          error: parseResult.error.errors[0]?.message || "Invalid input",
        };
        return res.status(400).json(result);
      }

      const { url, pattern } = parseResult.data;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        const result: LinkFinderResult = {
          url,
          matchedLinks: [],
          totalFound: 0,
          processingTime: Date.now() - startTime,
          error: `Failed to fetch page: ${response.status} ${response.statusText}`,
        };
        return res.status(200).json(result);
      }

      const html = await response.text();
      
      const urlRegex = /https?:\/\/[^\s"'<>()]+/gi;
      const allUrls = html.match(urlRegex) || [];
      
      const patternLower = pattern.toLowerCase();
      const matchedLinks = [...new Set(
        allUrls.filter(link => link.toLowerCase().includes(patternLower))
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
        url: req.body.url || "",
        matchedLinks: [],
        totalFound: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      };
      res.status(200).json(result);
    }
  });

  return httpServer;
}
