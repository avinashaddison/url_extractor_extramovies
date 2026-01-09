import { z } from "zod";

export interface MoviePost {
  title: string;
  url: string;
  thumbnail?: string;
}

export interface MovieListResult {
  posts: MoviePost[];
  totalFound: number;
  error?: string;
}

export interface LinkFinderResult {
  url: string;
  matchedLinks: string[];
  totalFound: number;
  processingTime: number;
  error?: string;
}
