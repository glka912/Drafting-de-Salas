import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { ColorTheme } from "../pages/ManageColorThemes";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().min(5, "Description must be at least 5 characters").max(500),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code"),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code"),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code"),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code"),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code"),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ColorThemeFormProps {
  theme: ColorTheme | null;
  onClose: () => void;
}

export default function ColorThemeForm({ theme, onClose }: ColorThemeFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State for name-only editing
  const [nameOnly, setNameOnly] = useState(false);
  
  // State for live preview
  const [previewColors, setPreviewColors] = useState({
    primaryColor: theme?.primaryColor || "#4f46e5",
    secondaryColor: theme?.secondaryColor || "#8b5cf6",
    accentColor: theme?.accentColor || "#f97316",
    backgroundColor: theme?.backgroundColor || "#ffffff",
    textColor: theme?.textColor || "#111827",
  });

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: theme?.name || "",
      description: theme?.description || "",
      primaryColor: theme?.primaryColor || "#4f46e5",
      secondaryColor: theme?.secondaryColor || "#8b5cf6",
      accentColor: theme?.accentColor || "#f97316",
      backgroundColor: theme?.backgroundColor || "#ffffff",
      textColor: theme?.textColor || "#111827",
      isDefault: theme?.isDefault || false,
    },
  });

  // Create color theme mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest({
        url: '/api/color-themes',
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/color-themes'] });
      toast({
        title: "Success",
        description: "Color theme created successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create color theme:", error);
      toast({
        title: "Error",
        description: "Failed to create color theme",
        variant: "destructive",
      });
    },
  });

  // Update color theme mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; values: FormValues }) => {
      return apiRequest({
        url: `/api/color-themes/${data.id}`,
        method: "PATCH",
        body: data.values
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/color-themes'] });
      toast({
        title: "Success",
        description: "Color theme updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update color theme:", error);
      toast({
        title: "Error",
        description: "Failed to update color theme",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    // If name-only mode is active and we're editing an existing theme
    if (nameOnly && theme) {
      // Only update the name and keep other properties the same
      const nameOnlyValues = {
        ...theme,
        name: values.name
      };
      updateMutation.mutate({ id: theme.id, values: nameOnlyValues });
    } else if (theme) {
      // Normal update with all values
      updateMutation.mutate({ id: theme.id, values });
    } else {
      // Creating a new theme
      createMutation.mutate(values);
    }
  };

  // Update preview colors when form values change
  const handleColorChange = (field: keyof typeof previewColors, value: string) => {
    setPreviewColors(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {theme && (
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mb-4">
                <div className="space-y-0.5">
                  <FormLabel>Edit Name Only</FormLabel>
                  <FormDescription>
                    Toggle this to only edit the theme name and keep all colors unchanged
                  </FormDescription>
                </div>
                <Switch
                  checked={nameOnly}
                  onCheckedChange={setNameOnly}
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dark Mode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!nameOnly && (
              <>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your theme..." 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Set as Default Theme</FormLabel>
                        <FormDescription>
                          This theme will be used as the default for all users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
          
          {!nameOnly && (
            <div 
              className="rounded-lg overflow-hidden shadow-lg border"
              style={{ 
                backgroundColor: previewColors.backgroundColor,
                color: previewColors.textColor
              }}
            >
              <div className="p-4 font-medium text-lg border-b"
                style={{ backgroundColor: previewColors.primaryColor, color: "#fff" }}
              >
                Theme Preview
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium">Main Colors</h3>
                  <div className="flex gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Primary</FormLabel>
                          <div className="flex gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value }}
                            ></div>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input 
                                  {...field} 
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleColorChange('primaryColor', e.target.value);
                                  }}
                                  placeholder="#RRGGBB"
                                />
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleColorChange('primaryColor', e.target.value);
                                  }}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </div>
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Secondary</FormLabel>
                          <div className="flex gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value }}
                            ></div>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input 
                                  {...field} 
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleColorChange('secondaryColor', e.target.value);
                                  }}
                                  placeholder="#RRGGBB"
                                />
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleColorChange('secondaryColor', e.target.value);
                                  }}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </div>
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Accent Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-8 h-8 rounded border" 
                          style={{ backgroundColor: field.value }}
                        ></div>
                        <FormControl>
                          <div className="flex space-x-2">
                            <Input 
                              {...field} 
                              type="text"
                              onChange={(e) => {
                                field.onChange(e);
                                handleColorChange('accentColor', e.target.value);
                              }}
                              placeholder="#RRGGBB"
                            />
                            <Input
                              type="color"
                              value={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                handleColorChange('accentColor', e.target.value);
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <h3 className="font-medium">Background Colors</h3>
                  <div className="flex gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="backgroundColor"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Background</FormLabel>
                          <div className="flex gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value }}
                            ></div>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input 
                                  {...field} 
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleColorChange('backgroundColor', e.target.value);
                                  }}
                                  placeholder="#RRGGBB"
                                />
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleColorChange('backgroundColor', e.target.value);
                                  }}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </div>
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="textColor"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Text</FormLabel>
                          <div className="flex gap-2">
                            <div 
                              className="w-8 h-8 rounded border" 
                              style={{ backgroundColor: field.value }}
                            ></div>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input 
                                  {...field} 
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleColorChange('textColor', e.target.value);
                                  }}
                                  placeholder="#RRGGBB"
                                />
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.value);
                                    handleColorChange('textColor', e.target.value);
                                  }}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                />
                              </div>
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: previewColors.secondaryColor, color: '#fff' }}>
                    Button Example
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span style={{ color: previewColors.accentColor }}>Accent text</span>
                    <span>Normal text</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : (theme ? "Update" : "Create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}