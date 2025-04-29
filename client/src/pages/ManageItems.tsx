import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Room, RoomItemWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import RoomItemForm from "@/components/RoomItemForm";

export default function ManageItems() {
  const [, params] = useRoute("/manage/rooms/:id/items");
  const roomId = params ? parseInt(params.id) : 0;
  const [selectedItem, setSelectedItem] = useState<RoomItemWithDetails | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch room details
  const roomQuery = useQuery({
    queryKey: [`/api/rooms/${roomId}`],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch room');
      }
      return response.json();
    },
    enabled: !!roomId
  });

  // Fetch room items
  const itemsQuery = useQuery({
    queryKey: [`/api/rooms/${roomId}/items`],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch room items');
      }
      return response.json();
    },
    enabled: !!roomId
  });

  // Update room mutation for itemsToShow field
  const updateRoomMutation = useMutation({
    mutationFn: async (data: { itemsToShow: number }) => {
      return apiRequest({
        url: `/api/rooms/${roomId}`,
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomId}`] });
      toast({
        title: "Room updated",
        description: "Number of items to display has been updated.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Failed to update room:", error);
      toast({
        title: "Error",
        description: "Failed to update room configuration. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest({
        url: `/api/room-items/${itemId}`,
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomId}/items`] });
      toast({
        title: "Item excluído",
        description: "O item foi excluído com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Failed to delete item:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir o item. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Handle item edit button click
  const handleEditItem = (item: RoomItemWithDetails) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  // Handle item delete button click
  const handleDeleteItem = (itemId: number) => {
    if (confirm("Tem certeza que deseja excluir este item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  // Handle adding a new item
  const handleAddItem = () => {
    setSelectedItem(null);
    setIsAddDialogOpen(true);
  };

  // Handle closing the add/edit dialogs
  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedItem(null);
  };

  // Update number of items to show
  const handleItemsToShowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value);
    
    // Permitir explicitamente valor 0 ou valores positivos até 10
    if (isNaN(value)) {
      value = 0;
    } else if (value < 0) {
      value = 0;
    } else if (value > 10) {
      value = 10;
    }
    
    updateRoomMutation.mutate({ itemsToShow: value });
  };

  // Loading states
  if (roomQuery.isLoading || itemsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Error states
  if (roomQuery.isError || itemsQuery.isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Falha ao carregar os dados da sala. Por favor, tente novamente mais tarde ou volte para a lista de salas.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/manage/rooms">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Salas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const room = roomQuery.data as Room;
  const items = itemsQuery.data as RoomItemWithDetails[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciar Itens para {room.name}</h1>
        <Link href="/manage/rooms">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Salas
          </Button>
        </Link>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Sala</CardTitle>
            <CardDescription>Configure como os itens aparecem nesta sala</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Sala</label>
              <div className="text-base">{room.name}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Raridade</label>
              <Badge variant="secondary">{room.rarity}</Badge>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="itemsToShow">
                Número de Itens para Exibir
              </label>
              <input
                id="itemsToShow"
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                min={0}
                max={10}
                value={room.itemsToShow !== undefined ? room.itemsToShow : 3}
                onChange={handleItemsToShowChange}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Número de itens aleatórios a serem exibidos quando esta sala for selecionada (0 para não mostrar nenhum item)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <img 
              src={room.imageUrl} 
              alt={room.name} 
              className="w-full h-[150px] object-cover rounded-md"
            />
          </CardFooter>
        </Card>
        
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Itens da Sala</CardTitle>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <RoomItemForm item={null} roomId={roomId} onClose={handleCloseAddDialog} />
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Gerencie os itens que podem aparecer nesta sala. 
                {room.itemsToShow === 0 
                  ? "Nenhum item será mostrado quando a sala for selecionada." 
                  : `${room.itemsToShow} item(ns) aleatório(s) serão mostrados quando a sala for selecionada.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">Nenhum item encontrado para esta sala.</p>
                  <p className="text-sm text-muted-foreground mt-1">Clique em 'Adicionar Item' para criar novos itens.</p>
                </div>
              ) : (
                <Table>
                  <TableCaption>Lista de itens que podem aparecer em {room.name}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: "50px" }}>Imagem</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Raridade</TableHead>
                      <TableHead>Probabilidade</TableHead>
                      <TableHead>Repetir</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead style={{ width: "100px" }}>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded overflow-hidden">
                            <img 
                              src={item.item.imageUrl} 
                              alt={item.item.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.item.rarity}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-slate-700 rounded-full h-2 mr-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${item.probability}%` }}
                              ></div>
                            </div>
                            <span className="text-xs whitespace-nowrap">{item.probability}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.canRepeat ? "default" : "secondary"}>
                            {item.canRepeat ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">
                          {item.item.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog open={isEditDialogOpen && selectedItem?.id === item.id} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                {selectedItem && (
                                  <RoomItemForm 
                                    item={selectedItem} 
                                    roomId={roomId} 
                                    onClose={handleCloseEditDialog} 
                                  />
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}