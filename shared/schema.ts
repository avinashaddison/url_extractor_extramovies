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

export interface DownloadLink {
  label: string;
  url: string;
}

export interface MovieDetails {
  title: string;
  posterImage?: string;
  screenshots: string[];
  genre?: string;
  language?: string;
  quality?: string;
  imdbRating?: string;
  director?: string;
  downloadLinks: DownloadLink[];
  sourceUrl: string;
}

export interface LinkFinderResult {
  url: string;
  matchedLinks: string[];
  totalFound: number;
  processingTime: number;
  movieDetails?: MovieDetails;
  error?: string;
}

export const wordpressSettingsSchema = z.object({
  siteUrl: z.string().url("Please enter a valid WordPress site URL"),
  username: z.string().min(1, "Username is required"),
  appPassword: z.string().min(1, "Application password is required"),
});

export type WordPressSettings = z.infer<typeof wordpressSettingsSchema>;

export interface WordPressPostRequest {
  movieDetails: MovieDetails;
  settings: WordPressSettings;
}

export interface WordPressPostResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}
