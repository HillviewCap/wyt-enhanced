import React from 'react';
import { NavLink } from 'react-router-dom';

export const NavBar: React.FC = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors duration-200 ${
      isActive
        ? 'text-[#00BFFF] font-semibold bg-gray-800'
        : 'text-[#EAEAEA] hover:text-[#00BFFF] hover:bg-gray-800'
    }`;

  return (
    <nav className="bg-[#121212] border-b border-gray-800 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-[#EAEAEA] text-xl font-bold">ISR Platform</h1>
          <div className="flex items-center space-x-2">
            <NavLink to="/map" className={navLinkClass}>
              Map View
            </NavLink>
            <NavLink to="/datasources" className={navLinkClass}>
              Data Sources
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
};