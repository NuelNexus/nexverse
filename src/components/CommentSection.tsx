import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

interface CommentSectionProps {
  contentType: "anime" | "manga";
  contentId: string;
}

const CommentSection = ({ contentType, contentId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const loadComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*, profiles(username, avatar_url)")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setComments(data as any);
    };
    loadComments();

    const channel = supabase
      .channel(`comments-${contentType}-${contentId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `content_id=eq.${contentId}`,
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contentType, contentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user) {
      if (!user) toast.error("Please sign in to comment");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentId,
      body: body.trim(),
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setBody("");
    }
    setLoading(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        Comments ({comments.length})
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={user ? "Write a comment..." : "Sign in to comment"}
          disabled={!user}
          className="flex-1 h-10 px-4 rounded-lg bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !user || !body.trim()}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">
                  {(c.profiles as any)?.username?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">{(c.profiles as any)?.username || "User"}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground pl-8">{c.body}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
