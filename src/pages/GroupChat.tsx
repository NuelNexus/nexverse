import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Users, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
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

    supabase.from("groups").select("name").eq("id", groupId).single().then(({ data }) => {
      if (data) setGroupName(data.name);
    });

    supabase.from("group_members").select("user_id").eq("group_id", groupId).then(({ data }) => {
      setMembers(data || []);
    });

    const loadMessages = async () => {
      const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
      if (data) {
        setMessages(data);
        const userIds = [...new Set(data.map((m: any) => m.user_id))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
          const map: Record<string, any> = {};
          profs?.forEach((p: any) => { map[p.id] = p; });
          setProfiles(map);
        }
      }
    };
    loadMessages();

    const channel = supabase.channel(`group-${groupId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
      async (payload) => {
        const msg = payload.new as Message;
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Instagram style */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-2xl flex items-center gap-3 h-14">
          <Link to="/groups" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{groupName}</h1>
            <p className="text-xs text-muted-foreground">{members.length} members</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-14 pb-20">
        <div className="container max-w-2xl px-4 py-4">
          {groupedMessages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-16">No messages yet. Say hi!</p>
          )}
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-4">
                <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                  {formatDateSeparator(group.msgs[0].created_at)}
                </span>
              </div>
              {group.msgs.map((msg, idx) => {
                const isMe = msg.user_id === user?.id;
                const profile = profiles[msg.user_id];
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                const showAvatar = !isMe && (!prevMsg || prevMsg.user_id !== msg.user_id);

                return (
                  <div key={msg.id} className={`flex items-end gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div className="w-7 flex-shrink-0">
                      {showAvatar && !isMe ? (
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">
                              {(profile?.username || "?")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      {showAvatar && !isMe && (
                        <span className="text-[11px] text-muted-foreground ml-1 mb-0.5">
                          {profile?.username || "User"}
                        </span>
                      )}
                      <div
                        className={`px-3.5 py-2 text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-[20px] rounded-br-[4px]"
                            : "bg-secondary text-secondary-foreground rounded-[20px] rounded-bl-[4px]"
                        }`}
                      >
                        {msg.body}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input - Instagram style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="container max-w-2xl py-2 px-4">
          {user ? (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-secondary rounded-full px-4">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 h-10 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              {body.trim() ? (
                <button type="submit" className="text-primary font-semibold text-sm hover:opacity-80">
                  Send
                </button>
              ) : null}
            </form>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-2">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to chat
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
