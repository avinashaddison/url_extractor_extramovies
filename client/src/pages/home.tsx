import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link2, Search, Copy, ExternalLink, Loader2, Download, Trash2 } from "lucide-react";
import type { LinkFinderResult } from "@shared/schema";

export default function Home() {
  const [url, setUrl] = useState("");
  const [pattern, setPattern] = useState("");
  const { toast } = useToast();

  const findLinksMutation = useMutation({
    mutationFn: async (data: { url: string; pattern: string }) => {
      const response = await apiRequest("POST", "/api/find-links", data);
      return response.json() as Promise<LinkFinderResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch links",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !pattern.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter both URL and search pattern",
        variant: "destructive",
      });
      return;
    }
    findLinksMutation.mutate({ url: url.trim(), pattern: pattern.trim() });
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };

  const handleCopyAll = () => {
    if (findLinksMutation.data?.matchedLinks) {
      navigator.clipboard.writeText(findLinksMutation.data.matchedLinks.join("\n"));
      toast({
        title: "Copied all",
        description: `${findLinksMutation.data.matchedLinks.length} links copied to clipboard`,
      });
    }
  };

  const handleDownload = (format: "txt" | "json") => {
    if (!findLinksMutation.data?.matchedLinks) return;
    
    let content: string;
    let filename: string;
    let type: string;

    if (format === "json") {
      content = JSON.stringify(findLinksMutation.data.matchedLinks, null, 2);
      filename = "links.json";
      type = "application/json";
    } else {
      content = findLinksMutation.data.matchedLinks.join("\n");
      filename = "links.txt";
      type = "text/plain";
    }

    const blob = new Blob([content], { type });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleClear = () => {
    setUrl("");
    setPattern("");
    findLinksMutation.reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-2" data-testid="text-title">
            Link Finder
          </h1>
          <p className="text-muted-foreground text-lg">
            Extract matching links from any webpage
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Find Links</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="url" className="text-sm font-medium">
                  Page URL
                </label>
                <Textarea
                  id="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-sm min-h-[80px] resize-none"
                  data-testid="input-url"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="pattern" className="text-sm font-medium">
                  Search Pattern
                </label>
                <Input
                  id="pattern"
                  placeholder="e.g., mdrive.today or *.mp4"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="font-mono text-sm"
                  data-testid="input-pattern"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a domain or text pattern to match in URLs
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={findLinksMutation.isPending}
                  className="gap-2"
                  data-testid="button-search"
                >
                  {findLinksMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Find Links
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClear}
                  className="gap-2"
                  data-testid="button-clear"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {findLinksMutation.data && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg font-medium">Results</CardTitle>
                  <span className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary" data-testid="text-count">
                    {findLinksMutation.data.totalFound} found
                  </span>
                </div>
                {findLinksMutation.data.matchedLinks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAll}
                      className="gap-2"
                      data-testid="button-copy-all"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload("txt")}
                      className="gap-2"
                      data-testid="button-download-txt"
                    >
                      <Download className="w-3 h-3" />
                      TXT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload("json")}
                      className="gap-2"
                      data-testid="button-download-json"
                    >
                      <Download className="w-3 h-3" />
                      JSON
                    </Button>
                  </div>
                )}
              </div>
              {findLinksMutation.data.processingTime > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Processed in {findLinksMutation.data.processingTime}ms
                </p>
              )}
            </CardHeader>
            <CardContent>
              {findLinksMutation.data.error ? (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm" data-testid="text-error">
                  {findLinksMutation.data.error}
                </div>
              ) : findLinksMutation.data.matchedLinks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No matching links found</p>
                  <p className="text-xs mt-1">Try a different search pattern</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {findLinksMutation.data.matchedLinks.map((link, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`link-result-${index}`}
                    >
                      <span className="flex-1 font-mono text-sm truncate" title={link}>
                        {link}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(link)}
                          className="h-8 w-8"
                          data-testid={`button-copy-${index}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-external-${index}`}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!findLinksMutation.data && !findLinksMutation.isPending && (
          <div className="text-center py-16 text-muted-foreground">
            <Link2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Enter a URL and pattern to get started</p>
            <p className="text-xs mt-2">
              Example: Search for <code className="font-mono bg-muted px-1.5 py-0.5 rounded">drive.google.com</code> links
            </p>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Link Finder v1.0
        </footer>
      </div>
    </div>
  );
}
