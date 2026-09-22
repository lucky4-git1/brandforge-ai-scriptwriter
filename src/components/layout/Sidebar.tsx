import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, TrendingUp, FolderOpen, Settings, Wrench, Heart } from 'lucide-react';
import clsx from 'clsx';
import { useBrandStore } from '../../state/brandStore';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Zap, label: 'Generate', path: '/generate' },
  { icon: TrendingUp, label: 'Trends', path: '/trends' },
  { icon: FolderOpen, label: 'Workspace', path: '/workspace' },
  { icon: Wrench, label: 'Skills', path: '/skills' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { currentBrand } = useBrandStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-white via-[#FFF7FA] to-[#FFD6E7] border-r border-[#FFD6E7] flex flex-col z-10 shadow-2xl">
      <div className="p-6 border-b border-[#FFD6E7]/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7EB6] to-[#DDA0FF] flex items-center justify-center text-white font-bold shadow-lg">
            <Heart size={20} className="fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#4A3B45' }}>BrandForge</h1>
          </div>
        </div>
      </div>

      {currentBrand ? (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#FFD6E7] shadow-md">
          <p className="text-xs font-medium mb-1" style={{ color: '#7A6670' }}>Active brand</p>
          <p className="text-sm font-semibold truncate" style={{ color: '#4A3B45' }}>{currentBrand.name}</p>
        </div>
      ) : null}

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <div
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300',
                  active 
                    ? 'bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white shadow-lg' 
                    : 'text-[#7A6670] hover:bg-white/60 hover:shadow-md'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
