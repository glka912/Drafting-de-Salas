import { Dice5, InfoIcon, Eye, EyeOff, Settings } from "lucide-react";
import { useState } from "react";
import LotteryGame from "@/components/LotteryGame";
import RoomsList from "@/components/RoomsList";
import InfoModal from "@/components/InfoModal";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useTheme } from "@/context/ThemeContext";

export default function Home() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showRoomsList, setShowRoomsList] = useState(true);
  const { currentTheme } = useTheme();

  // Fallback colors if theme is not loaded
  const primaryColor = currentTheme?.primaryColor || '#4f46e5';
  const secondaryColor = currentTheme?.secondaryColor || '#8b5cf6';
  const accentColor = currentTheme?.accentColor || '#f97316';
  const backgroundColor = currentTheme?.backgroundColor || '#ffffff';
  const textColor = currentTheme?.textColor || '#111827';

  return (
    <div className="font-sans min-h-screen flex flex-col" 
      style={{ 
        backgroundColor: backgroundColor,
        color: textColor
      }}>
      {/* Header */}
      <header className="py-4 border-b" style={{ 
        backgroundColor: primaryColor,
        borderColor: secondaryColor
      }}>
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center" style={{ color: '#ffffff' }}>
            <span className="mr-2" style={{ color: accentColor }}>🎲</span> Drafting de Salas
          </h1>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ 
              backgroundColor: `${secondaryColor}40`, // Add alpha transparency
              color: 'white'
            }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
              <span>Sorteio ao vivo</span>
            </span>
            <Link href="/manage/rooms">
              <Button variant="outline" size="sm" className="mr-2 flex items-center gap-1.5 text-white border-white/30">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Gerenciar Salas</span>
              </Button>
            </Link>
            <button 
              onClick={() => setIsInfoModalOpen(true)}
              className="p-2 rounded-full transition hover:opacity-80"
              style={{ 
                color: 'white',
                background: `${secondaryColor}30`
              }}
              aria-label="Information"
            >
              <InfoIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 md:px-6 py-8 max-w-5xl">
          <LotteryGame />
          
          {/* Rooms List Toggle */}
          <div className="mt-12 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Salas Disponíveis</h3>
              <Badge variant="outline" style={{ 
                backgroundColor: `${secondaryColor}15`,
                color: primaryColor,
                borderColor: `${primaryColor}50`
              }}>
                {showRoomsList ? "Visível" : "Oculto"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ opacity: 0.6 }}>
                {showRoomsList ? "Ocultar" : "Mostrar"} lista de salas
              </span>
              <div className="flex items-center gap-2">
                {showRoomsList ? 
                  <Eye className="h-4 w-4" style={{ color: primaryColor }} /> : 
                  <EyeOff className="h-4 w-4" style={{ opacity: 0.5 }} />
                }
                <Switch 
                  checked={showRoomsList} 
                  onCheckedChange={setShowRoomsList} 
                  className={showRoomsList ? "bg-primary" : "bg-muted"}
                  style={{ 
                    backgroundColor: showRoomsList ? primaryColor : "rgba(100,100,100,0.2)"
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Rooms List with Animation */}
          <AnimatePresence>
            {showRoomsList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <RoomsList />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8" style={{ 
        backgroundColor: primaryColor,
        borderColor: secondaryColor,
        color: 'white'
      }}>
        <div className="container mx-auto px-4 md:px-6 text-center text-sm opacity-80">
          <p>&copy; {new Date().getFullYear()} Sistema de Loteria de Salas. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Info Modal */}
      <InfoModal 
        isOpen={isInfoModalOpen} 
        onClose={() => setIsInfoModalOpen(false)} 
      />
    </div>
  );
}
