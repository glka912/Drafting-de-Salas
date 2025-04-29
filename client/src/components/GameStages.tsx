import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface GameStagesProps {
  currentStage: number;
}

export default function GameStages({ currentStage }: GameStagesProps) {
  const [progress1, setProgress1] = useState("0%");
  const [progress2, setProgress2] = useState("0%");
  const [progress3, setProgress3] = useState("0%");
  
  const { currentTheme } = useTheme();
  const primaryColor = currentTheme?.primaryColor || "#3b82f6";
  const secondaryColor = currentTheme?.secondaryColor || "#6366f1";
  
  useEffect(() => {
    // Animate progress bars based on current stage
    if (currentStage >= 1) {
      setTimeout(() => setProgress1("100%"), 100);
    } else {
      setProgress1("0%");
    }
    
    if (currentStage >= 2) {
      setTimeout(() => setProgress2("100%"), 100);
    } else {
      setProgress2("0%");
    }
    
    if (currentStage >= 3) {
      setTimeout(() => setProgress3("100%"), 100);
    } else {
      setProgress3("0%");
    }
  }, [currentStage]);
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div className={`flex flex-col items-center ${currentStage >= 1 ? "" : "opacity-50"}`}>
          <div 
            className="w-10 h-10 rounded-full text-white flex items-center justify-center mb-2 font-medium"
            style={{ 
              backgroundColor: currentStage >= 1 ? primaryColor : "rgba(100,100,100,0.5)" 
            }}
          >
            1
          </div>
          <span className="text-sm text-center">Drafting</span>
        </div>
        
        <div className="h-1 flex-grow mx-2 relative" style={{ backgroundColor: "rgba(100,100,100,0.3)" }}>
          <div
            className="h-full transition-all duration-1000"
            style={{ 
              width: progress1,
              backgroundColor: secondaryColor
            }}
          />
        </div>
        
        <div className={`flex flex-col items-center ${currentStage >= 2 ? "" : "opacity-50"}`}>
          <div 
            className="w-10 h-10 rounded-full text-white flex items-center justify-center mb-2 font-medium"
            style={{ 
              backgroundColor: currentStage >= 2 ? primaryColor : "rgba(100,100,100,0.5)" 
            }}
          >
            2
          </div>
          <span className="text-sm text-center">Escolher Sala</span>
        </div>
        
        <div className="h-1 flex-grow mx-2 relative" style={{ backgroundColor: "rgba(100,100,100,0.3)" }}>
          <div
            className="h-full transition-all duration-1000"
            style={{ 
              width: progress2,
              backgroundColor: secondaryColor
            }}
          />
        </div>
        
        <div className={`flex flex-col items-center ${currentStage >= 3 ? "" : "opacity-50"}`}>
          <div 
            className="w-10 h-10 rounded-full text-white flex items-center justify-center mb-2 font-medium"
            style={{ 
              backgroundColor: currentStage >= 3 ? primaryColor : "rgba(100,100,100,0.5)" 
            }}
          >
            3
          </div>
          <span className="text-sm text-center">Interior da Sala</span>
        </div>
        
        <div className="h-1 flex-grow mx-2 relative" style={{ backgroundColor: "rgba(100,100,100,0.3)" }}>
          <div
            className="h-full transition-all duration-1000"
            style={{ 
              width: progress3,
              backgroundColor: secondaryColor
            }}
          />
        </div>
        
        <div className={`flex flex-col items-center ${currentStage >= 4 ? "" : "opacity-50"}`}>
          <div 
            className="w-10 h-10 rounded-full text-white flex items-center justify-center mb-2 font-medium"
            style={{ 
              backgroundColor: currentStage >= 4 ? primaryColor : "rgba(100,100,100,0.5)" 
            }}
          >
            4
          </div>
          <span className="text-sm text-center">Revelar Itens</span>
        </div>
      </div>
    </div>
  );
}
