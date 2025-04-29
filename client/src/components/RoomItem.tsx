import { RoomItemWithDetails } from "@shared/schema";
import { motion } from "framer-motion";

interface RoomItemProps {
  item: RoomItemWithDetails;
  color: string;
}

export default function RoomItem({ item, color }: RoomItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
      className="bg-slate-800 rounded-lg p-4 border border-slate-700 transition"
      style={{ 
        borderColor: "rgba(51,65,85,0.5)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}50`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)";
      }}
    >
      <div className="h-36 w-full bg-slate-700 rounded-md overflow-hidden mb-3">
        <img src={item.item.imageUrl} alt={item.item.name} className="w-full h-full object-cover" />
      </div>
      <h4 className="font-medium" style={{ color }}>{item.item.name}</h4>
      <p className="text-xs text-slate-400">{item.item.description}</p>
    </motion.div>
  );
}
