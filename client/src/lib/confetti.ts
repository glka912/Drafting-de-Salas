export function createConfetti() {
  const container = document.body;
  const colors = ['#4F46E5', '#EC4899', '#34D399', '#60A5FA', '#F59E0B', '#EF4444'];
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.position = 'absolute';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.opacity = '0';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.animation = `confetti-fall ${1 + Math.random() * 3}s ease-out forwards`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    
    container.appendChild(confetti);
    
    // Clean up confetti
    setTimeout(() => {
      confetti.remove();
    }, 4000);
  }
  
  // Add the keyframes if they don't exist
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.innerHTML = `
      @keyframes confetti-fall {
        0% { transform: translateY(-100px); opacity: 1; }
        100% { transform: translateY(500px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
