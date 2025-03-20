'use client';

import * as React from 'react';
const { useState, useEffect } = React;
import Canvas from '../components/Canvas';
import ColorPicker from '../components/ColorPicker';
// @ts-ignore - Ignore TS not finding the Header module during compilation
import Header from '../components/Header';
import { connectWallet, switchToSomnia, disconnectWallet, syncBlockchainToServer, isAdmin } from '../utils/blockchain';

export default function Home() {
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  // Wallet connection
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await switchToSomnia();
      const address = await connectWallet();
      setAccount(address);
    } catch (err: any) {
      setError(err.message || "Connection error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    setAccount(null);
  };
  
  // Color selection
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };
  
  // Check wallet status when page loads
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Önce localStorage'dan kayıtlı hesabı kontrol et
          const savedAccount = localStorage.getItem('walletConnected');
          
          if (savedAccount) {
            // Eğer daha önce bağlantı yapılmışsa, sessiz bir şekilde bağlantıyı devam ettir
            setAccount(savedAccount);
            // Ağ kontrolü yap ama hata gösterme
            try {
              await switchToSomnia();
            } catch (networkError) {
              console.log("Network switching was needed:", networkError);
            }
          } else {
            // Kayıtlı hesap yoksa, aktif bağlantıları kontrol et
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              localStorage.setItem('walletConnected', accounts[0]);
              await switchToSomnia();
            }
          }
        } catch (err) {
          console.error("Connection check error:", err);
        }
      }
    };
    
    checkConnection();
    
    // Listen for MetaMask account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
        localStorage.removeItem('walletConnected');
      } else {
        setAccount(accounts[0]);
        localStorage.setItem('walletConnected', accounts[0]);
      }
    };
    
    // Listen for chain changes
    const handleChainChanged = () => {
      // Refresh the page when chain changes
      window.location.reload();
    };
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);
  
  // Admin kontrolü
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (account) {
        const adminStatus = await isAdmin(account);
        setIsAdminUser(adminStatus);
      } else {
        setIsAdminUser(false);
      }
    };
    
    checkAdminStatus();
  }, [account]);
  
  // Blockchain'den sunucuya veri senkronizasyonu
  const handleSyncBlockchain = async () => {
    if (!isAdminUser || !account) return;
    
    setSyncLoading(true);
    setSyncStatus('Starting synchronization...');
    
    try {
      const syncedCount = await syncBlockchainToServer();
      setSyncStatus(`Synchronization completed. ${syncedCount} pixels synchronized.`);
    } catch (error: any) {
      console.error('Synchronization error:', error);
      setSyncStatus(`Error: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col bg-gray-100">
      <Header account={account} onConnect={handleConnect} onDisconnect={handleDisconnect} />
      
      <div className="flex flex-col md:flex-row flex-1">
        <div className="w-full md:w-64 bg-white p-4 border-r border-gray-200">
          <div className="mb-6">
            <h2 className="color-picker-title">Color Picker</h2>
            <ColorPicker 
              selectedColor={selectedColor} 
              onColorChange={setSelectedColor} 
            />
          </div>
          
          <div className="mt-6 tools-section">
            <h2 className="tools-title">Tools</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowRules(!showRules)}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showRules ? 'Hide Rules' : 'Show Rules'}</span>
              </button>
              
              {isAdminUser && (
                <>
                  <button
                    onClick={handleSyncBlockchain}
                    disabled={syncLoading}
                    className="btn btn-secondary w-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{syncLoading ? 'Synchronizing...' : 'Synchronize Blockchain → Server'}</span>
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/admin'}
                    className="btn btn-secondary w-full flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Go to Admin Panel</span>
                  </button>
                  
                  {syncStatus && (
                    <div className="mt-2 text-sm p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      {syncStatus.includes('başlatılıyor') 
                        ? 'Starting synchronization...' 
                        : syncStatus.includes('tamamlandı') 
                          ? `Synchronization completed. ${syncStatus.match(/\d+/)?.[0] || ''} pixels synchronized.`
                          : syncStatus.includes('Hata') 
                            ? `Error: ${syncStatus.split('Hata: ')[1]}` 
                            : syncStatus
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {showRules && (
            <div className="mt-6 rules-container">
              <h2 className="rules-title">Rules</h2>
              <ul className="rules-list">
                <li>You must pay 0.01 STT token for each pixel</li>
                <li>You can change pixels owned by others</li>
                <li>You must be connected to the Somnia network to color pixels</li>
                <li>Coloring operation takes place on the blockchain</li>
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex-1 relative">
          <Canvas 
            selectedColor={selectedColor} 
            account={account} 
          />
          
          {/* Canvas Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Clear Canvas</h3>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to clear the entire canvas? This action cannot be undone and all pixels will be deleted.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Canvas clearing will happen here
                      setShowClearConfirm(false);
                    }}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 