import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "./components/Navigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ManageRooms from "@/pages/ManageRooms";
import ManageItems from "@/pages/ManageItems";
import ManageColorThemes from "@/pages/ManageColorThemes";
import { ThemeProvider } from "./context/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/manage/rooms" component={ManageRooms} />
      <Route path="/manage/rooms/:id/items" component={ManageItems} />
      <Route path="/manage/color-themes" component={ManageColorThemes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              <Router />
            </main>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
