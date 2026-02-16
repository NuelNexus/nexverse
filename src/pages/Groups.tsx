import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

const Groups = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (data) {
      // Get member counts
      const { data: members } = await supabase.from("group_members").select("group_id");
      const counts: Record<string, number> = {};
      members?.forEach((m: any) => { counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
      setGroups(data.map((g: any) => ({ ...g, member_count: counts[g.id] || 0 })));
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in first"); return; }
    if (!name.trim()) return;

    const { data, error } = await supabase.from("groups").insert({
      name: name.trim(),
      description: description.trim() || null,
      created_by: user.id,
    }).select().single();

    if (error) { toast.error("Failed to create group"); return; }

    // Auto-join as admin
    await supabase.from("group_members").insert({
      group_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    toast.success("Group created!");
    setShowCreate(false);
    setName("");
    setDescription("");
    navigate(`/groups/${data.id}`);
  };

  const handleJoin = async (groupId: string) => {
    if (!user) { toast.error("Sign in first"); return; }
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
    });
    if (error?.code === "23505") { toast.info("Already a member"); navigate(`/groups/${groupId}`); return; }
    if (error) { toast.error("Failed to join"); return; }
    toast.success("Joined!");
    navigate(`/groups/${groupId}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Groups</h1>
          {user && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Create Group
            </button>
          )}
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="glass rounded-lg p-4 mb-6 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name..."
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-secondary text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Create
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No groups yet. Create one!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {groups.map((g) => (
              <div key={g.id} className="glass rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{g.name}</h3>
                  {g.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{g.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.member_count} members</span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoin(g.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4" /> Join / Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
