import { useEffect, useState } from "react";
import { Swords, Loader2, Users, Clock, History, Share2, Trophy, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const [debates, setDebates] = useState<Debate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [votesA, setVotesA] = useState(0);
  const [votesB, setVotesB] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const debate = debates[activeIndex] || null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadDebates();
  }, []);

  useEffect(() => {
    if (!debate) return;
    loadVotes(debate);
  }, [debate?.id]);

  // Countdown timer
  useEffect(() => {
    if (!debate) return;
    const tick = () => {
      const now = new Date().getTime();
      const exp = new Date(debate.expires_at).getTime();
      const diff = exp - now;
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [debate?.expires_at]);

  const loadDebates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("anime_debates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setDebates(data || []);
    setActiveIndex(0);
    setLoading(false);
  };

  const loadVotes = async (d: Debate) => {
    const { data: votes } = await supabase
      .from("anime_debate_votes")
      .select("vote")
      .eq("debate_id", d.id);
    if (votes) {
      setVotesA(votes.filter(v => v.vote === "a").length);
      setVotesB(votes.filter(v => v.vote === "b").length);
    } else {
      setVotesA(0);
      setVotesB(0);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userVote } = await supabase
        .from("anime_debate_votes")
        .select("vote")
        .eq("debate_id", d.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyVote(userVote?.vote || null);
    } else {
      setMyVote(null);
    }
  };

  const generateDebate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-anime", {
        body: { action: "debate" },
      });
      if (error) throw error;
      if (!data?.debate) throw new Error("No debate generated");
      toast.success("New debate generated!");
      loadDebates();
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
    const prevVote = myVote;
    setMyVote(vote);
    if (vote === "a") {
      setVotesA(v => v + (prevVote === "b" ? 1 : prevVote ? 0 : 1));
      if (prevVote === "b") setVotesB(v => v - 1);
    } else {
      setVotesB(v => v + (prevVote === "a" ? 1 : prevVote ? 0 : 1));
      if (prevVote === "a") setVotesA(v => v - 1);
    }
  };

  const shareDebate = () => {
    if (!debate) return;
    const url = `${window.location.origin}/debates`;
    const text = `🔥 ${debate.topic}\n${debate.option_a} vs ${debate.option_b}\nVote now!`;
    if (navigator.share) {
      navigator.share({ title: "Anime Debate", text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Copied to clipboard!");
    }
  };

  const totalVotes = votesA + votesB;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const pctB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 50;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Anime Debates</h1>
              <p className="text-sm text-muted-foreground">AI-generated debates — pick your side!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              title="History"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={shareDebate}
              className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={generateDebate}
              disabled={generating}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              title="Generate New Debate"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : showHistory ? (
          /* History View */
          <div className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="w-5 h-5" /> Past Debates
            </h2>
            {debates.map((d, i) => (
              <button
                key={d.id}
                onClick={() => { setActiveIndex(i); setShowHistory(false); }}
                className={`w-full text-left rounded-xl p-4 transition-all border ${
                  i === activeIndex ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-foreground text-sm">{d.topic}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.option_a} vs {d.option_b}</p>
                <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
              </button>
            ))}
            {debates.length === 0 && <p className="text-muted-foreground text-center py-8">No debates yet.</p>}
          </div>
        ) : !debate ? (
          <div className="text-center py-20">
            <Flame className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={debate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Topic + Timer */}
              <div className="glass rounded-xl p-6 text-center">
                <h2 className="text-xl font-display font-bold text-foreground mb-3">{debate.topic}</h2>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeLeft}</span>
                </div>
              </div>

              {/* Voting Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Option A */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote("a")}
                  className={`relative rounded-xl overflow-hidden transition-all border-2 ${
                    myVote === "a"
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {debate.option_a_image ? (
                    <div className="aspect-[3/4] relative">
                      <img
                        src={debate.option_a_image}
                        alt={debate.option_a}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-lg font-display font-bold text-white">{debate.option_a}</p>
                        {myVote && (
                          <div className="mt-2">
                            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pctA}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            <p className="text-sm font-bold text-white mt-1">{pctA}% ({votesA})</p>
                          </div>
                        )}
                      </div>
                      {myVote === "a" && (
                        <div className="absolute top-3 right-3 bg-primary rounded-full p-1">
                          <Trophy className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[3/4] flex flex-col items-center justify-center p-6 bg-secondary">
                      <Flame className="w-10 h-10 text-primary mb-3 opacity-60" />
                      <p className="text-lg font-display font-bold text-foreground">{debate.option_a}</p>
                      {myVote && (
                        <div className="mt-3 w-full">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pctA}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-sm font-semibold text-primary mt-1">{pctA}% ({votesA})</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>

                {/* VS divider on mobile */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote("b")}
                  className={`relative rounded-xl overflow-hidden transition-all border-2 ${
                    myVote === "b"
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {debate.option_b_image ? (
                    <div className="aspect-[3/4] relative">
                      <img
                        src={debate.option_b_image}
                        alt={debate.option_b}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-lg font-display font-bold text-white">{debate.option_b}</p>
                        {myVote && (
                          <div className="mt-2">
                            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pctB}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            <p className="text-sm font-bold text-white mt-1">{pctB}% ({votesB})</p>
                          </div>
                        )}
                      </div>
                      {myVote === "b" && (
                        <div className="absolute top-3 right-3 bg-primary rounded-full p-1">
                          <Trophy className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[3/4] flex flex-col items-center justify-center p-6 bg-secondary">
                      <Flame className="w-10 h-10 text-primary mb-3 opacity-60" />
                      <p className="text-lg font-display font-bold text-foreground">{debate.option_b}</p>
                      {myVote && (
                        <div className="mt-3 w-full">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pctB}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <p className="text-sm font-semibold text-primary mt-1">{pctB}% ({votesB})</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.button>
              </div>

              {/* VS badge */}
              <div className="flex justify-center -mt-4 -mb-2 relative z-10">
                <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-display font-bold text-sm shadow-lg">
                  VS
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={generateDebate}
                  disabled={generating}
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  New Debate
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default AnimeDebates;
