import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Room, insertRoomSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Upload, Image } from "lucide-react";

// Define icon options
const iconOptions = [
  { value: "coins", label: "Coins" },
  { value: "heart", label: "Heart" },
  { value: "play", label: "Play" },
  { value: "bookmark", label: "Bookmark" },
  { value: "flame", label: "Flame" },
  { value: "cubes", label: "Cubes" },
  { value: "lightbulb", label: "Lightbulb" }
];

// Define default HEX color options
const colorOptions = [
  { value: "#ef4444", label: "Red" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#eab308", label: "Yellow" }
];

// Function to get color name from hex value
const getColorNameFromHex = (hex: string): string => {
  const color = colorOptions.find(c => c.value.toLowerCase() === hex.toLowerCase());
  return color ? color.label : "Custom";
};

// Extend the insert schema with validation
const formSchema = insertRoomSchema.extend({
  // Add additional validation
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().min(1, "An image is required"),
  interiorImageUrl: z.string().optional(),
  probability: z.number().min(1).max(100),
  itemsToShow: z.number().min(0).max(10), // Permitir valor 0 explicitamente
  randomizeRepeats: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface RoomFormProps {
  room: Room | null;
  onClose: () => void;
}

export default function RoomForm({ room, onClose }: RoomFormProps) {
  const [probability, setProbability] = useState(room?.probability || 20);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingInterior, setIsUploadingInterior] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(room?.imageUrl || null);
  const [previewInteriorImage, setPreviewInteriorImage] = useState<string | null>(room?.interiorImageUrl || null);
  const [previewColor, setPreviewColor] = useState<string>(room?.color || "#3b82f6");
  const [colorName, setColorName] = useState<string>(() => {
    // Initialize from localStorage if available
    if (room?.color) {
      const savedNames = localStorage.getItem('roomColorNames');
      if (savedNames) {
        try {
          const namesMap = JSON.parse(savedNames);
          if (namesMap[room.color]) {
            return namesMap[room.color];
          }
        } catch (error) {
          console.error("Error parsing saved color names:", error);
        }
      }
    }
    return "";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const interiorFileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: room?.name || "",
      description: room?.description || "",
      probability: room?.probability || 20,
      rarity: room?.rarity || "Raridade Média",
      imageUrl: room?.imageUrl || "",
      interiorImageUrl: room?.interiorImageUrl || "",
      color: room?.color || "#3b82f6", // Default blue hex color
      icon: room?.icon || "coins",
      itemsToShow: room?.itemsToShow || 3,
      randomizeRepeats: room?.randomizeRepeats !== undefined ? room.randomizeRepeats : true
    }
  });

  // Create mutation for adding a room
  const createRoomMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest({
        url: '/api/rooms',
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "Room created",
        description: "The room has been successfully created.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  });

  // Update mutation for editing a room
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { id: number; values: FormValues }) => {
      return apiRequest({
        url: `/api/rooms/${data.id}`,
        method: 'PATCH',
        body: data.values
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "Room updated",
        description: "The room has been successfully updated.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update room:", error);
      toast({
        title: "Error",
        description: "Failed to update room. Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    // Save color name to localStorage if provided
    if (colorName.trim() && values.color) {
      try {
        const savedNames = localStorage.getItem('roomColorNames') || '{}';
        const namesMap = JSON.parse(savedNames);
        namesMap[values.color] = colorName.trim();
        localStorage.setItem('roomColorNames', JSON.stringify(namesMap));
      } catch (error) {
        console.error("Error saving color name:", error);
      }
    }

    if (room) {
      // Update existing room
      updateRoomMutation.mutate({ id: room.id, values });
    } else {
      // Create new room
      createRoomMutation.mutate(values);
    }
  };

  // Update the sliders and form value when slider changes
  const handleProbabilityChange = (value: number[]) => {
    const newValue = value[0];
    setProbability(newValue);
    form.setValue("probability", newValue);
  };

  // Determine rarity based on probability
  const getRarityFromProbability = (prob: number): string => {
    if (prob <= 5) return "Raridade Lendária";
    if (prob <= 10) return "Raridade Muito Alta";
    if (prob <= 20) return "Raridade Alta";
    if (prob <= 40) return "Raridade Média";
    if (prob <= 70) return "Raridade Comum";
    return "Raridade Muito Comum";
  };

  // Update rarity when probability changes (only if user hasn't manually entered a value)
  const updateRarity = (prob: number) => {
    const currentRarity = form.getValues("rarity");
    // Verifica se o valor atual é uma das strings de raridade padrão ou está vazio
    const isStandardRarity = 
      currentRarity === "Raridade Lendária" || 
      currentRarity === "Raridade Muito Alta" ||
      currentRarity === "Raridade Alta" ||
      currentRarity === "Raridade Média" ||
      currentRarity === "Raridade Comum" ||
      currentRarity === "Raridade Muito Comum" ||
      currentRarity === "" ||
      !currentRarity;
    
    // Só atualiza automaticamente se for uma raridade padrão
    if (isStandardRarity) {
      const rarity = getRarityFromProbability(prob);
      form.setValue("rarity", rarity);
    }
  };

  // Handle probability blur to update rarity
  const handleProbabilityBlur = () => {
    const probValue = form.getValues("probability");
    updateRarity(probValue);
  };
  
  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update the form with the new image URL
      form.setValue('imageUrl', data.url);
      setPreviewImage(data.url);
      setIsUploading(false);
      
      toast({
        title: "Image uploaded",
        description: "The image has been successfully uploaded.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Failed to upload image:", error);
      setIsUploading(false);
      
      toast({
        title: "Error",
        description: "Failed to upload image. Please make sure it's a JPEG or PNG file and try again.",
        variant: "destructive",
      });
    }
  });
  
  // Upload interior image mutation
  const uploadInteriorImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload interior image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update the form with the new image URL
      form.setValue('interiorImageUrl', data.url);
      setPreviewInteriorImage(data.url);
      setIsUploadingInterior(false);
      
      toast({
        title: "Interior image uploaded",
        description: "The interior image has been successfully uploaded.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Failed to upload interior image:", error);
      setIsUploadingInterior(false);
      
      toast({
        title: "Error",
        description: "Failed to upload interior image. Please make sure it's a JPEG or PNG file and try again.",
        variant: "destructive",
      });
    }
  });

  // Handle file selection for room cover image
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Check if the file is a JPEG or PNG
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg' && file.type !== 'image/png') {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione um arquivo de imagem JPEG ou PNG (.jpg, .jpeg ou .png).",
        variant: "destructive",
      });
      return;
    }
    
    // Create a FormData object and append the file
    const formData = new FormData();
    formData.append('image', file);
    
    // Upload the image
    setIsUploading(true);
    uploadImageMutation.mutate(formData);
  };
  
  // Handle file selection for interior image
  const handleInteriorFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Check if the file is a JPEG or PNG
    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg' && file.type !== 'image/png') {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione um arquivo de imagem JPEG ou PNG (.jpg, .jpeg ou .png).",
        variant: "destructive",
      });
      return;
    }
    
    // Create a FormData object and append the file
    const formData = new FormData();
    formData.append('image', file);
    
    // Upload the image
    setIsUploadingInterior(true);
    uploadInteriorImageMutation.mutate(formData);
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Trigger interior file input click
  const handleInteriorUploadClick = () => {
    interiorFileInputRef.current?.click();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{room ? "Editar Sala" : "Criar Nova Sala"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Sala</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da sala" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem da Sala</FormLabel>
                  <div className="flex flex-col gap-2">
                    <FormControl>
                      <div className="flex gap-2">
                        <input
                          type="hidden"
                          {...field}
                        />
                        <Button 
                          type="button" 
                          onClick={handleUploadClick}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <span className="flex items-center justify-center">
                              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                              Enviando...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center">
                              <Upload className="mr-2 h-4 w-4" />
                              {field.value ? "Alterar Imagem" : "Enviar Imagem JPEG/PNG"}
                            </span>
                          )}
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                        />
                      </div>
                    </FormControl>
                    {(previewImage || field.value) && (
                      <div className="relative mt-2 border border-slate-700 rounded-md overflow-hidden h-[150px]">
                        <img 
                          src={previewImage || field.value} 
                          alt="Room preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Digite a descrição da sala" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="interiorImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imagem do Interior da Sala</FormLabel>
                <FormDescription>
                  Envie uma imagem do interior da sala, que será mostrada quando um usuário selecionar esta sala
                </FormDescription>
                <div className="flex flex-col gap-2">
                  <FormControl>
                    <div className="flex gap-2">
                      <input
                        type="hidden"
                        {...field}
                      />
                      <Button 
                        type="button" 
                        onClick={handleInteriorUploadClick}
                        disabled={isUploadingInterior}
                        className="w-full"
                      >
                        {isUploadingInterior ? (
                          <span className="flex items-center justify-center">
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                            Enviando...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Image className="mr-2 h-4 w-4" />
                            {field.value ? "Alterar Imagem do Interior" : "Enviar Imagem do Interior (JPEG/PNG)"}
                          </span>
                        )}
                      </Button>
                      <input
                        type="file"
                        ref={interiorFileInputRef}
                        onChange={handleInteriorFileChange}
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  {(previewInteriorImage || field.value) && (
                    <div className="relative mt-2 border border-slate-700 rounded-md overflow-hidden h-[200px]">
                      <img 
                        src={previewInteriorImage || field.value} 
                        alt="Room interior preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor da Sala (HEX)</FormLabel>
                  <div className="flex gap-2 items-center">
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
                            setPreviewColor(e.target.value);
                          }}
                          placeholder="#RRGGBB"
                        />
                        <Input
                          type="color"
                          value={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setPreviewColor(e.target.value);
                          }}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Escolha um código de cor HEX (ex: #3b82f6 para azul)
                  </FormDescription>
                  <div className="mt-2">
                    <FormLabel>Nome da Cor (Opcional)</FormLabel>
                    <Input 
                      placeholder="Digite um nome para esta cor"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      className="mt-1"
                    />
                    <FormDescription>
                      Este nome será exibido na tabela em vez do valor HEX
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar ícone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {iconOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probabilidade ({probability}%)</FormLabel>
                <FormControl>
                  <div className="pt-2">
                    <Slider
                      defaultValue={[field.value]}
                      max={100}
                      min={1}
                      step={1}
                      onValueChange={handleProbabilityChange}
                      onValueCommit={() => updateRarity(probability)}
                      className="bg-slate-700 slider-range"
                      style={{ 
                        "--slider-active-bg": previewColor 
                      } as React.CSSProperties}
                    />
                  </div>
                </FormControl>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400">Menos provável</span>
                  <span className="text-xs text-slate-400">Mais provável</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rarity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Raridade</FormLabel>
                  <FormControl>
                    <Input placeholder="Nível de raridade" {...field} />
                  </FormControl>
                  <FormDescription>
                    Você pode personalizar o nível de raridade com seu próprio texto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="itemsToShow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Itens a Mostrar</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Número de itens" 
                      {...field} 
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        // Permitir valor 0 ou valores positivos
                        const finalValue = isNaN(value) ? 0 : value;
                        field.onChange(finalValue);
                      }}
                      min={0}
                      max={10}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantos itens aleatórios serão exibidos quando esta sala for selecionada (0 para não mostrar nenhum item)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="randomizeRepeats"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Aleatorizar Repetições</FormLabel>
                  <FormDescription>
                    Se marcado, a repetição de itens será completamente aleatória. Caso contrário, cada item só poderá se repetir até seu valor máximo de repetição.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="text-white"
              style={{ 
                backgroundColor: previewColor,
                opacity: (createRoomMutation.isPending || updateRoomMutation.isPending) ? 0.7 : 1 
              }}
              disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
            >
              {createRoomMutation.isPending || updateRoomMutation.isPending ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  {room ? "Atualizando..." : "Criando..."}
                </span>
              ) : (
                <span>{room ? "Atualizar Sala" : "Criar Sala"}</span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}