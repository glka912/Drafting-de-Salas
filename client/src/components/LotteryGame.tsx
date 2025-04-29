import { useState } from "react";
import GameStages from "./GameStages";
import RoomCard from "./RoomCard";
import RoomItem from "./RoomItem";
import { useLotteryGame } from "@/hooks/useLotteryGame";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { createConfetti } from "@/lib/confetti";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ArrowRight } from "lucide-react";
import { RoomItemWithDetails } from "@shared/schema";
import { useTheme } from "@/context/ThemeContext";

type GameState = "ready" | "selecting" | "selected" | "interior" | "revealing";

export default function LotteryGame() {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [stage, setStage] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [randomItems, setRandomItems] = useState<RoomItemWithDetails[]>([]);
  const [showDescriptions, setShowDescriptions] = useState<boolean>(false);
  const { currentTheme } = useTheme();
  
  const primaryColor = currentTheme?.primaryColor || "#3b82f6";
  const secondaryColor = currentTheme?.secondaryColor || "#6366f1";
  
  const { 
    getRandomRooms, 
    selectedRooms, 
    resetGame, 
    isLoadingRooms
  } = useLotteryGame();
  
  // Get selected room details
  const selectedRoom = selectedRoomId
    ? selectedRooms.find(room => room.id === selectedRoomId)
    : null;
  
  const handleStartLottery = async () => {
    setGameState("selecting");
    setStage(1);
    
    await getRandomRooms();
    
    setTimeout(() => {
      setGameState("selected");
      setStage(2);
    }, 2000);
  };
  
  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    createConfetti();
    
    // Encontrar a sala selecionada
    const room = selectedRooms.find(r => r.id === roomId);
    
    // Verificar se a sala exibe itens
    if (room && room.itemsToShow > 0) {
      // Fetch random items for the selected room and store them in state
      fetch(`/api/rooms/${roomId}/random-items`)
        .then(res => res.json())
        .then(data => {
          console.log("Random items from API:", data);
          setRandomItems(data);
        })
        .catch(err => console.error("Error fetching random items:", err));
    } else {
      // Limpar quaisquer itens existentes
      setRandomItems([]);
    }
    
    // First show the interior image
    setTimeout(() => {
      setGameState("interior");
      setStage(3);
    }, 1500);
  };
  
  // Handler to proceed to show the items
  const handleProceedToItems = () => {
    setGameState("revealing");
    setStage(4);
  };
  
  const handleRestart = () => {
    resetGame();
    setSelectedRoomId(null);
    setRandomItems([]); // Clear the random items
    setGameState("ready");
    setStage(1);
  };
  
  return (
    <div>
      <GameStages currentStage={stage} />
      
      <div className="relative">
        {/* Initial State */}
        <AnimatePresence mode="wait">
          {gameState === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 rounded-xl border mb-8"
              style={{ 
                backgroundColor: "rgba(0,0,0,0.2)",
                borderColor: `${primaryColor}40`
              }}
            >
              <div className="max-w-md mx-auto px-4">
                <h2 className="text-2xl font-bold mb-3">Bem-vindo à Loteria de Salas!</h2>
                <p className="text-slate-400 mb-6">
                  Clique no botão abaixo para fazer o drafting de 3 salas. Cada sala tem diferentes 
                  probabilidades e contém itens únicos.
                </p>
                <Button 
                  onClick={handleStartLottery}
                  className="px-6 py-3 transform hover:scale-105 transition shadow-lg text-white"
                  size="lg"
                  style={{
                    backgroundColor: primaryColor,
                  }}
                >
                  Iniciar Drafting
                </Button>
              </div>
            </motion.div>
          )}

          {/* Selection State */}
          {gameState === "selecting" && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div 
                  className="rounded-full h-32 w-32 border-t-4 border-b-4 mb-6 animate-spin" 
                  style={{ borderColor: primaryColor }}
                />
                <h2 className="text-2xl font-bold mb-3">Drafting Salas...</h2>
                <p className="text-slate-400">Por favor, aguarde enquanto fazemos o drafting de 3 salas para você.</p>
              </div>
            </motion.div>
          )}

          {/* Room Selection State */}
          {gameState === "selected" && (
            <motion.div
              key="selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold">
                  Selecione uma das salas disponíveis:
                </h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400">Mostrar Descrições</label>
                  <input 
                    type="checkbox" 
                    checked={showDescriptions}
                    onChange={() => setShowDescriptions(!showDescriptions)}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                </div>
              </div>
              
              <div className="flex justify-center items-center gap-8 mb-8">
                {selectedRooms.map((room) => (
                  <div key={room.id} style={{ width: '250px', height: '250px' }} className="relative">
                    <RoomCard
                      room={room}
                      isSelected={room.id === selectedRoomId}
                      onSelect={handleSelectRoom}
                      isSelecting={!!selectedRoomId && room.id !== selectedRoomId}
                    />
                    {showDescriptions && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2 text-center">
                        <h3 className="text-sm font-bold text-white">{room.name}</h3>
                        <p className="text-xs text-slate-300 truncate">{room.description}</p>
                        <div className="flex justify-center items-center gap-1 mt-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: room.color }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Interior Image State */}
          {gameState === "interior" && selectedRoom && (
            <motion.div
              key="interior"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-xl border overflow-hidden" style={{ 
                backgroundColor: "rgba(0,0,0,0.2)",
                borderColor: `${primaryColor}40`
              }}>
                <div 
                  className="px-6 py-8 flex flex-col justify-center items-center text-center" 
                  style={{ backgroundColor: `${primaryColor}60` }}
                >
                  <h2 className="text-xl font-bold mb-2">Interior da Sala</h2>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, white, ${secondaryColor})`
                    }}
                  >
                    {selectedRoom.name}
                  </h1>
                </div>
                
                <div className="p-6">
                  {selectedRoom.interiorImageUrl ? (
                    <div className="aspect-video overflow-hidden rounded-lg border-2 mb-6" style={{ borderColor: `${secondaryColor}50` }}>
                      <img 
                        src={selectedRoom.interiorImageUrl} 
                        alt={`${selectedRoom.name} interior`}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-lg flex items-center justify-center mb-6" style={{ 
                      backgroundColor: `${primaryColor}20`,
                      border: `1px solid ${secondaryColor}30` 
                    }}>
                      <p className="text-slate-400">Imagem do interior não disponível</p>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={handleProceedToItems}
                      className="px-6 py-3 transform hover:scale-105 transition shadow-lg flex items-center gap-2 text-white"
                      size="lg"
                      style={{
                        backgroundColor: primaryColor,
                      }}
                    >
                      {selectedRoom.itemsToShow === 0 ? (
                        <>Continuar <ArrowRight className="h-5 w-5 ml-1" /></>
                      ) : (
                        <>Explorar Itens <ArrowRight className="h-5 w-5 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Items Reveal State */}
          {gameState === "revealing" && selectedRoom && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-xl border overflow-hidden" style={{ 
                backgroundColor: "rgba(0,0,0,0.2)",
                borderColor: `${primaryColor}40`
              }}>
                <div 
                  className="px-6 py-8 flex flex-col justify-center items-center text-center" 
                  style={{ backgroundColor: `${primaryColor}60` }}
                >
                  <h2 className="text-xl font-bold mb-2">Sua Sala Selecionada:</h2>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, white, ${secondaryColor})`
                    }}
                  >
                    {selectedRoom.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm" style={{ color: secondaryColor }}>Sala #{selectedRoom.id}</span>
                  </div>
                </div>
                <div className="p-6">
                  {selectedRoom.itemsToShow === 0 ? (
                    <div className="mb-6 text-center p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}20` }}>
                      <h3 className="text-xl font-bold mb-2">Esta sala não contém itens para explorar</h3>
                      <p className="text-slate-400">A sala foi configurada para não exibir itens.</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold mb-3">Itens Descobertos:</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {randomItems.length > 0 ? (
                          randomItems.map((item) => (
                            <RoomItem
                              key={item.id}
                              item={item}
                              color={selectedRoom.color}
                            />
                          ))
                        ) : (
                          <div>Nenhum item encontrado</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={handleRestart}
                      className="px-6 py-3 transform hover:scale-105 transition shadow-lg flex items-center gap-2 text-white"
                      size="lg"
                      style={{
                        backgroundColor: primaryColor,
                      }}
                    >
                      <RefreshCcw className="h-5 w-5" />
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
