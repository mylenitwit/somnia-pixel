'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { 
  // connectWallet, - yorum satırı haline getiriyorum çünkü kullanılmıyor
  switchToSomnia, 
  // disconnectWallet, - yorum satırı haline getiriyorum çünkü kullanılmıyor
  isAdmin, 
  createContractInstance, 
  CONTRACT_ADDRESS 
} from '../../utils/blockchain';

export default function AdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState<string>('0');
  // Kullanılmayan state'leri kaldırıyorum
  // const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  // const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  
  // Sayfaya erişim için admin kontrolü
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        
        // LocalStorage'dan hesabı al
        const savedAccount = localStorage.getItem('walletConnected');
        if (!savedAccount) {
          router.push('/');
          return;
        }
        
        setAccount(savedAccount);
        
        // Admin kontrolü
        const adminStatus = await isAdmin(savedAccount);
        if (!adminStatus) {
          setError('Admin yetkisi bulunmuyor. Bu sayfaya erişim sağlanamaz.');
          setTimeout(() => router.push('/'), 3000);
          return;
        }
        
        setIsAdminUser(true);
        await fetchContractBalance();
      } catch (err) {
        console.error("Admin kontrol hatası:", err);
        setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router]);
  
  // Contract bakiyesini getir
  const fetchContractBalance = async () => {
    try {
      await switchToSomnia();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      setContractBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("Bakiye sorgulama hatası:", err);
      setError("Kontrat bakiyesi alınamadı: " + (err instanceof Error ? err.message : String(err)));
    }
  };
  
  // Para çekme işlemi
  const handleWithdraw = async () => {
    try {
      setActionLoading(true);
      setActionMessage("Para çekme işlemi devam ediyor...");
      
      await switchToSomnia();
      const contract = await createContractInstance();
      
      // Kontrat bakiyesini kontrol et
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      
      if (balance <= ethers.parseEther("0")) {
        throw new Error("Kontrat bakiyesi boş");
      }
      
      // Basit withdraw fonksiyonunu çağır - parametre olmadan
      const tx = await contract.withdraw();
      await tx.wait();
      
      // Bakiyeyi güncelle
      await fetchContractBalance();
      
      setActionMessage(`Tüm bakiye (${ethers.formatEther(balance)} ETH) başarıyla çekildi.`);
    } catch (err) {
      console.error("Para çekme hatası:", err);
      setError("Para çekme işlemi başarısız: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(false);
    }
  };
  
  // Canvas temizleme işlemi
  const handleClearCanvas = async () => {
    try {
      setActionLoading(true);
      setActionMessage("Canvas temizleniyor...");
      setShowClearConfirm(false);
      
      // Blockchain'de clearCanvas fonksiyonu olmadığı için sadece sunucudaki verileri temizle
      const response = await fetch('/api/pixels/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          adminAddress: account 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sunucu hatası");
      }
      
      setActionMessage(`Canvas başarıyla temizlendi. Not: Bu işlem sadece sunucudaki verileri temizledi.`);
      
    } catch (err) {
      console.error("Canvas temizleme hatası:", err);
      setError("Canvas temizleme işlemi başarısız: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionLoading(false);
    }
  };
  
  // Ana sayfaya dönüş
  const handleGoBack = () => {
    router.push('/');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Yükleniyor...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (error && !isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Erişim Hatası</h1>
          <p className="mb-4">{error}</p>
          <p>Ana sayfaya yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 bg-purple-700 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Somnia Pixel Admin Paneli</h1>
            <button
              onClick={handleGoBack}
              className="bg-white text-purple-700 px-4 py-2 rounded-md hover:bg-purple-100"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
              <button 
                className="ml-2 text-red-500 font-bold"
                onClick={() => setError(null)}
              >
                ×
              </button>
            </div>
          )}
          
          {actionMessage && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
              {actionMessage}
              <button 
                className="ml-2 text-green-500 font-bold"
                onClick={() => setActionMessage('')}
              >
                ×
              </button>
            </div>
          )}
          
          {/* Kontrat Bakiyesi */}
          <div className="mb-6 p-4 bg-gray-100 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Kontrat Bakiyesi</h2>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold">{contractBalance} ETH</p>
              <button
                onClick={fetchContractBalance}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Yenile
              </button>
            </div>
          </div>
          
          {/* Para Çekme */}
          <div className="mb-6 p-6 border border-gray-200 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Para Çekme</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Bu işlem, kontrat bakiyesindeki tüm ETH&apos;yi kontrat sahibine aktaracaktır.
              </p>
              
              <button
                onClick={handleWithdraw}
                disabled={actionLoading || parseFloat(contractBalance) <= 0}
                className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
              >
                {actionLoading ? 'İşlem Yapılıyor...' : 'Tüm Bakiyeyi Çek'}
              </button>
            </div>
          </div>
          
          {/* Canvas Temizleme */}
          <div className="p-6 border border-gray-200 rounded-md">
            <h2 className="text-xl font-semibold mb-4">Canvas Yönetimi</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={actionLoading}
                className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
              >
                Canvas&apos;ı Temizle
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Canvas Temizleme Onay Modalı */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Canvas&apos;ı Temizle</h3>
            <p className="mb-6 text-gray-600">
              Tüm canvas&apos;ı temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm pikseller silinecektir.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleClearCanvas}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 