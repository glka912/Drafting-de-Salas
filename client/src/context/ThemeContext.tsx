import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColorTheme } from "../pages/ManageColorThemes";

// Helper function to convert HEX color to HSL format for CSS variables
function hexToHsl(hex: string): string {
  // Remove the # if it exists
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Find the minimum and maximum values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  // Calculate lightness
  let l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    // Calculate saturation
    s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    
    // Calculate hue
    if (max === r) {
      h = ((g - b) / (max - min)) % 6;
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }
    
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  
  // Convert to CSS HSL format (hue saturation% lightness%)
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

interface ThemeContextType {
  currentTheme: ColorTheme | null;
  isLoading: boolean;
  setThemeById: (id: number) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: null,
  isLoading: true,
  setThemeById: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<number | null>(null);
  
  // Fetch all themes
  const { data: colorThemes = [], isLoading } = useQuery<ColorTheme[]>({
    queryKey: ["/api/color-themes"],
  });

  // Get the current theme
  const currentTheme = colorThemes.find(theme => 
    currentThemeId ? theme.id === currentThemeId : theme.isDefault
  ) || null;

  // Set theme in localStorage when it changes
  useEffect(() => {
    if (currentTheme) {
      localStorage.setItem('themeId', String(currentTheme.id));
    }
  }, [currentTheme]);

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedThemeId = localStorage.getItem('themeId');
    if (savedThemeId) {
      setCurrentThemeId(Number(savedThemeId));
    }
  }, []);

  // Apply theme CSS variables
  useEffect(() => {
    if (currentTheme) {
      const root = document.documentElement;
      
      // Set our custom theme variables
      root.style.setProperty('--primary-color', currentTheme.primaryColor);
      root.style.setProperty('--secondary-color', currentTheme.secondaryColor);
      root.style.setProperty('--accent-color', currentTheme.accentColor);
      root.style.setProperty('--background-color', currentTheme.backgroundColor);
      root.style.setProperty('--text-color', currentTheme.textColor);
      
      // Update card, button background, etc.
      document.body.style.backgroundColor = currentTheme.backgroundColor;
      document.body.style.color = currentTheme.textColor;
    }
  }, [currentTheme]);

  // Function to change the theme
  const setThemeById = (id: number) => {
    setCurrentThemeId(id);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, isLoading, setThemeById }}>
      {children}
    </ThemeContext.Provider>
  );
}