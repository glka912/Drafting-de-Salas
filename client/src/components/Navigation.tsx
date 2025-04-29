import { Home, Palette, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Navigation() {
  const [location] = useLocation();

  // Create a custom NavLink component to simplify the code
  const NavLink = ({ href, icon, label }: { href: string; icon: JSX.Element; label: string }) => {
    const isActive = href === location || (href !== '/' && location.startsWith(href));
    
    return (
      <li>
        <Link href={href}>
          <span 
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
              isActive ? "" : "hover:bg-muted"
            }`}
            style={{
              backgroundColor: isActive ? "var(--primary-10)" : "",
              color: isActive ? "var(--primary)" : ""
            }}
          >
            {icon}
            <span>{label}</span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="bg-background border-b mb-6">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <span className="text-xl font-bold cursor-pointer">Drafting de Salas</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <nav>
              <ul className="flex gap-4">
                <NavLink 
                  href="/" 
                  icon={<Home size={18} />} 
                  label="Início" 
                />
                <NavLink 
                  href="/manage/rooms" 
                  icon={<Settings size={18} />} 
                  label="Gerenciar Salas" 
                />
                <NavLink 
                  href="/manage/color-themes" 
                  icon={<Palette size={18} />} 
                  label="Temas de Cores" 
                />
              </ul>
            </nav>
            <div className="border-l pl-4">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}