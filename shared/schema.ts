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

export const wordpressSettingsSchema = z.object({
  siteUrl: z.string().url("Please enter a valid WordPress site URL"),
  username: z.string().min(1, "Username is required"),
  appPassword: z.string().min(1, "Application password is required"),
});

export type WordPressSettings = z.infer<typeof wordpressSettingsSchema>;

export interface WordPressPostRequest {
  title: string;
  content: string;
  thumbnail?: string;
  settings: WordPressSettings;
}

export interface WordPressPostResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}
