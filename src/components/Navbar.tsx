import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, LogIn, LogOut, MessageSquare, Trophy, Users, Vote, User } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navLinks = [
  { label: "Anime", to: "/browse" },
  { label: "Manga", to: "/manga" },
  { label: "Groups", to: "/groups" },
  { label: "Vote", to: "/vote" },
  { label: "Debates", to: "/debates" },
  { label: "Watch Party", to: "/watch-together" },
  { label: "Leaderboard", to: "/leaderboard" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground text-sm">N</span>
          </div>
          <span className="font-display font-bold text-lg text-foreground">NexusVerse</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.to ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/browse" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Search className="w-4 h-4" />
          </Link>
          {user && (
            <>
              <Link to="/messages" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <MessageSquare className="w-4 h-4" />
              </Link>
              <Link to="/profile" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <User className="w-4 h-4" />
              </Link>
            </>
          )}
          {user ? (
            <button onClick={handleLogout} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link to="/auth" className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <LogIn className="w-4 h-4" />
            </Link>
          )}
          <button
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border"
          >
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium py-2 ${location.pathname === l.to ? "text-primary" : "text-muted-foreground"}`}>
                  {l.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link to="/messages" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 text-muted-foreground">Messages</Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 text-muted-foreground">Profile</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
