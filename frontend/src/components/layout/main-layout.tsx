import { Sidebar } from "./sidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background/95 backdrop-blur z-10 shrink-0">
          <div className="flex items-center gap-4 w-96 relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input 
              placeholder="Search documents, nodes..." 
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
