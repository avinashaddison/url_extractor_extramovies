import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
  Settings,
  Send,
  CheckCircle,
  X,
  Star,
  Tag,
  Languages,
  MonitorPlay,
  User,
  ImageIcon
} from "lucide-react";

async function copyAllImagesToClipboard(imageUrls: string[]): Promise<boolean> {
  try {
    const images: HTMLImageElement[] = await Promise.all(
      imageUrls.map((url) => loadImage(url))
    );
    
    if (images.length === 0) return false;
    
    const maxWidth = Math.max(...images.map(img => img.width));
    const totalHeight = images.reduce((sum, img) => sum + img.height + 10, 0);
    
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let yOffset = 0;
    for (const img of images) {
      const xOffset = (maxWidth - img.width) / 2;
      ctx.drawImage(img, xOffset, yOffset);
      yOffset += img.height + 10;
    }
    
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    if (!blob) return false;
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch (error) {
    console.error('Failed to copy images:', error);
    return false;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
import type { MovieListResult, LinkFinderResult, MoviePost, WordPressSettings, WordPressPostResult, MovieDetails } from "@shared/schema";

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

interface DualWordPressSettings {
  wp1: WordPressSettings;
  wp2: WordPressSettings;
  wp2Enabled: boolean;
}

function WordPressSettingsPanel({ 
  settings, 
  onSettingsChange,
  onClose 
}: { 
  settings: DualWordPressSettings;
  onSettingsChange: (settings: DualWordPressSettings) => void;
  onClose: () => void;
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: async (s: WordPressSettings) => {
      const response = await apiRequest("POST", "/api/wordpress/test", s);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connected", description: data.message });
      } else {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
      }
    },
  });

  const handleSave = () => {
    localStorage.setItem("wp_dual_settings", JSON.stringify(localSettings));
    onSettingsChange(localSettings);
    toast({ title: "Saved", description: "WordPress settings saved" });
    onClose();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">WordPress Settings</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* WordPress Site 1 - MoviesDrive */}
        <div className="space-y-4">
          <h3 className="font-medium text-primary">MoviesDrive</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Site URL</label>
            <Input
              placeholder="https://yoursite1.com"
              value={localSettings.wp1.siteUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, wp1: { ...localSettings.wp1, siteUrl: e.target.value } })}
              data-testid="input-wp1-url"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              placeholder="admin"
              value={localSettings.wp1.username}
              onChange={(e) => setLocalSettings({ ...localSettings, wp1: { ...localSettings.wp1, username: e.target.value } })}
              data-testid="input-wp1-username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Application Password</label>
            <Input
              type="password"
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              value={localSettings.wp1.appPassword}
              onChange={(e) => setLocalSettings({ ...localSettings, wp1: { ...localSettings.wp1, appPassword: e.target.value } })}
              data-testid="input-wp1-password"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testConnectionMutation.mutate(localSettings.wp1)}
            disabled={testConnectionMutation.isPending}
            data-testid="button-test-wp1"
          >
            {testConnectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Test MoviesDrive
          </Button>
        </div>

        <hr className="border-border" />

        {/* WordPress Site 2 - ExtraMovies */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-primary">ExtraMovies</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={localSettings.wp2Enabled}
                onChange={(e) => setLocalSettings({ ...localSettings, wp2Enabled: e.target.checked })}
                className="rounded"
                data-testid="checkbox-wp2-enabled"
              />
              Enable
            </label>
          </div>
          {localSettings.wp2Enabled && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Site URL</label>
                <Input
                  placeholder="https://yoursite2.com"
                  value={localSettings.wp2.siteUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, wp2: { ...localSettings.wp2, siteUrl: e.target.value } })}
                  data-testid="input-wp2-url"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="admin"
                  value={localSettings.wp2.username}
                  onChange={(e) => setLocalSettings({ ...localSettings, wp2: { ...localSettings.wp2, username: e.target.value } })}
                  data-testid="input-wp2-username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Application Password</label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  value={localSettings.wp2.appPassword}
                  onChange={(e) => setLocalSettings({ ...localSettings, wp2: { ...localSettings.wp2, appPassword: e.target.value } })}
                  data-testid="input-wp2-password"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testConnectionMutation.mutate(localSettings.wp2)}
                disabled={testConnectionMutation.isPending}
                data-testid="button-test-wp2"
              >
                {testConnectionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Test ExtraMovies
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Create application passwords in WordPress: Users → Profile → Application Passwords
        </p>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} data-testid="button-save-wp">
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MovieDetailsCard({ details }: { details: MovieDetails }) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex gap-6">
          {details.posterImage && (
            <div className="w-40 flex-shrink-0">
              <img
                src={details.posterImage}
                alt={details.title}
                className="w-full rounded-md"
              />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-semibold" data-testid="text-movie-title">{details.title}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {details.imdbRating && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-muted-foreground">IMDB:</span>
                  <span className="font-medium">{details.imdbRating}</span>
                </div>
              )}
              {details.genre && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Genre:</span>
                  <span className="font-medium">{details.genre}</span>
                </div>
              )}
              {details.language && (
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Language:</span>
                  <span className="font-medium">{details.language}</span>
                </div>
              )}
              {details.quality && (
                <div className="flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Quality:</span>
                  <span className="font-medium">{details.quality}</span>
                </div>
              )}
              {details.director && (
                <div className="flex items-center gap-2 col-span-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Director:</span>
                  <span className="font-medium">{details.director}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {details.screenshots.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Screenshots</h3>
            <div className="grid grid-cols-4 gap-2">
              {details.screenshots.slice(0, 4).map((ss, index) => (
                <img
                  key={index}
                  src={ss}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full rounded-md"
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [selectedPost, setSelectedPost] = useState<MoviePost | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [wpSettings, setWpSettings] = useState<DualWordPressSettings>({
    wp1: { siteUrl: "", username: "", appPassword: "" },
    wp2: { siteUrl: "", username: "", appPassword: "" },
    wp2Enabled: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("wp_dual_settings");
    if (saved) {
      try {
        setWpSettings(JSON.parse(saved));
      } catch {}
    }
  }, []);

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

  const postToWordPressMutation = useMutation({
    mutationFn: async (movieDetails: MovieDetails) => {
      const results: { site: string; result: WordPressPostResult }[] = [];
      
      // Post to MoviesDrive
      const response1 = await apiRequest("POST", "/api/wordpress/post", {
        movieDetails,
        settings: wpSettings.wp1,
      });
      const result1 = await response1.json() as WordPressPostResult;
      results.push({ site: "MoviesDrive", result: result1 });
      
      // Post to ExtraMovies if enabled
      if (wpSettings.wp2Enabled && wpSettings.wp2.siteUrl) {
        const response2 = await apiRequest("POST", "/api/wordpress/post", {
          movieDetails,
          settings: wpSettings.wp2,
        });
        const result2 = await response2.json() as WordPressPostResult;
        results.push({ site: "ExtraMovies", result: result2 });
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successes = results.filter(r => r.result.success);
      const failures = results.filter(r => !r.result.success);
      
      if (successes.length > 0) {
        toast({
          title: "Posted to WordPress",
          description: successes.map(s => `${s.site}: Post ID ${s.result.postId}`).join(", "),
        });
      }
      if (failures.length > 0) {
        toast({
          title: "Some posts failed",
          description: failures.map(f => `${f.site}: ${f.result.error}`).join(", "),
          variant: "destructive",
        });
      }
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

  const handlePostToWordPress = () => {
    const movieDetails = extractLinksMutation.data?.movieDetails;
    if (!movieDetails) return;

    if (!wpSettings.wp1.siteUrl || !wpSettings.wp1.username || !wpSettings.wp1.appPassword) {
      toast({
        title: "WordPress not configured",
        description: "Please configure your WordPress settings first",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    postToWordPressMutation.mutate(movieDetails);
  };

  const categorizeMovies = (posts: MoviePost[]) => {
    const latest: MoviePost[] = [];
    const bollywood: MoviePost[] = [];
    const hollywood: MoviePost[] = [];
    const series: MoviePost[] = [];
    const other: MoviePost[] = [];

    posts.forEach((post, index) => {
      const title = post.title.toLowerCase();
      
      if (index < 5) {
        latest.push(post);
        return;
      }
      
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

  const hasWpSettings = wpSettings.wp1.siteUrl && wpSettings.wp1.username && wpSettings.wp1.appPassword;
  const movieDetails = extractLinksMutation.data?.movieDetails;

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[900px] mx-auto px-4 py-6">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {showSettings && (
            <WordPressSettingsPanel
              settings={wpSettings}
              onSettingsChange={setWpSettings}
              onClose={() => setShowSettings(false)}
            />
          )}

          {extractLinksMutation.isPending && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}

          {extractLinksMutation.data?.error && (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm" data-testid="text-error">
              {extractLinksMutation.data.error}
            </div>
          )}

          {movieDetails && (
            <div className="space-y-4">
              {/* [How To Download] Header */}
              <h2 className="text-xl font-bold text-primary">[How To Download]</h2>

              {/* Intro paragraph */}
              <p className="text-sm">
                Download <strong>{movieDetails.title}</strong> [{" "}
                <strong>{movieDetails.language || "Hindi"}</strong>]{" "}
                <strong>{movieDetails.quality || "480p | 720p | 1080p"}</strong> Dual Audio [x264/ESubs] | Full Movie, based on{" "}
                <strong>{movieDetails.genre || "Drama"}</strong> and Available In{" "}
                <strong>{(movieDetails.language || "Hindi").split("(")[0].trim()}</strong> available
              </p>

              {/* Poster */}
              {movieDetails.posterImage && (
                <div className="text-center py-4">
                  <img
                    src={movieDetails.posterImage}
                    alt={movieDetails.title}
                    className="max-w-[280px] mx-auto rounded border border-border"
                  />
                </div>
              )}

              {/* Download [Movie Name] Header */}
              <h2 className="text-xl font-bold">
                Download {movieDetails.title.replace(/\s*\(\d{4}\).*$/, "").trim()}
              </h2>

              {/* MoviesDrive intro */}
              <p className="text-sm text-muted-foreground">
                <strong>MoviesDrive</strong> is the best online platform for downloading <strong>Bollywood</strong> & <strong>Hollywood</strong> <strong>Movies</strong> and <strong>Indian Movies</strong> and <strong>Web Series</strong>. We also provide <strong>south</strong> movies like <strong>Hindi Dubbed</strong>, <strong>Tamil</strong>, <strong>Telugu</strong>, <strong>Malayalam</strong>, <strong>Punjabi</strong>, and other local Movies. We offer direct <strong>G-Drive</strong> download links for fast and secure downloading. Click the <strong>download</strong> button below and follow the steps to start the download.
              </p>

              {/* Movie Information */}
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold italic">Movie Information</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const info = `iMDB Rating: ${movieDetails.imdbRating || "N/A"}\nMovie Name: ${movieDetails.title}\nGenre: ${movieDetails.genre || "N/A"}${movieDetails.director ? `\nDirector: ${movieDetails.director}` : ""}\nLanguage:[${movieDetails.language || "Hindi"}] / ESubs\nQuality: ${movieDetails.quality || "WEB-DL 480p | 720p | 1080p"}\nFormat: MKV`;
                    navigator.clipboard.writeText(info);
                    toast({ title: "Copied", description: "Movie Information copied" });
                  }}
                  data-testid="button-copy-info"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                <p>iMDB Rating: {movieDetails.imdbRating || "N/A"}</p>
                <p>Movie Name: {movieDetails.title}</p>
                <p>Genre: {movieDetails.genre || "N/A"}</p>
                {movieDetails.director && <p>Director: {movieDetails.director}</p>}
                <p>Language:[{movieDetails.language || "Hindi"}] / ESubs</p>
                <p>Quality: {movieDetails.quality || "WEB-DL 480p | 720p | 1080p"}</p>
                <p>Format: MKV</p>
              </div>

              {/* StoryLine */}
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold italic">StoryLine</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const story = `${movieDetails.title} ${movieDetails.storyline || "Watch and download this amazing movie in high quality HD format."}`;
                    navigator.clipboard.writeText(story);
                    toast({ title: "Copied", description: "StoryLine copied" });
                  }}
                  data-testid="button-copy-storyline"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-primary">
                <strong>{movieDetails.title}</strong>{" "}
                {movieDetails.storyline || "Watch and download this amazing movie in high quality HD format."}
              </p>

              {/* Screenshots */}
              {movieDetails.screenshots.length > 0 && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold">Screenshots: (Must See Before Downloading)</h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const urls = movieDetails.screenshots.slice(0, 8).join("\n");
                        navigator.clipboard.writeText(urls);
                        toast({ title: "Copied", description: "Screenshot URLs copied" });
                      }}
                      data-testid="button-copy-screenshots"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const screenshots = movieDetails.screenshots.slice(0, 8);
                        if (screenshots.length > 0) {
                          toast({ title: "Processing...", description: "Combining all screenshots into one image" });
                          const success = await copyAllImagesToClipboard(screenshots);
                          if (success) {
                            toast({ title: "Copied", description: `All ${screenshots.length} screenshots copied as one image` });
                          } else {
                            navigator.clipboard.writeText(screenshots.join("\n"));
                            toast({ title: "Copied URLs", description: "Image copy failed, URLs copied instead" });
                          }
                        }
                      }}
                      className="gap-1"
                      data-testid="button-copy-screenshot-image"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Copy All Images
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {movieDetails.screenshots.slice(0, 8).map((ss, index) => (
                      <div key={index} className="text-center">
                        <img
                          src={ss}
                          alt={`Screenshot ${index + 1}`}
                          className="max-w-full mx-auto border border-border"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Download Links */}
              {movieDetails.downloadLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">No download links found</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {movieDetails.downloadLinks.map((link, index) => (
                    <div key={index} className="text-center" data-testid={`link-result-${index}`}>
                      <h3 className="text-base font-semibold mb-2">{link.label}</h3>
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            DOWNLOAD NOW
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(link.url)}
                          className="gap-2"
                          data-testid={`button-copy-link-${index}`}
                        >
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Telegram */}
              <div className="pt-4">
                <a href="https://t.me/extramovies_16" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    Join Telegram
                  </Button>
                </a>
              </div>

              {/* SEO Footer */}
              <p className="text-xs text-muted-foreground pt-2">
                <strong>Extra Movies</strong> extramovies, extramovies casa, Extra Movies, extramovies hub, extramovies 2022, extramovies in, extramovies cc, extramovies click, extra movies team, webs Download {movieDetails.title}
              </p>

              {/* Winding Up */}
              <h3 className="text-lg font-bold pt-4">Winding Up</h3>
              <p className="text-sm text-muted-foreground">
                Thank You For Visiting <strong>ExtraMovies.Africa</strong> The Prefect Spot For HD Dual Audio (Hindi-English) Movies & TV Series Download. So Please Keep Downloading & Keep Sharing. Enjoy!
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-2"
                  data-testid="button-copy-all"
                >
                  <Copy className="w-4 h-4" />
                  Copy All Links
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="gap-2"
                  data-testid="button-wp-settings"
                >
                  <Settings className="w-4 h-4" />
                  WordPress
                </Button>
                <Button
                  size="sm"
                  onClick={handlePostToWordPress}
                  disabled={postToWordPressMutation.isPending || movieDetails.downloadLinks.length === 0}
                  className="gap-2"
                  data-testid="button-post-wp"
                >
                  {postToWordPressMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : postToWordPressMutation.data?.some(r => r.result.success) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post to WordPress
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {showSettings && (
          <WordPressSettingsPanel
            settings={wpSettings}
            onSettingsChange={setWpSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {moviesQuery.data?.totalFound || 0} movies indexed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2"
              data-testid="button-wp-settings-main"
            >
              <Settings className="w-4 h-4" />
              WordPress
            </Button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {moviesQuery.data.posts.map((movie, index) => (
              <div
                key={index}
                onClick={() => handlePostClick(movie)}
                className="group cursor-pointer"
                data-testid={`card-movie-${index}`}
              >
                <div className="relative aspect-[2/3] rounded-md overflow-hidden border border-border bg-card mb-2">
                  {movie.thumbnail ? (
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xs font-medium line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                  {movie.title}
                </h3>
              </div>
            ))}
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
