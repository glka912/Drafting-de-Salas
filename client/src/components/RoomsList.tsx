import { useQuery } from "@tanstack/react-query";
import { Room } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Heart, Play, Bookmark, Flame, Group, Lightbulb, BarChart } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/context/ThemeContext";

export default function RoomsList() {
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });
  
  const { currentTheme } = useTheme();  
  const primaryColor = currentTheme?.primaryColor || "#3b82f6";
  const secondaryColor = currentTheme?.secondaryColor || "#6366f1";
  
  const getIcon = (icon: string) => {
    switch (icon) {
      case "coins": return <Coins className="h-5 w-5" />;
      case "heart": return <Heart className="h-5 w-5" />;
      case "play": return <Play className="h-5 w-5" />;
      case "bookmark": return <Bookmark className="h-5 w-5" />;
      case "flame": return <Flame className="h-5 w-5" />;
      case "cubes": return <Group className="h-5 w-5" />;
      case "lightbulb": return <Lightbulb className="h-5 w-5" />;
      default: return <Coins className="h-5 w-5" />;
    }
  };
  
  // Animation for the items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <Card className="shadow-xl" style={{ 
        backgroundColor: "rgba(0,0,0,0.2)",
        borderColor: `${primaryColor}40`
      }}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" style={{ color: secondaryColor }} />
            Todas as Salas Disponíveis
          </CardTitle>
          <span className="text-xs text-slate-400 px-2 py-1 rounded-full" style={{
            backgroundColor: `${primaryColor}20`
          }}>
            {rooms.length} Salas no Total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {rooms.map((room) => (
            <motion.div
              key={room.id}
              variants={itemVariants}
              className="flex flex-col p-4 backdrop-blur-sm rounded-lg border transition-all hover:shadow-md"
              style={{
                backgroundColor: "rgba(30,30,30,0.8)",
                borderColor: "rgba(80,80,80,0.6)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${secondaryColor}30`;
                e.currentTarget.style.boxShadow = `0 4px 6px -1px ${primaryColor}10, 0 2px 4px -1px ${primaryColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(80,80,80,0.6)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="flex items-center mb-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ 
                    backgroundColor: `${room.color}20`,
                    color: room.color
                  }}
                >
                  {getIcon(room.icon)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{room.name}</h4>
                  <div className="flex items-center">
                    <span className="text-xs font-medium" style={{ color: room.color }}>
                      {room.rarity}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 mb-1 flex justify-between items-center">
                        Probabilidade 
                        <span className="font-semibold" style={{ color: room.color }}>{room.probability}%</span>
                      </span>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-2 rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${room.probability}%`,
                            backgroundColor: room.color 
                          }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Esta sala tem {room.probability}% de chance de aparecer</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
