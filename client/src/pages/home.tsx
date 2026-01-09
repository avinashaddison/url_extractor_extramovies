import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Film, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Download, 
  ArrowLeft,
  RefreshCw,
  Link2,
  ChevronRight
} from "lucide-react";
import type { MovieListResult, LinkFinderResult, MoviePost } from "@shared/schema";

function MovieSection({ 
  title, 
  movies, 
  onMovieClick 
}: { 
  title: string; 
  movies: MoviePost[]; 
  onMovieClick: (post: MoviePost) => void;
}) {
  if (movies.length === 0) return null;
  
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {movies.slice(0, 5).map((post, index) => (
          <div
            key={index}
            className="cursor-pointer group"
            onClick={() => onMovieClick(post)}
            data-testid={`card-movie-${index}`}
          >
            <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-muted mb-2">
              {post.thumbnail ? (
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-white text-xs font-medium line-clamp-2">
                  {post.title}
                </p>
              </div>
            </div>
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors" title={post.title}>
              {post.title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [selectedPost, setSelectedPost] = useState<MoviePost | null>(null);
  const { toast } = useToast();

  const moviesQuery = useQuery<MovieListResult>({
    queryKey: ["/api/movies"],
  });

  const extractLinksMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/extract-links", { url });
      return response.json() as Promise<LinkFinderResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to extract links",
        variant: "destructive",
      });
    },
  });

  const handlePostClick = (post: MoviePost) => {
    setSelectedPost(post);
    extractLinksMutation.mutate(post.url);
  };

  const handleBack = () => {
    setSelectedPost(null);
    extractLinksMutation.reset();
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Link copied to clipboard" });
  };

  const handleCopyAll = () => {
    if (extractLinksMutation.data?.matchedLinks) {
      navigator.clipboard.writeText(extractLinksMutation.data.matchedLinks.join("\n"));
      toast({
        title: "Copied all",
        description: `${extractLinksMutation.data.matchedLinks.length} links copied`,
      });
    }
  };

  const handleDownload = () => {
    if (!extractLinksMutation.data?.matchedLinks) return;
    const content = extractLinksMutation.data.matchedLinks.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPost?.title || "links"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Categorize movies
  const categorizeMovies = (posts: MoviePost[]) => {
    const latest: MoviePost[] = [];
    const bollywood: MoviePost[] = [];
    const hollywood: MoviePost[] = [];
    const series: MoviePost[] = [];
    const other: MoviePost[] = [];

    posts.forEach((post, index) => {
      const title = post.title.toLowerCase();
      
      // First 5 are latest
      if (index < 5) {
        latest.push(post);
        return;
      }
      
      // Categorize rest
      if (title.includes('season') || title.includes('series') || title.includes('episode')) {
        series.push(post);
      } else if (title.includes('hindi') && !title.includes('english')) {
        bollywood.push(post);
      } else if (title.includes('english') || title.includes('bluray')) {
        hollywood.push(post);
      } else {
        other.push(post);
      }
    });

    return { latest, bollywood, hollywood, series, other };
  };

  const categories = moviesQuery.data?.posts 
    ? categorizeMovies(moviesQuery.data.posts) 
    : { latest: [], bollywood: [], hollywood: [], series: [], other: [] };

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1000px] mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Movies
          </Button>

          <div className="flex gap-6 mb-6">
            {selectedPost.thumbnail && (
              <div className="w-48 flex-shrink-0">
                <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                  <img
                    src={selectedPost.thumbnail}
                    alt={selectedPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-3" data-testid="text-post-title">
                {selectedPost.title}
              </h1>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {selectedPost.url}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium">MDrive Links</h2>
                  {extractLinksMutation.data && (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary" data-testid="text-link-count">
                      {extractLinksMutation.data.totalFound} found
                    </span>
                  )}
                </div>
                {extractLinksMutation.data?.matchedLinks && extractLinksMutation.data.matchedLinks.length > 0 && (
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
                      onClick={handleDownload}
                      className="gap-2"
                      data-testid="button-download"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  </div>
                )}
              </div>

              {extractLinksMutation.isPending && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {extractLinksMutation.data?.error && (
                <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm" data-testid="text-error">
                  {extractLinksMutation.data.error}
                </div>
              )}

              {extractLinksMutation.data && !extractLinksMutation.data.error && extractLinksMutation.data.matchedLinks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No mdrive.today links found in this post</p>
                </div>
              )}

              {extractLinksMutation.data?.matchedLinks && extractLinksMutation.data.matchedLinks.length > 0 && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {extractLinksMutation.data.matchedLinks.map((link, index) => (
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
                        <a href={link} target="_blank" rel="noopener noreferrer">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <header className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
              <Film className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="text-title">
            MoviesDrive Link Finder
          </h1>
          <p className="text-muted-foreground">
            Click any movie to extract MDrive download links
          </p>
        </header>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {moviesQuery.data?.totalFound || 0} movies indexed
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => moviesQuery.refetch()}
            disabled={moviesQuery.isFetching}
            className="gap-2"
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${moviesQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {moviesQuery.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        )}

        {moviesQuery.data?.error && (
          <Card>
            <CardContent className="pt-6">
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                {moviesQuery.data.error}
              </div>
            </CardContent>
          </Card>
        )}

        {moviesQuery.data?.posts && moviesQuery.data.posts.length > 0 && (
          <div>
            <MovieSection 
              title="Latest Updates" 
              movies={categories.latest} 
              onMovieClick={handlePostClick} 
            />
            <MovieSection 
              title="Hollywood" 
              movies={categories.hollywood} 
              onMovieClick={handlePostClick} 
            />
            <MovieSection 
              title="Bollywood" 
              movies={categories.bollywood} 
              onMovieClick={handlePostClick} 
            />
            <MovieSection 
              title="Web Series" 
              movies={categories.series} 
              onMovieClick={handlePostClick} 
            />
            <MovieSection 
              title="More Movies" 
              movies={categories.other} 
              onMovieClick={handlePostClick} 
            />
          </div>
        )}

        {moviesQuery.data?.posts && moviesQuery.data.posts.length === 0 && !moviesQuery.data.error && (
          <div className="text-center py-20 text-muted-foreground">
            <Film className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No movies found</p>
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          MoviesDrive Link Finder v1.0
        </footer>
      </div>
    </div>
  );
}
