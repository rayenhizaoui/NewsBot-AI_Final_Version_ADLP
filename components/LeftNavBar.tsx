import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, TrendsIcon, ForecastIcon, ProfileIcon, SettingsIcon, HelpIcon, NewsBotLogo } from './icons/IconDefs';

const LeftNavBar: React.FC = () => {
  const mainNavItems = [
    { to: '/', text: 'Home', icon: <HomeIcon /> },
    { to: '/trends', text: 'Trends', icon: <TrendsIcon /> },
    { to: '/forecast/global-chip-shortage', text: 'Forecasts', icon: <ForecastIcon /> },
  ];

  const userNavItems = [
    { to: '/profile', text: 'Profile', icon: <ProfileIcon /> },
    { to: '/help', text: 'Help', icon: <HelpIcon /> },
    { to: '/settings', text: 'Settings', icon: <SettingsIcon /> },
  ];

  const baseStyle = "flex items-center space-x-4 p-3 rounded-lg transition-colors duration-200";
  const inactiveStyle = "text-slate-400 hover:bg-slate-800 hover:text-white";
  const activeStyle = "bg-slate-700 text-[#64FFDA]";

  return (
    <aside className="fixed top-0 left-0 h-full w-[18%] bg-[#0A192F] border-r border-slate-800 p-4 flex flex-col">
      <div className="mb-10">
        <NewsBotLogo />
      </div>

      <nav className="flex flex-col space-y-2">
        {mainNavItems.map(item => (
          <NavLink
            key={item.text}
            to={item.to}
            className={({ isActive }) => `${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}
            end={item.to === '/'}
          >
            {item.icon}
            <span className="font-medium">{item.text}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col space-y-2">
        <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
        <span className="text-lg font-bold text-slate-400">R</span>
            </div>
            <div>
        <p className="font-semibold text-white">Rayen</p>
                <p className="text-xs text-slate-400">Pro Member</p>
            </div>
        </div>
         {userNavItems.map(item => (
          <NavLink
            key={item.text}
            to={item.to}
            className={({ isActive }) => `${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}
          >
            {item.icon}
            <span className="font-medium">{item.text}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

export default LeftNavBar;