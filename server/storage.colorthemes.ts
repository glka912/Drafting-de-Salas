import { ColorTheme, InsertColorTheme } from "@shared/schema";

// Color Theme Methods for MemStorage
export function getColorThemes(colorThemes: Map<number, ColorTheme>): Promise<ColorTheme[]> {
  return Promise.resolve(Array.from(colorThemes.values()));
}

export function getColorThemeById(colorThemes: Map<number, ColorTheme>, id: number): Promise<ColorTheme | undefined> {
  return Promise.resolve(colorThemes.get(id));
}

export function getDefaultColorTheme(colorThemes: Map<number, ColorTheme>): Promise<ColorTheme | undefined> {
  return Promise.resolve(Array.from(colorThemes.values()).find(theme => theme.isDefault));
}

export function createColorTheme(
  colorThemes: Map<number, ColorTheme>, 
  theme: InsertColorTheme, 
  colorThemeId: number
): Promise<ColorTheme> {
  const id = colorThemeId;
  const newTheme: ColorTheme = { 
    ...theme, 
    id,
    // Ensure isDefault is always a boolean
    isDefault: theme.isDefault === undefined ? false : theme.isDefault 
  };
  
  // If this is the first theme or it's set as default
  if (colorThemes.size === 0 || newTheme.isDefault) {
    // Set all other themes to non-default
    if (newTheme.isDefault) {
      // Use Array.from to work with the entries more safely
      Array.from(colorThemes.entries()).forEach(([themeId, existingTheme]) => {
        if (existingTheme.isDefault) {
          colorThemes.set(themeId, { ...existingTheme, isDefault: false });
        }
      });
    }
    
    // Make this theme default if it's the first one
    if (colorThemes.size === 0 && !newTheme.isDefault) {
      newTheme.isDefault = true;
    }
  }
  
  colorThemes.set(id, newTheme);
  return Promise.resolve(newTheme);
}

export function updateColorTheme(
  colorThemes: Map<number, ColorTheme>, 
  id: number, 
  themeUpdate: Partial<InsertColorTheme>
): Promise<ColorTheme | undefined> {
  const theme = colorThemes.get(id);
  
  if (!theme) {
    return Promise.resolve(undefined);
  }
  
  const updatedTheme: ColorTheme = { ...theme, ...themeUpdate };
  
  // Handle default theme changes
  if (themeUpdate.isDefault && themeUpdate.isDefault !== theme.isDefault) {
    // Set all other themes to non-default
    Array.from(colorThemes.entries()).forEach(([themeId, existingTheme]) => {
      if (themeId !== id && existingTheme.isDefault) {
        colorThemes.set(themeId, { ...existingTheme, isDefault: false });
      }
    });
  }
  
  colorThemes.set(id, updatedTheme);
  return Promise.resolve(updatedTheme);
}

export function deleteColorTheme(
  colorThemes: Map<number, ColorTheme>, 
  id: number
): Promise<boolean> {
  const theme = colorThemes.get(id);
  
  if (!theme) {
    return Promise.resolve(false);
  }
  
  // Don't allow deleting the default theme
  if (theme.isDefault) {
    return Promise.reject(new Error("Cannot delete the default color theme"));
  }
  
  return Promise.resolve(colorThemes.delete(id));
}

export function setDefaultColorTheme(
  colorThemes: Map<number, ColorTheme>, 
  id: number
): Promise<ColorTheme | undefined> {
  const theme = colorThemes.get(id);
  
  if (!theme) {
    return Promise.resolve(undefined);
  }
  
  // Set all themes to non-default
  Array.from(colorThemes.entries()).forEach(([themeId, existingTheme]) => {
    if (existingTheme.isDefault) {
      colorThemes.set(themeId, { ...existingTheme, isDefault: false });
    }
  });
  
  // Set this theme as default
  const updatedTheme: ColorTheme = { ...theme, isDefault: true };
  colorThemes.set(id, updatedTheme);
  
  return Promise.resolve(updatedTheme);
}

// Initialize sample color themes
export function initializeColorThemes(
  colorThemes: Map<number, ColorTheme>, 
  colorThemeId: number
): number {
  let nextId = colorThemeId;
  
  const themesData: InsertColorTheme[] = [
    {
      name: "Dark Mode",
      description: "Dark theme with blue accents",
      primaryColor: "#3B82F6",    // Blue
      secondaryColor: "#1E40AF",  // Darker blue
      accentColor: "#F59E0B",     // Amber
      backgroundColor: "#1F2937", // Dark gray
      textColor: "#F9FAFB",       // White
      isDefault: true
    },
    {
      name: "Light Mode",
      description: "Light theme with purple accents",
      primaryColor: "#8B5CF6",    // Purple
      secondaryColor: "#6D28D9",  // Darker purple
      accentColor: "#10B981",     // Emerald
      backgroundColor: "#F9FAFB", // White
      textColor: "#111827",       // Black
      isDefault: false
    },
    {
      name: "Sunset",
      description: "Warm oranges and reds",
      primaryColor: "#F97316",    // Orange
      secondaryColor: "#C2410C",  // Dark orange
      accentColor: "#EF4444",     // Red
      backgroundColor: "#FFFBEB", // Light yellow
      textColor: "#7C2D12",       // Brown
      isDefault: false
    }
  ];
  
  themesData.forEach((themeData) => {
    const id = nextId++;
    // Ensure isDefault is always a boolean
    const theme: ColorTheme = { 
      ...themeData, 
      id,
      isDefault: themeData.isDefault === undefined ? false : themeData.isDefault 
    };
    colorThemes.set(id, theme);
  });
  
  return nextId;
}