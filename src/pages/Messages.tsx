import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

const Messages = () => {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadProfiles = async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").neq("id", user.id);
      if (data) setProfiles(data);
    };
    loadProfiles();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUser) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    loadMessages();

    const channel = supabase
      .channel(`dm-${user.id}-${selectedUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user || !selectedUser) return;
    setLoading(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      body: body.trim(),
    });
    if (error) toast.error("Failed to send message");
    else setBody("");
    setLoading(false);
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to use messages</p>
          <Link to="/auth" className="text-primary hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const filteredProfiles = profiles.filter((p) =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl h-screen flex pt-16">
        {/* Sidebar - Instagram DM style */}
        <div className={`w-80 border-r border-border flex flex-col flex-shrink-0 ${selectedUser ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-9 pl-10 pr-3 rounded-lg bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedUser(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedUser?.id === p.id ? "bg-secondary" : "hover:bg-secondary/40"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold">{p.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{p.username}</span>
                  <span className="text-xs text-muted-foreground">Tap to chat</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area - Instagram style */}
        <div className={`flex-1 flex flex-col ${!selectedUser ? "hidden md:flex" : "flex"}`}>
          {selectedUser ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 h-[60px] border-b border-border flex-shrink-0">
                <button onClick={() => setSelectedUser(null)} className="md:hidden text-muted-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary text-sm font-bold">{selectedUser.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">{selectedUser.username}</span>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {groupedMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                      <Send className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground">Say hi to start chatting!</p>
                  </div>
                )}
                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                        {formatDateSeparator(group.msgs[0].created_at)}
                      </span>
                    </div>
                    {group.msgs.map((m, idx) => {
                      const isMe = m.sender_id === user.id;
                      const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                      const sameAsPrev = prevMsg && prevMsg.sender_id === m.sender_id;

                      return (
                        <div key={m.id} className={`flex mb-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`px-3.5 py-2 text-sm leading-relaxed ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-[20px] rounded-br-[4px]"
                                  : "bg-secondary text-secondary-foreground rounded-[20px] rounded-bl-[4px]"
                              }`}
                            >
                              {m.body}
                            </div>
                            {!sameAsPrev && (
                              <span className="text-[10px] text-muted-foreground mt-0.5 mx-2">
                                {formatTime(m.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Input area - Instagram style */}
              <div className="px-4 py-3 border-t border-border">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-secondary rounded-full px-4">
                    <input
                      type="text"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Message..."
                      className="flex-1 h-10 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {body.trim() ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="text-primary font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                    >
                      Send
                    </button>
                  ) : null}
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="w-20 h-20 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                <Send className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg text-foreground font-medium mt-2">Your Messages</p>
              <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
