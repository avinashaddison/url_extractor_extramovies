import { z } from "zod";

export const domainSettingsSchema = z.object({
  moviesDriveDomain: z.string().min(1, "MoviesDrive domain is required"),
  hubcloudDomain: z.string().min(1, "HubCloud domain is required"),
  mdrivePattern: z.string().min(1, "mdrive pattern is required"),
});

export type DomainSettings = z.infer<typeof domainSettingsSchema>;

export const DEFAULT_DOMAIN_SETTINGS: DomainSettings = {
  moviesDriveDomain: "moviesdrive.forum",
  hubcloudDomain: "hubcloud.foo",
  mdrivePattern: "mdrive.today",
};

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
  storyline?: string;
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
