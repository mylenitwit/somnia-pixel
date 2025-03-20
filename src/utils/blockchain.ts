import { ethers } from 'ethers';
import { contractABI } from './contractABI';

// Pixel type
export interface Pixel {
  x: number;
  y: number;
  color: number; 
  owner: string;
  transactionHash?: string;
}

// Somnia Testnet information
export const SOMNIA_TESTNET_ID = 50312;
export const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network";
export const SOMNIA_EXPLORER_URL = "https://shannon-explorer.somnia.network";

// Contract address (will be updated after deployment)
export const CONTRACT_ADDRESS = "0x496ef0e9944ff8c83fa74feb580f2fb581ecfffd"; // Example address

// Provider ve hesap alıcı yardımcı fonksiyonlar
export const getProvider = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getConnectedAccount = async (): Promise<string | null> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts[0] || null;
  } catch (error) {
    console.error("Error getting connected account:", error);
    return null;
  }
};

// Connect wallet
export const connectWallet = async (): Promise<string> => {
  try {
    // Check if Metamask is installed
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Metamask not found. Please install the Metamask extension.');
    }

    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    // Save connection status
    localStorage.setItem('walletConnected', accounts[0]);
    
    return accounts[0];
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = (): void => {
  // Since MetaMask doesn't have an active disconnect method,
  // resetting the connection status on the application side is sufficient
  console.log('Wallet disconnected');
  // Remove connection status from local storage
  localStorage.removeItem('walletConnected');
};

// Switch to Somnia network
export const switchToSomnia = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (parseInt(currentChainId, 16) !== SOMNIA_TESTNET_ID) {
      try {
        // First try to switch network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ethers.toBeHex(SOMNIA_TESTNET_ID) }],
        });
      } catch (error: any) {
        // If network is unknown, add it
        if (error.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ethers.toBeHex(SOMNIA_TESTNET_ID),
              chainName: "Somnia Testnet",
              nativeCurrency: { name: "Ether", symbol: "STT", decimals: 18 },
              rpcUrls: [SOMNIA_RPC_URL],
              blockExplorerUrls: [SOMNIA_EXPLORER_URL],
            }]
          });
        } else {
          throw error;
        }
      }
      
      // Network connection status persisted
      localStorage.setItem('currentNetwork', SOMNIA_TESTNET_ID.toString());
    }
    return true;
  } catch (error) {
    console.error("Network switching error:", error);
    throw error;
  }
};

// Create contract instance
export const createContractInstance = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
};

// Color a pixel
export const colorPixel = async (x: number, y: number, color: string) => {
  try {
    console.log(`Piksel renklendiriliyor: (${x}, ${y}) - Renk: ${color}`);
    
    // Hesap kontrolü yapılıyor
    const account = await getConnectedAccount();
    if (!account) {
      throw new Error("Cüzdan bağlı değil");
    }
    
    // Renk kodunu temizle (hex # işaretini kaldır)
    const cleanColor = color.startsWith('#') ? color.substring(1) : color;
    // Hex renk kodunu tamsayıya çevir
    const colorInt = parseInt(cleanColor, 16);

    console.log("Piksel güncelleniyor...");
    
    // 1. ADIM - Önce local state ve event listener'ları güncelle (hemen görüntülenebilmesi için)
    // Bu adımda herhangi bir API isteği veya blockchain işlemi içermiyor - anında sonuç
    const pixelEvent = {
      x: Number(x),
      y: Number(y),
      color: colorInt,
      owner: account,
      transactionHash: "local-update-" + Date.now()
    };
    
    // Diğer kullanıcılar için event listener'lara hemen bildir
    if (typeof window !== 'undefined' && (window as any).pixelCanvas) {
      const listeners = (window as any).pixelCanvas.listeners || [];
      if (Array.isArray(listeners) && listeners.length > 0) {
        console.log(`${listeners.length} adet listener'a hemen bildirim gönderiliyor`);
        listeners.forEach((callback: any) => {
          if (typeof callback === 'function') {
            try {
              callback(pixelEvent);
            } catch (callbackError) {
              console.error("Listener callback hatası:", callbackError);
            }
          }
        });
      }
    }
    
    // 2. ADIM - Sunucuya güncelleme isteği gönder (en az 5 kez deneme yapalım ve daha uzun timeout)
    let serverUpdateSuccess = false;
    let attempt = 0;
    const maxAttempts = 5;
    
    while (!serverUpdateSuccess && attempt < maxAttempts) {
      attempt++;
      console.log(`Sunucu güncelleme denemesi ${attempt}/${maxAttempts}...`);
      
      try {
        const response = await fetch('/api/pixels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            ...pixelEvent,
            // Deneme numarasını ve zaman damgasını ekle - her denemeyi benzersiz yap
            _attempt: attempt,
            _timestamp: Date.now()
          }),
          // 10 saniye timeout ekleyelim
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Piksel sunucuda başarıyla güncellendi:", result);
          serverUpdateSuccess = true;
          
          // Lokal Storage'a başarılı sunucu güncellemesini kaydedelim
          try {
            localStorage.setItem('last_server_update', JSON.stringify({
              ...pixelEvent,
              serverSuccess: true,
              timestamp: Date.now()
            }));
          } catch (storageError) {
            console.error("localStorage hatası:", storageError);
          }
        } else {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = await response.text();
          }
          
          console.error(`Sunucu yanıt hatası (${response.status}):`, errorData);
          // Kısa bir bekleme ekleyelim, her denemede biraz daha artan süre
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (serverError) {
        console.error(`Sunucu iletişim hatası (deneme ${attempt}):`, serverError);
        // Kısa bir bekleme ekleyelim, her denemede biraz daha artan süre
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    if (!serverUpdateSuccess) {
      console.warn("Sunucu güncellenemedi, sadece blockchain işlemine devam ediliyor");
      
      // Başarısız sunucu güncellemesini loglayalım
      try {
        localStorage.setItem('failed_server_update', JSON.stringify({
          ...pixelEvent,
          serverSuccess: false,
          attempts: attempt,
          timestamp: Date.now()
        }));
      } catch (storageError) {
        console.error("localStorage hatası:", storageError);
      }
    }
    
    // 3. ADIM - Blockchain işlemi (paralel başlat, ama hash için bekle)
    const provider = await getProvider();
    const contractInstance = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI,
      await provider.getSigner()
    );
    
    console.log(`Contract ile piksel renklendiriliyor: (${x}, ${y}) - Renk: ${colorInt}`);
    
    // Contract işlemi için gereken ödeme miktarını ekle (0.01 ETH/STT)
    const value = ethers.parseEther("0.01");
    
    // Blockchain işlemini başlat
    const tx = await contractInstance.colorPixel(x, y, colorInt, { value });
    console.log("Transaction gönderildi:", tx.hash);
    
    // Transaction'ın tamamlanmasını beklemeden önce, tekrar sunucuya bildiri
    if (!serverUpdateSuccess) {
      console.log("İşlem başarılı, tekrar sunucuyu güncellemeyi deniyorum...");
      
      try {
        const finalResponse = await fetch('/api/pixels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            ...pixelEvent,
            transactionHash: tx.hash,
            _finalAttempt: true,
            _timestamp: Date.now()
          }),
          signal: AbortSignal.timeout(10000)
        });
        
        if (finalResponse.ok) {
          console.log("İşlem sonrası sunucu güncellemesi başarılı");
        }
      } catch (finalError) {
        console.error("İşlem sonrası sunucu güncellemesi başarısız:", finalError);
      }
    }
    
    // Arka planda blockchain işleminin tamamlanmasını bekleyen bir promise başlat
    tx.wait()
      .then(() => {
        console.log("Transaction tamamlandı:", tx.hash);
        
        // İşlem tamamlanınca tekrar sunucuyu güncelleme dene
        return fetch('/api/pixels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            ...pixelEvent,
            transactionHash: tx.hash,
            _confirmed: true,
            _timestamp: Date.now()
          })
        }).then(finalResponse => {
          if (finalResponse.ok) {
            console.log("Transaction tamamlandı ve sunucu güncellemesi başarılı");
          }
        });
      })
      .catch((err: any) => console.error("Transaction başarısız oldu:", err));
    
    // Kullanıcıya hemen hash dön
    return tx.hash;
  } catch (error) {
    console.error("Piksel renklendirme işlemi başarısız:", error);
    throw error;
  }
};

// Get all pixel data (server-based approach)
export const getAllPixels = async (): Promise<Pixel[]> => {
  try {
    // Sunucu API'sine istek at ve tüm pikselleri getir
    const response = await fetch('/api/pixels');
    if (!response.ok) {
      throw new Error('Sunucudan piksel verisi alınamadı');
    }
    
    const pixels = await response.json();
    return pixels;
  } catch (error: any) {
    console.error("Error retrieving pixel data:", error);
    throw error;
  }
};

// Get pixels in the visible area (server-based approach)
export const getVisiblePixels = async (
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number
): Promise<Pixel[]> => {
  try {
    // Sunucu API'sine belirli koordinatlardaki pikselleri getirmek için istek at
    const response = await fetch(`/api/pixels?startX=${startX}&startY=${startY}&endX=${endX}&endY=${endY}`);
    if (!response.ok) {
      throw new Error('Sunucudan piksel verisi alınamadı');
    }
    
    const pixels = await response.json();
    return pixels;
  } catch (error: any) {
    console.error("Error getting visible pixel data:", error);
    throw error;
  }
};


// Listen to pixel events and update in real-time
export const startListeningToPixelEvents = async (): Promise<(() => void)> => {
  try {
    console.log("Piksel event listener başlatılıyor...");
    
    // Eğer listener zaten varsa tekrar başlatma
    if ((window as any).pixelCanvas && (window as any).pixelCanvas.initialized) {
      console.log("Piksel event listener zaten aktif");
      return () => {
        console.log("Mevcut event listener korunuyor");
      };
    }
    
    await switchToSomnia();
    const contract = await createContractInstance();
    
    // Dinleyici fonksiyonları saklamak için array
    const listeners: ((event: Pixel) => void)[] = [];
    
    // Event handler fonksiyonu
    const handleEvent = (x: any, y: any, color: any, owner: string, event: any) => {
      console.log("Blockchain'den piksel eventi alındı:", { x, y, color, owner });
      
      const numX = Number(x);
      const numY = Number(y);
      const numColor = Number(color);
      
      const pixelData = {
        x: numX,
        y: numY,
        color: numColor,
        owner,
        transactionHash: event.log.transactionHash
      };
      
      // Olay gerçekleştiğinde sunucuya gönder (arka planda)
      fetch('/api/pixels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pixelData)
      }).then(response => {
        if (!response.ok) {
          console.error("Sunucu piksel kaydetme hatası:", response.statusText);
        } else {
          console.log("Piksel sunucuya kaydedildi");
        }
      }).catch(error => {
        console.error("Sunucu iletişim hatası:", error);
      });
      
      // Tüm dinleyicilere hemen bildir
      console.log(`${listeners.length} listener'a piksel güncelleme bildiriliyor`);
      for (const callback of listeners) {
        try {
          callback(pixelData);
        } catch (callbackError) {
          console.error("Callback hatası:", callbackError);
        }
      }
    };
    
    // Add event listener
    contract.on("PixelColored", handleEvent);
    console.log("PixelColored event listener eklendi");
    
    // Function to add new listener
    const addListener = (callback: (event: Pixel) => void) => {
      listeners.push(callback);
      console.log(`Yeni listener eklendi, toplam: ${listeners.length}`);
      
      // Cleanup function
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
          console.log(`Listener kaldırıldı, kalan: ${listeners.length}`);
        }
      };
    };
    
    // Function to get all active listeners (for manual notification)
    const getListeners = () => {
      return [...listeners]; // Return a copy
    };
    
    // Export global functions
    (window as any).pixelCanvas = {
      addListener,
      getListeners,
      listeners,
      initialized: true
    };
    
    console.log("Global piksel canvas nesnesi oluşturuldu:", (window as any).pixelCanvas);
    
    // Function to stop listening
    return () => {
      console.log("Tüm piksel event listener'ları kaldırılıyor");
      contract.removeAllListeners("PixelColored");
      listeners.length = 0;
      (window as any).pixelCanvas.initialized = false;
    };
  } catch (error: any) {
    console.error("Piksel event dinleyici oluşturma hatası:", error);
    throw error;
  }
};

// Listen to pixel events - backward compatibility for old usage
export const listenToPixelEvents = async (callback: (event: Pixel) => void) => {
  try {
    // Start global event listener if not started
    if (!(window as any).pixelCanvas) {
      await startListeningToPixelEvents();
    }
    
    // Add listener
    return (window as any).pixelCanvas.addListener(callback);
  } catch (error: any) {
    console.error("Event listening error:", error);
    throw error;
  }
};

// Clear pixel (transparent pixel) - still requires token payment
export const clearPixel = async (x: number, y: number) => {
  await switchToSomnia();
  const contract = await createContractInstance();
  
  // Send 0.01 STT token (consistent with contract PRICE_PER_PIXEL value)
  const value = ethers.parseEther("0.01");
  
  try {
    // Blockchain işlemi
    const tx = await contract.clearPixel(x, y, { value });
    const receipt = await tx.wait();
    
    // İşlem başarılıysa sunucuyu güncelle
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const currentAccount = accounts[0];
    
    // Sunucuya gönder (clear piksel için renk 0 olarak ayarlanır)
    await fetch('/api/pixels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x,
        y,
        color: 0, // Temizlenmiş piksel için renk 0
        owner: currentAccount,
        transactionHash: tx.hash
      })
    });
    
    return tx.hash;
  } catch (error: any) {
    console.error("Error clearing pixel:", error);
    throw error;
  }
};

// Check if user is admin
export const isAdmin = async (address: string): Promise<boolean> => {
  try {
    await switchToSomnia();
    const contract = await createContractInstance();
    const ownerAddress = await contract.owner();
    return ownerAddress.toLowerCase() === address.toLowerCase();
  } catch (error: any) {
    console.error("Admin check error:", error);
    return false;
  }
};

// Initial sync of blockchain data to server database (admin only)
export const syncBlockchainToServer = async () => {
  try {
    await switchToSomnia();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = await createContractInstance();
    
    // Admin kontrolü
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const isAdminUser = await isAdmin(accounts[0]);
    
    if (!isAdminUser) {
      throw new Error("Bu işlemi sadece admin kullanıcılar yapabilir");
    }
    
    // Yükleme ilerlemesini takip etmek için
    let syncedCount = 0;
    
    // İlk bloktan itibaren küçük gruplar halinde olayları al
    let fromBlock = 0;
    const batchSize = 1000; // Bir seferde alınacak maksimum blok sayısı
    const currentBlock = await provider.getBlockNumber();
    
    while (fromBlock <= currentBlock) {
      const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
      
      console.log(`Syncing blocks ${fromBlock} to ${toBlock} (${Math.round((fromBlock / currentBlock) * 100)}% complete)`);
      
      // Bu blok aralığındaki olayları al
      const filter = contract.filters.PixelColored();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      
      // Bu aralıktaki benzersiz pikselleri topla
      const batchPixels: Map<string, Pixel> = new Map();
      
      for (const event of events) {
        if ('args' in event) {
          const args = event.args;
          if (!args) continue;
          
          const [x, y, color, owner] = [
            Number(args[0]),
            Number(args[1]), 
            Number(args[2]), 
            args[3]
          ];
          
          const key = `${x}-${y}`;
          batchPixels.set(key, {
            x,
            y, 
            color, 
            owner,
            transactionHash: event.transactionHash
          });
        }
      }
      
      // Bu aralıktaki pikselleri sunucuya gönder
      const pixelsArray = Array.from(batchPixels.values());
      for (const pixel of pixelsArray) {
        await fetch('/api/pixels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pixel)
        });
        
        syncedCount++;
      }
      
      console.log(`Synced ${syncedCount} pixels so far`);
      
      // Sonraki blok aralığına geç
      fromBlock = toBlock + 1;
    }
    
    console.log(`Blockchain sync complete. ${syncedCount} pixels synchronized.`);
    return syncedCount;
  } catch (error: any) {
    console.error("Error syncing blockchain data:", error);
    throw error;
  }
}; 