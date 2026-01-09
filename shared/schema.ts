import { z } from "zod";

export const linkFinderRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  pattern: z.string().min(1, "Please enter a search pattern"),
});

export type LinkFinderRequest = z.infer<typeof linkFinderRequestSchema>;

export interface LinkFinderResult {
  url: string;
  matchedLinks: string[];
  totalFound: number;
  processingTime: number;
  error?: string;
}
