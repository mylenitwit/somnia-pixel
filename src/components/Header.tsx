'use client';

import * as React from 'react';
import { useId } from 'react';

interface HeaderProps {
  account: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

// Sabit bir renk dizisi oluşturuyoruz
const PIXEL_COLORS = [
  '#FF3B30', '#FFCC00', '#34C759', '#007AFF', '#5856D6', 
  '#FF3B30', '#FFCC00', '#34C759', '#007AFF', '#5856D6',
  '#FF3B30', '#FFCC00', '#34C759', '#007AFF', '#5856D6',
  '#FF3B30'
];

const Header: React.FC<HeaderProps> = ({ account, onConnect, onDisconnect }) => {
  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-indigo-700 to-purple-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo ve Başlık */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="w-10 h-10 relative mr-3">
                  <div className="absolute inset-0 bg-white rounded-lg opacity-20 animate-pulse"></div>
                  <div className="absolute inset-1 grid grid-cols-4 grid-rows-4 gap-px">
                    {Array(16).fill(0).map((_, i) => (
                      <div 
                        key={i} 
                        className="rounded-sm" 
                        style={{ 
                          backgroundColor: PIXEL_COLORS[i]
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Somnia<span className="text-pink-300">Pixel</span>
                </h1>
              </div>
            </div>
          </div>
          
          {/* Cüzdan Bağlantısı */}
          <div>
            {account ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <p className="text-sm text-indigo-200">Connected Wallet</p>
                  <p className="text-white font-medium">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </p>
                </div>
                <button
                  onClick={onDisconnect}
                  className="py-2 px-4 border border-white border-opacity-30 rounded-lg text-white hover:bg-white hover:bg-opacity-10 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden md:inline">Disconnect Wallet</span>
                  <span className="md:hidden">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="py-2 px-6 bg-white rounded-lg text-indigo-700 hover:bg-indigo-100 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
