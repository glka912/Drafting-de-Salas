import { useState } from "react";
import { Room } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useLotteryGame() {
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const queryClient = useQueryClient();
  
  // Query all rooms to have them in cache for the rooms list
  const { isLoading: isLoadingAllRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });
  
  // We'll use this flag when fetching random rooms
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  
  // Get random rooms from the API
  const getRandomRooms = async () => {
    setIsLoadingRooms(true);
    try {
      // Use the proper apiRequest format - it already returns parsed JSON
      const rooms = await apiRequest('/api/rooms/random?count=3');
      console.log("Fetched random rooms:", rooms);
      setSelectedRooms(rooms);
      
      // Prefetch random room items for each room to reduce waiting time later
      for (const room of rooms) {
        queryClient.prefetchQuery({
          queryKey: ['/api/rooms', room.id, 'random-items'],
        });
      }
    } catch (error) {
      console.error("Failed to fetch random rooms:", error);
    } finally {
      setIsLoadingRooms(false);
    }
  };
  
  // Reset the game state
  const resetGame = () => {
    setSelectedRooms([]);
  };
  
  return {
    selectedRooms,
    getRandomRooms,
    resetGame,
    isLoadingRooms: isLoadingRooms || isLoadingAllRooms,
  };
}
