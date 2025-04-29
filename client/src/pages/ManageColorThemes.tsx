import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Palette, Plus, Star, Trash } from "lucide-react";
import ColorThemeForm from "../components/ColorThemeForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type ColorTheme = {
  id: number;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  isDefault: boolean;
};

export default function ManageColorThemes() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all color themes
  const { data: colorThemes = [], isLoading } = useQuery<ColorTheme[]>({
    queryKey: ["/api/color-themes"],
  });

  // Mutation to set a color theme as default
  const setDefaultMutation = useMutation({
    mutationFn: (themeId: number) => {
      return apiRequest({
        url: `/api/color-themes/${themeId}/set-default`,
        method: "POST"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/color-themes'] });
      toast({
        title: "Sucesso",
        description: "Tema padrão atualizado",
      });
    },
    onError: (error) => {
      console.error("Failed to set default theme:", error);
      toast({
        title: "Erro",
        description: "Falha ao definir tema padrão",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a color theme
  const deleteMutation = useMutation({
    mutationFn: (themeId: number) => {
      return apiRequest({
        url: `/api/color-themes/${themeId}`,
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/color-themes'] });
      toast({
        title: "Sucesso",
        description: "Tema de cor excluído",
      });
    },
    onError: (error: any) => {
      console.error("Failed to delete color theme:", error);
      
      // Check if the error is about deleting the default theme
      const errorMessage = error?.message || "Failed to delete color theme";
      const isDefaultThemeError = errorMessage.includes("Cannot delete the default color theme");
      
      toast({
        title: "Erro",
        description: isDefaultThemeError 
          ? "Não é possível excluir o tema padrão. Defina outro tema como padrão primeiro."
          : "Falha ao excluir o tema de cor",
        variant: "destructive",
      });
    }
  });

  // Handle opening the edit dialog
  const handleEditTheme = (theme: ColorTheme) => {
    setSelectedTheme(theme);
    setIsAddDialogOpen(true);
  };

  // Handle setting a theme as default
  const handleSetDefault = (themeId: number) => {
    setDefaultMutation.mutate(themeId);
  };

  // Handle deleting a theme
  const handleDeleteTheme = (themeId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este tema de cor?")) {
      deleteMutation.mutate(themeId);
    }
  };

  // Close the dialog and reset selected theme
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setTimeout(() => setSelectedTheme(null), 300);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Temas de Cores</h1>
          <p className="text-muted-foreground mt-1">
            Crie e personalize temas de cores para o seu sorteio de salas
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} /> Adicionar Novo Tema
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedTheme ? "Editar Tema de Cor" : "Criar Novo Tema de Cor"}</DialogTitle>
              <DialogDescription>
                {selectedTheme 
                  ? "Modifique as propriedades do tema de cor abaixo."
                  : "Insira os detalhes para seu novo tema de cor."}
              </DialogDescription>
            </DialogHeader>
            <ColorThemeForm
              theme={selectedTheme}
              onClose={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">Carregando temas de cores...</div>
      ) : colorThemes.length === 0 ? (
        <Alert variant="default" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nenhum tema de cor</AlertTitle>
          <AlertDescription>
            Você ainda não criou nenhum tema de cor. Adicione seu primeiro tema para começar!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colorThemes.map((theme) => (
            <Card key={theme.id} className="overflow-hidden">
              <div
                className="h-3"
                style={{ backgroundColor: theme.primaryColor }}
              />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {theme.name}
                      {theme.isDefault && (
                        <span className="text-yellow-500">
                          <Star size={16} />
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{theme.description}</CardDescription>
                  </div>
                  <div
                    className="w-8 h-8 rounded-full border shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}
                  >
                    <Palette size={14} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="block font-medium mb-1">Cores:</span>
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.primaryColor }}
                        title="Cor Primária"
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.secondaryColor }}
                        title="Cor Secundária"
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.accentColor }}
                        title="Cor de Destaque"
                      />
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="block font-medium mb-1">Fundo:</span>
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.backgroundColor }}
                        title="Cor de Fundo"
                      />
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: theme.textColor }}
                        title="Cor do Texto"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2 pb-4">
                <Button variant="outline" onClick={() => handleEditTheme(theme)}>
                  Editar
                </Button>
                <div className="flex gap-2">
                  {!theme.isDefault && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleSetDefault(theme.id)}
                      title="Definir como Padrão"
                    >
                      <Star size={16} />
                    </Button>
                  )}
                  {!theme.isDefault && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteTheme(theme.id)}
                      title="Excluir Tema"
                    >
                      <Trash size={16} />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}