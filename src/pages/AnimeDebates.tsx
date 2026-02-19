import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swords, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Debate {
  id: string;
  topic: string;
  option_a: string;
  option_b: string;
  option_a_image: string | null;
  option_b_image: string | null;
  created_at: string;
  expires_at: string;
}

const AnimeDebates = () => {
  const [debate, setDebate] = useState<Debate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadDebate();
  }, []);

  const loadDebate = async () => {
    setLoading(true);
    // Get the latest debate
    const { data: debates } = await supabase
      .from("anime_debates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    const latestDebate = debates?.[0] || null;
    setDebate(latestDebate);

    if (latestDebate) {
      // Load votes
      const { data: votes } = await supabase
        .from("anime_debate_votes")
        .select("vote")
        .eq("debate_id", latestDebate.id);

      if (votes) {
        setVotesA(votes.filter(v => v.vote === "a").length);
        setVotesB(votes.filter(v => v.vote === "b").length);
      }

      // Check user's vote
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userVote } = await supabase
          .from("anime_debate_votes")
          .select("vote")
          .eq("debate_id", latestDebate.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setMyVote(userVote?.vote || null);
      }
    }
    setLoading(false);
  };

  const generateDebate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-anime", {
        body: { action: "debate" },
      });
      if (error) throw error;
      const d = data?.debate;
      if (!d) throw new Error("No debate generated");

      const { data: inserted, error: insertError } = await supabase
        .from("anime_debates")
        .insert({
          topic: d.topic,
          option_a: d.option_a,
          option_b: d.option_b,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      toast.success("New debate generated!");
      loadDebate();
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate debate");
    } finally {
      setGenerating(false);
    }
  };

  const handleVote = async (vote: "a" | "b") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    if (!debate) return;

    if (myVote) {
      // Update vote
      await supabase.from("anime_debate_votes")
        .update({ vote })
        .eq("debate_id", debate.id)
        .eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("anime_debate_votes").insert({
        debate_id: debate.id,
        user_id: user.id,
        vote,
      });
      if (error) { toast.error("Failed to vote"); return; }
    }
    toast.success("Vote cast!");
    setMyVote(vote);
    // Optimistic update
    if (vote === "a") {
      setVotesA(v => v + (myVote === "b" ? 1 : myVote ? 0 : 1));
      if (myVote === "b") setVotesB(v => v - 1);
    } else {
      setVotesB(v => v + (myVote === "a" ? 1 : myVote ? 0 : 1));
      if (myVote === "a") setVotesA(v => v - 1);
    }
  };

  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Anime Debates</h1>
              <p className="text-sm text-muted-foreground">Daily AI-generated debates — pick your side!</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !debate ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No debates yet. Generate the first one!</p>
            <button
              onClick={generateDebate}
              disabled={generating}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              Generate Debate
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Debate topic */}
            <div className="glass rounded-xl p-6 text-center">
              <h2 className="text-xl font-display font-bold text-foreground mb-2">{debate.topic}</h2>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Voting options */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleVote("a")}
                className={`relative rounded-xl p-6 text-center transition-all border-2 ${
                  myVote === "a"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <p className="text-lg font-display font-bold text-foreground mb-2">{debate.option_a}</p>
                {myVote && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pctA}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-primary mt-1">{pctA}%</p>
                  </div>
                )}
              </button>

              <button
                onClick={() => handleVote("b")}
                className={`relative rounded-xl p-6 text-center transition-all border-2 ${
                  myVote === "b"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <p className="text-lg font-display font-bold text-foreground mb-2">{debate.option_b}</p>
                {myVote && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-primary mt-1">{pctB}%</p>
                  </div>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={generateDebate}
                disabled={generating}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                New Debate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeDebates;
