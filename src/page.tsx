'use client';

import React, { useState, useEffect } from 'react';
import Canvas from '../components/Canvas';
import WalletConnect from '../components/WalletConnect';
import ColorPicker from '../components/ColorPicker';
import { connectWallet, switchToSomnia } from '../utils/blockchain';

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cüzdan bağlantısı
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cüzdana bağlan
      const userAccount = await connectWallet();
      
      // Somnia ağına geç
      await switchToSomnia();
      
      // Durum güncelle
      setAccount(userAccount);
    } catch (err: any) {
      console.error("Bağlantı hatası:", err);
      setError(err.message || "Bağlantı hatası oluştu");
    } finally {
      setLoading(false);
    }
  };
  
  // Renk seçimi
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };
  
  // Sayfa yüklendiğinde cüzdan durumunu kontrol et
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            
            // Doğru ağda olup olmadığımızı kontrol et
            await switchToSomnia();
          }
        } catch (err) {
          console.error("Bağlantı kontrolü hatası:", err);
        }
      }
    };
    
    checkConnection();
    
    // MetaMask hesap değişikliklerini dinle
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
      }
    };
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-50">
      <h1 className="text-4xl font-bold mb-4 text-center">Somnia Pixel Canvas</h1>
      <p className="text-center mb-8 max-w-2xl">
        1024x1024 piksellik bir canvas üzerinde 1 STT token ödeyerek istediğiniz pikseli 
        dilediğiniz renge boyayabilirsiniz. Somnia ağındaki ilk pixel art projesi!
      </p>
      
      <div className="mb-6">
        <WalletConnect 
          account={account} 
          onConnect={handleConnect}
          loading={loading}
          error={error}
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start w-full max-w-6xl">
        <div className="md:w-3/4">
          <Canvas 
            account={account}
            selectedColor={selectedColor}
          />
        </div>
        
        <div className="md:w-1/4 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Renk Seçin</h2>
          <ColorPicker 
            selectedColor={selectedColor} 
            onColorChange={handleColorChange} 
          />
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Kurallar</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Her piksel için 1 STT token ödemeniz gerekir</li>
              <li>Başkalarının piksellerini de değiştirebilirsiniz</li>
              <li>Pikselinizi boyayabilmek için Somnia ağına bağlı olmalısınız</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
} 