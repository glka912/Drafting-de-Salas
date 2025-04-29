import { motion } from "framer-motion";
import { Room } from "@shared/schema";
import { Coins, Heart, Play, Bookmark, Flame, Group, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface RoomCardProps {
  room: Room;
  isSelected: boolean;
  isSelecting: boolean;
  onSelect: (roomId: number) => void;
}

export default function RoomCard({ room, isSelected, isSelecting, onSelect }: RoomCardProps) {
  const [progressWidth, setProgressWidth] = useState("0%");
  
  useEffect(() => {
    // Animate the probability bar
    setTimeout(() => {
      setProgressWidth(`${room.probability}%`);
    }, 300);
  }, [room.probability]);
  
  const getIcon = () => {
    switch (room.icon) {
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
  
  return (
    <motion.div
      className={`room-card relative overflow-hidden cursor-pointer ${
        isSelected ? "scale-105" : ""
      } ${isSelecting ? "opacity-50 scale-95" : ""}`}
      animate={isSelected ? { y: -8 } : { y: 0 }}
      whileHover={{ y: -4 }}
      data-room-id={room.id}
      onClick={() => !isSelecting && onSelect(room.id)}
      style={{ 
        borderColor: isSelected ? room.color : 'transparent',
        border: isSelected ? `2px solid ${room.color}` : 'none',
        boxShadow: isSelected ? `0 0 10px ${room.color}` : 'none'
      }}
    >
      {/* Room image only - absolutely no text overlay */}
      <img 
        src={room.imageUrl} 
        alt={room.name} 
        className="w-full h-full object-contain bg-black" 
      />
    </motion.div>
  );
}
