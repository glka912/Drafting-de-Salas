import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColorTheme } from "@/pages/ManageColorThemes";
import { Link } from "wouter";

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentTheme, setThemeById } = useTheme();
  
  const { data: themes = [] } = useQuery<ColorTheme[]>({
    queryKey: ["/api/color-themes"],
  });

  if (themes.length === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          {currentTheme && (
            <span 
              className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-background" 
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Color Themes
        </div>
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.id}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setThemeById(theme.id);
              setOpen(false);
            }}
          >
            <div 
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: theme.primaryColor }}
            />
            <span>{theme.name}</span>
            {theme.isDefault && (
              <span className="ml-auto text-xs text-muted-foreground">Default</span>
            )}
          </DropdownMenuItem>
        ))}
        <div className="border-t border-border px-2 py-1.5 text-xs">
          <Link href="/manage/color-themes">
            <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              Manage themes
            </span>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}