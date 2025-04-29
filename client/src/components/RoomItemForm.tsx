import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { 
  RoomItemWithDetails, 
  RoomItem, 
  insertRoomItemSchema, 
  Item, 
  insertItemSchema 
} from "@shared/schema";
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
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Upload, Percent } from "lucide-react";

// Rarity options
const rarityOptions = [
  "Comum",
  "Incomum",
  "Raro",
  "Épico",
  "Lendário"
];

// Create a form schema that combines item and room-item properties
const formSchema = z.object({
  // Item properties
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional().or(z.string().min(1)), // Make description optional
  imageUrl: z.string().min(1, "Uma imagem é necessária"),
  rarity: z.string(),
  
  // Room-item properties
  roomId: z.number(),
  itemId: z.number().optional(),
  probability: z.number().min(1).max(100).default(100),
  canRepeat: z.boolean().default(true),
  maxRepeats: z.number().min(1).max(10).default(1),
  isGuaranteed: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

interface RoomItemFormProps {
  item: RoomItemWithDetails | null;
  roomId: number;
  onClose: () => void;
}

export default function RoomItemForm({ item, roomId, onClose }: RoomItemFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(item?.item?.imageUrl || null);
  const [probability, setProbability] = useState<number>(item?.probability || 100);
  const [selectedExistingItem, setSelectedExistingItem] = useState<number | null>(item?.itemId || null);
  const [createNewItem, setCreateNewItem] = useState(!item);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch available global items for selection
  const { data: allItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/items'],
    select: (data: Item[]) => data,
  });
  
  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.item?.name || "",
      description: item?.item?.description || "",
      imageUrl: item?.item?.imageUrl || "",
      rarity: item?.item?.rarity || "Common",
      roomId: roomId,
      itemId: item?.itemId,
      probability: item?.probability || 100,
      canRepeat: item?.canRepeat !== undefined ? item.canRepeat : true,
      maxRepeats: item?.maxRepeats || 1,
      isGuaranteed: item?.isGuaranteed !== undefined ? item.isGuaranteed : false
    }
  });

  // Create mutation for adding an item
  const createItemMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest({
        url: `/api/rooms/${roomId}/items`,
        method: 'POST',
        body: data
      });
      // No need to try to parse JSON, the apiRequest already returns the parsed response
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomId}/items`] });
      toast({
        title: "Item criado",
        description: "O item foi criado com sucesso.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to create item:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar o item. Por favor, verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Update mutation for editing an item
  const updateItemMutation = useMutation({
    mutationFn: async (data: { id: number; values: FormValues }) => {
      const response = await apiRequest({
        url: `/api/room-items/${data.id}`,
        method: 'PATCH',
        body: data.values
      });
      // No need to try to parse JSON, the apiRequest already returns the parsed response
      return response;
    },
    onSuccess: (response) => {
      console.log("Update successful, response:", response);
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomId}/items`] });
      toast({
        title: "Item atualizado",
        description: "O item foi atualizado com sucesso.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update item:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar o item. Por favor, verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Update form when selecting an existing item
  const handleExistingItemSelect = (itemId: number) => {
    if (!allItems) return;
    
    // Find the selected item
    const selectedItem = allItems.find(item => item.id === itemId);
    if (!selectedItem) return;
    
    // Update form fields with the selected item's data
    form.setValue('name', selectedItem.name);
    form.setValue('description', selectedItem.description || '');
    form.setValue('imageUrl', selectedItem.imageUrl);
    form.setValue('rarity', selectedItem.rarity);
    form.setValue('itemId', selectedItem.id);
    
    // Update preview image
    setPreviewImage(selectedItem.imageUrl);
    
    // Update selected item state
    setSelectedExistingItem(itemId);
    setCreateNewItem(false);
  };
  
  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    // Common room item properties (probability, canRepeat, maxRepeats, isGuaranteed)
    const roomItemData = {
      roomId: values.roomId,
      probability: values.probability,
      canRepeat: values.canRepeat,
      maxRepeats: values.maxRepeats,
      isGuaranteed: values.isGuaranteed
    };
    
    if (item) {
      // Update existing room-item assignment with full data
      console.log("Updating item:", item.id, {
        ...values,
        // If using an existing item, include the itemId
        itemId: selectedExistingItem || item.itemId
      });
      
      updateItemMutation.mutate({ 
        id: item.id, 
        values: {
          ...values,
          // If using an existing item, include the itemId
          itemId: selectedExistingItem || item.itemId,
          name: values.name,
          description: values.description,
          imageUrl: values.imageUrl,
          rarity: values.rarity
        } 
      });
    } else {
      // Create new item or assign existing item to room
      if (createNewItem) {
        try {
          // First, create a new global item
          const newItemResponse = await apiRequest({
            url: '/api/items',
            method: 'POST',
            body: {
              name: values.name,
              description: values.description,
              imageUrl: values.imageUrl,
              rarity: values.rarity
            }
          });
          
          // Then assign it to the room
          const assignData = {
            ...roomItemData,
            itemId: newItemResponse.id, // Use the ID of the newly created item
            // Include these values to satisfy the type system
            name: values.name,
            description: values.description || "",
            imageUrl: values.imageUrl,
            rarity: values.rarity,
            isGuaranteed: values.isGuaranteed
          };
          createItemMutation.mutate(assignData);
        } catch (error) {
          console.error("Failed to create and assign new item:", error);
          toast({
            title: "Error",
            description: "Failed to create new item. Please try again.",
            variant: "destructive",
          });
        }
      } else if (selectedExistingItem) {
        // Find the selected item to get its details
        const selectedItem = allItems?.find(i => i.id === selectedExistingItem);
        if (!selectedItem) {
          toast({
            title: "Error",
            description: "Selected item not found.",
            variant: "destructive",
          });
          return;
        }
        
        // Assign existing item to room
        const existingItemData = {
          ...roomItemData,
          itemId: selectedExistingItem,
          // Include the required fields from the selected item
          name: selectedItem.name,
          description: selectedItem.description || '',
          imageUrl: selectedItem.imageUrl,
          rarity: selectedItem.rarity,
          isGuaranteed: values.isGuaranteed
        };
        console.log("Assigning existing item to room:", existingItemData);
        createItemMutation.mutate(existingItemData);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, crie um novo item ou selecione um existente.",
          variant: "destructive",
        });
      }
    }
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
        title: "Imagem enviada",
        description: "A imagem foi enviada com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Failed to upload image:", error);
      setIsUploading(false);
      
      toast({
        title: "Erro",
        description: "Falha ao enviar a imagem. Certifique-se de que é um arquivo JPEG ou PNG e tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Handle file selection
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
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Make sure form field exists and has expected type
  useEffect(() => {
    // Ensure probability has a value when component loads
    if (form.getValues("probability") === undefined) {
      form.setValue("probability", 100);
    }
    
    // Update local state to match form value
    setProbability(form.getValues("probability") || 100);
  }, [form]);
  
  // Update the sliders and form value when slider changes
  const handleProbabilityChange = (value: number[]) => {
    const newValue = value[0];
    setProbability(newValue);
    form.setValue("probability", newValue);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{item ? "Editar Item" : "Criar Novo Item"}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 pb-4">
          {/* Item Source Selection */}
          {!item && (
            <div className="mb-6 border border-slate-700 rounded-lg p-4 bg-slate-800/50">
              <h3 className="text-lg font-semibold mb-3">Origem do Item</h3>
              <div className="flex gap-4 mb-4">
                <Button 
                  type="button"
                  variant={createNewItem ? "default" : "outline"}
                  onClick={() => setCreateNewItem(true)}
                  className={`flex-1 ${createNewItem ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                >
                  Criar Novo Item
                </Button>
                <Button 
                  type="button"
                  variant={!createNewItem ? "default" : "outline"}
                  onClick={() => setCreateNewItem(false)}
                  className={`flex-1 ${!createNewItem ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                >
                  Usar Item Existente
                </Button>
              </div>
              
              {!createNewItem && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Selecionar Item
                  </label>
                  {isLoadingItems ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                    </div>
                  ) : allItems && allItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                      {allItems.map((globalItem) => (
                        <div 
                          key={globalItem.id}
                          onClick={() => handleExistingItemSelect(globalItem.id)}
                          className={`cursor-pointer p-2 border rounded-md transition-all ${selectedExistingItem === globalItem.id 
                            ? 'border-indigo-500 bg-indigo-500/20' 
                            : 'border-slate-600 hover:border-slate-400'}`}
                        >
                          <div className="flex gap-2 items-center">
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img 
                                src={globalItem.imageUrl} 
                                alt={globalItem.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium truncate">{globalItem.name}</div>
                              <div className="text-xs text-slate-400">{globalItem.rarity}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 border border-dashed border-slate-600 rounded-md">
                      Nenhum item disponível. Crie um novo item.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Item Details - Only show if creating a new item or editing an existing one */}
          {(createNewItem || item) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Item</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do item" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rarity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raridade</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {rarityOptions.map((rarity) => (
                            <option key={rarity} value={rarity}>
                              {rarity}
                            </option>
                          ))}
                        </select>
                      </FormControl>
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Digite a descrição do item (opcional)" {...field} />
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
                    <FormLabel>Imagem do Item</FormLabel>
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
                            alt="Item preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          
          <div className="space-y-4 border border-slate-700 rounded-lg p-4 mt-2 bg-slate-800/50">
            <h3 className="text-lg font-semibold">Configurações de Aleatorização</h3>
            
            <FormField
              control={form.control}
              name="isGuaranteed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-700 p-4 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // Se marcar como garantido, define probabilidade como 100 e desabilita o slider
                        if (checked) {
                          form.setValue("probability", 100);
                          setProbability(100);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Item Garantido</FormLabel>
                    <FormDescription>
                      Se marcado, este item sempre aparecerá na sala, independente do total de itens exibidos
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem className={form.watch("isGuaranteed") ? "opacity-50 pointer-events-none" : ""}>
                  <FormLabel>Probabilidade de Aparecimento ({probability}%)</FormLabel>
                  <FormDescription>
                    Qual a probabilidade deste item aparecer quando a sala for selecionada
                  </FormDescription>
                  <FormControl>
                    <div className="pt-2">
                      <Slider
                        defaultValue={[field.value || 100]}
                        max={100}
                        min={1}
                        step={1}
                        onValueChange={handleProbabilityChange}
                        className="bg-slate-700 data-[state=active]:bg-indigo-600"
                        disabled={form.watch("isGuaranteed")}
                      />
                    </div>
                  </FormControl>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400">Menos provável</span>
                    <span className="text-xs text-slate-400">Mais provável</span>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="canRepeat"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-700 p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Permitir Repetição</FormLabel>
                    <FormDescription>
                      Se marcado, este item pode aparecer várias vezes quando a sala for selecionada
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
          
          {/* Max Repeats Control - Show only if canRepeat is true */}
          <FormField
            control={form.control}
            name="maxRepeats"
            render={({ field }) => (
              <FormItem className={!form.watch("canRepeat") ? "opacity-50 pointer-events-none" : ""}>
                <div className="flex flex-col space-y-2">
                  <FormLabel>Número máximo de repetições:</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        value={field.value}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 10) {
                            field.onChange(value);
                          }
                        }}
                        disabled={!form.watch("canRepeat")}
                        className="w-24 text-center"
                      />
                      <div className="flex flex-col">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 py-0"
                          onClick={() => {
                            if (field.value < 10 && form.watch("canRepeat")) {
                              field.onChange(field.value + 1);
                            }
                          }}
                          disabled={field.value >= 10 || !form.watch("canRepeat")}
                          aria-label="Aumentar repetições máximas"
                        >
                          ▲
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 py-0"
                          onClick={() => {
                            if (field.value > 1 && form.watch("canRepeat")) {
                              field.onChange(field.value - 1);
                            }
                          }}
                          disabled={field.value <= 1 || !form.watch("canRepeat")}
                          aria-label="Diminuir repetições máximas"
                        >
                          ▼
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Número máximo de vezes que este item pode aparecer na sala (1-10)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <input type="hidden" name="roomId" value={roomId} />
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {createItemMutation.isPending || updateItemMutation.isPending ? (
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></span>
                  {item ? "Atualizando..." : "Criando..."}
                </span>
              ) : (
                <span>{item ? "Atualizar Item" : "Criar Item"}</span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}