import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import AnimeDetail from "./pages/AnimeDetail";
import WatchAnime from "./pages/WatchAnime";
import MangaBrowse from "./pages/MangaBrowse";
import MangaDetail from "./pages/MangaDetail";
import MangaReader from "./pages/MangaReader";
import Leaderboard from "./pages/Leaderboard";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Profile from "./pages/Profile";
import AnimeVoting from "./pages/AnimeVoting";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/watch/:id/:episode" element={<WatchAnime />} />
          <Route path="/manga" element={<MangaBrowse />} />
          <Route path="/manga/:id" element={<MangaDetail />} />
          <Route path="/manga/:mangaId/read/:chapterId" element={<MangaReader />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<GroupChat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/vote" element={<AnimeVoting />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
