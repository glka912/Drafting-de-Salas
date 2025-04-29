import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">How It Works</DialogTitle>
          <DialogClose className="absolute top-3 right-3 text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </DialogClose>
        </DialogHeader>
        <div className="text-slate-300 space-y-3 text-sm">
          <p>1. Click the <strong>"Start Selection"</strong> button to randomly select 3 rooms from our pool of available rooms.</p>
          <p>2. Each room has a different probability of being selected, indicated by the percentage.</p>
          <p>3. Choose one of the 3 displayed rooms to see what items are contained inside.</p>
          <p>4. Rarer rooms generally contain more valuable items!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
