import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [user, setUser] = useState<any>(null);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!groupId) return;

    // Load group info
    supabase.from("groups").select("name").eq("id", groupId).single().then(({ data }) => {
      if (data) setGroupName(data.name);
    });

    // Load members
    supabase.from("group_members").select("user_id").eq("group_id", groupId).then(({ data }) => {
      setMembers(data || []);
    });

    // Load messages
    supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).then(({ data }) => {
      if (data) {
        setMessages(data);
        // Load profiles for all unique user_ids
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        if (userIds.length > 0) {
          supabase.from("profiles").select("id, username, avatar_url").in("id", userIds).then(({ data: profs }) => {
            const map: Record<string, any> = {};
            profs?.forEach((p: any) => { map[p.id] = p; });
            setProfiles(map);
          });
        }
      }
    });

    // Realtime subscription
    const channel = supabase.channel(`group-${groupId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
      async (payload) => {
        const msg = payload.new as Message;
        // Fetch profile if needed
        if (!profiles[msg.user_id]) {
          const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", msg.user_id).single();
          if (data) setProfiles((p) => ({ ...p, [data.id]: data }));
        }
        setMessages((prev) => [...prev, msg]);
      }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim() || !groupId) return;

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      user_id: user.id,
      body: body.trim(),
    });
    if (error) { toast.error("Failed to send message"); return; }
    setBody("");
  };

  return (
    <div className="min-h-screen pt-20 pb-4 flex flex-col">
      <div className="container max-w-3xl flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to="/groups" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{groupName}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {members.length} members
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 glass rounded-lg p-4 overflow-y-auto max-h-[calc(100vh-220px)] space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hi!</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const profile = profiles[msg.user_id];
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.username || "?")[0].toUpperCase()
                  )}
                </div>
                <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                  <p className="text-xs text-muted-foreground mb-0.5">{profile?.username || "User"}</p>
                  <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                    isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {user ? (
          <form onSubmit={handleSend} className="mt-3 flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-11 px-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button type="submit" disabled={!body.trim()} className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <p className="text-center text-muted-foreground text-sm mt-4">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to chat
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupChat;
