'use client';

import * as React from 'react';
const { useRef, useEffect, useState, useCallback } = React;
import { 
  colorPixel, 
  listenToPixelEvents, 
  startListeningToPixelEvents,
  getVisiblePixels,
  getAllPixels,
  //clearPixel,
  isAdmin,
  Pixel 
} from '../utils/blockchain';
import { createContext, useContext } from 'react';
// import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Spinner, Text, useDisclosure } from '@chakra-ui/react';

// Yerel UI bileşenleri tanımlamaları
// @chakra-ui/react eksik olduğu için kendi bileşenlerimizi tanımlayalım
const Button = ({ children, onClick, colorScheme, variant, mr }: any) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded ${colorScheme === 'red' ? 'bg-red-500 text-white' : 'bg-gray-200'} ${mr ? 'mr-3' : ''} ${variant === 'ghost' ? 'bg-transparent' : ''}`}
  >
    {children}
  </button>
);

const Modal = ({ isOpen, onClose, children }: any) => isOpen ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg shadow-lg">{children}</div>
  </div>
) : null;

const ModalOverlay = () => <div className="fixed inset-0 bg-black bg-opacity-50" />;
const ModalContent = ({ children }: any) => <div className="bg-white p-4 rounded-lg z-10">{children}</div>;
const ModalHeader = ({ children }: any) => <h3 className="text-xl font-bold mb-4">{children}</h3>;
const ModalCloseButton = () => <button className="absolute top-2 right-2">&times;</button>;
const ModalBody = ({ children }: any) => <div className="mb-4">{children}</div>;
const ModalFooter = ({ children }: any) => <div className="flex justify-end">{children}</div>;
const Text = ({ children }: any) => <p className="mb-4">{children}</p>;
const Spinner = () => <div className="animate-spin h-6 w-6 border-4 border-t-transparent rounded-full"/>;

// Eksik contextler için basit implementasyonlar
const ColorContext = createContext<{selectedColor: string}>({selectedColor: '#000000'});
export const useColorContext = () => useContext(ColorContext);

const WalletContext = createContext<{account: string | null}>({account: null});
export const useWalletContext = () => useContext(WalletContext);

// Notification hook implementasyonu
export const useNotification = () => {
  return {
    showNotification: (message: string, status?: string) => {
      console.log(`Notification: ${message} (${status})`);
    }
  };
};

// useDisclosure hook implementasyonu
const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  return { isOpen, onOpen, onClose };
};

interface CanvasProps {
  account: string | null;
  selectedColor: string;
}

const Canvas: React.FC<CanvasProps> = ({ account, selectedColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [selectedPixel, setSelectedPixel] = useState<{x: number, y: number} | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { showNotification } = useNotification();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pendingPixels, setPendingPixels] = useState<Pixel[]>([]);
  
  const CANVAS_SIZE = 1024;
  const GRID_CELL_SIZE = 2;
  
  // Canvas yeniden çizim
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Canvas boyutunu ayarla - 1024x1024 olarak net boyut
    const container = containerRef.current;
    if (!container) return;
    
    // Canvas'ın fiziksel boyutunu ayarla - sabit 1024x1024
    canvas.width = 1024;
    canvas.height = 1024;
    
    // Arka planı temizle - daha koyu bir arka plan
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Piksel başına sabit boyut belirle
    const gridSize = GRID_CELL_SIZE; // Grid hücre boyutu
    const pixelSize = gridSize * 8; // Pikselleri 8 kat büyüt
    
    // Pikselleri çiz
    pixels.forEach(pixel => {
      const { x, y, color } = pixel;
      
      // Renk kodunu Hex'e çevir
      const hexColor = '#' + color.toString(16).padStart(6, '0');
      
      // Pikseli doldur - padding'i sıfırlayarak grid'in tamamını kaplasın
      const padding = 0; // Padding'i tamamen kaldırıyorum, piksel tüm grid alanını kaplasın
      
      // Gölgelendirme efektini kaldır
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Köşe yuvarlaklığı yok - tam kare şeklinde piksel
      const cornerRadius = 0;
      
      // Arka plan - tam doldur
      ctx.fillStyle = hexColor;
    ctx.beginPath();
      ctx.fillRect(
        x * pixelSize + padding,
        y * pixelSize + padding,
        pixelSize - padding * 2,
        pixelSize - padding * 2
      );
      
      // Piksel kenarı olmadan daha temiz görünüm
      ctx.shadowColor = 'transparent'; // Gölge efektini kapat
    });
    
    // Grid çizgilerini ayarla - satır aralığını grid boyutuyla orantılı yap
    // Küçük grid için her 8 çizgide bir kalın çizgi mantıklı olacak
    const gridDivider = 8; // Her 8 çizgide bir ana grid çizgisi
    
    // İkincil grid çizgileri - daha ince ve soluk
    for (let x = 0; x <= (CANVAS_SIZE / gridSize); x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * gridSize, 0);
      ctx.lineTo(x * gridSize, canvas.height);
      
      // Her gridDivider çizgide bir daha kalın çizgi
      if (x % gridDivider === 0) {
        ctx.lineWidth = 0.4; // Ana gridleri daha ince yap
        ctx.strokeStyle = '#9CA3AF'; // Daha soluk ana grid rengi
      } else {
        ctx.lineWidth = 0.1; // Çok ince ikincil çizgiler
        ctx.strokeStyle = '#E5E7EB'; // Çok soluk ikincil grid rengi
      }
      
      ctx.stroke();
    }
    
    for (let y = 0; y <= (CANVAS_SIZE / gridSize); y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * gridSize);
      ctx.lineTo(canvas.width, y * gridSize);
      
      // Her gridDivider çizgide bir daha kalın çizgi
      if (y % gridDivider === 0) {
        ctx.lineWidth = 0.4;
        ctx.strokeStyle = '#9CA3AF';
      } else {
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = '#E5E7EB';
      }
      
      ctx.stroke();
    }
    
    // Seçili pikseli vurgula - daha belirgin yap
    if (selectedPixel) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = pixelSize <= 2 ? 1 : 2; // Küçük pikseller için daha ince kenarlık
      ctx.strokeRect(
        selectedPixel.x * pixelSize,
        selectedPixel.y * pixelSize,
        pixelSize,
        pixelSize,
      );
      
      // Vurguyu daha belirgin yapmak için bir arka plan yansıması ekle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Hafif kırmızı vurgu
      ctx.fillRect(
        selectedPixel.x * pixelSize,
        selectedPixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }, [pixels, selectedPixel, CANVAS_SIZE, GRID_CELL_SIZE]);
  
  // Piksel çiz fonksiyonu
  const drawPixel = useCallback((newPixel: Pixel) => {
    // Canvas'a yeni piksel eklendiğinde, temizlenme durumunu kaldır
    if (localStorage.getItem('canvas_cleared') === 'true') {
      localStorage.removeItem('canvas_cleared');
      console.log('Yeni piksel eklendi, canvas temizlenme durumu sıfırlandı');
    }
    
    setPixels(prevPixels => {
      // Aynı koordinattaki pikseli bul
      const index = prevPixels.findIndex(p => p.x === newPixel.x && p.y === newPixel.y);
      
      let updatedPixels;
      if (index !== -1) {
        // Mevcut pikseli güncelle
        updatedPixels = [...prevPixels];
        updatedPixels[index] = newPixel;
      } else {
        // Yeni piksel ekle
        updatedPixels = [...prevPixels, newPixel];
      }
      
      // LocalStorage'a kaydet - bu işlemi daha az sıklıkta yapalım
      // localStorage işlemleri yavaş olabilir, her piksel için yapmak yerine yavaşlatılmış bir şekilde yapalım
      try {
        // Sadece bir güncelleme olduğunu localStorage'a not edelim
        sessionStorage.setItem('pixels_updated', 'true');
      } catch (error) {
        console.error("LocalStorage güncelleme hatası:", error);
      }
      
      return updatedPixels;
    });
    
    // Canvas'ı hemen güncelle
    requestAnimationFrame(() => {
      redrawCanvas();
    });
  }, [redrawCanvas]);
  
  // Piksel verilerini localStorage'dan yükle
  const loadPixelsFromLocalStorage = (): Pixel[] => {
    try {
      // Eğer canvas temizlenmişse, localStorage'dan yükleme yapma
      if (localStorage.getItem('canvas_cleared') === 'true') {
        console.log('Canvas temizlenmiş durumda, localStorage verileri yüklenmeyecek');
        return [];
      }
      
      const storedData = localStorage.getItem('canvas_pixels');
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error("LocalStorage'dan piksel yükleme hatası:", error);
    }
    return [];
  };

  // Piksel verilerini localStorage'a kaydet
  const savePixelsToLocalStorage = (pixels: Pixel[]): void => {
    try {
      localStorage.setItem('canvas_pixels', JSON.stringify(pixels));
      console.log(`${pixels.length} piksel localStorage'a kaydedildi`);
    } catch (error) {
      console.error("LocalStorage'a piksel kaydetme hatası:", error);
    }
  };

  // Pikselleri yükle
  const loadPixels = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingProgress(0);
      
      // Canvas temizlendi mi kontrol et
      const isCanvasCleared = localStorage.getItem('canvas_cleared') === 'true';
      if (isCanvasCleared) {
        console.log('Canvas temizlenmiş durumda, sadece sunucudan veri alınacak');
        setPixels([]);
        setLoadingProgress(50);
      } else {
        // Önce localStorage'dan yüklemeyi dene
        const localPixels = loadPixelsFromLocalStorage();
        if (localPixels.length > 0) {
          console.log(`${localPixels.length} piksel localStorage'dan yüklendi`);
          setPixels(localPixels);
          setLoadingProgress(50);
        }
      }
      
      // Tüm pikselleri yükle
      const loadAllPixels = async () => {
        try {
          console.log("Tüm pikseller yükleniyor...");
          const allPixels = await getAllPixels();
          console.log(`${allPixels.length} piksel sunucudan yüklendi`);
          
          // Eğer sunucudan gelen veri boşsa ve canvas temizlenmişse durumu koru
          if (allPixels.length === 0 && isCanvasCleared) {
            console.log('Sunucudan veri gelmedi, canvas temizlenme durumu korunuyor');
          } 
          // Sunucudan veri geldiyse temizlenme durumunu kaldır
          else if (allPixels.length > 0 && isCanvasCleared) {
            localStorage.removeItem('canvas_cleared');
            console.log('Sunucudan veri geldi, canvas temizlenme durumu kaldırıldı');
          }
          
          setPixels(allPixels);
          // Sadece canvas temizlenmediyse localStorage'a kaydet
          if (!isCanvasCleared) {
            savePixelsToLocalStorage(allPixels);
          }
          setLoadingProgress(100);
          setIsLoading(false);
        } catch (error) {
          console.error("Piksel yükleme hatası:", error);
          setIsLoading(false);
        }
      };
      
      // İlk yükleme
      await loadAllPixels();
      
      // Daha sık aralıklarla otomatik yenileme (10 saniyede bir)
      const intervalId = setInterval(async () => {
        console.log("Otomatik piksel yenileme...");
        try {
          const updatedPixels = await getAllPixels();
          console.log(`${updatedPixels.length} piksel yenilendi`);
          
          // Canvas temizlendi mi kontrol et
          const isStillCleared = localStorage.getItem('canvas_cleared') === 'true';
          
          // Pikselleri güncelle
          setPixels(updatedPixels);
          
          // Sadece canvas temizlenmediyse localStorage'a kaydet
          if (!isStillCleared) {
            savePixelsToLocalStorage(updatedPixels);
          }
        } catch (refreshError) {
          console.error("Piksel yenileme hatası:", refreshError);
        }
      }, 10000); // 10 saniyede bir
      
      // Component unmount olduğunda interval'i temizle
      return () => {
        console.log("Piksel yenileme interval'ı temizleniyor");
        clearInterval(intervalId);
      };
      
    } catch (error) {
      console.error("Error loading pixel data:", error);
      setIsLoading(false);
    }
  }, []);
  
  // LocalStorage'a daha az sıklıkta kaydet (performans için)
  useEffect(() => {
    // LocalStorage'a kaydetme sıklığını sınırla (5 saniyede bir)
    const saveInterval = setInterval(() => {
      // Eğer bir güncelleme olduysa kaydet
      if (sessionStorage.getItem('pixels_updated') === 'true') {
        console.log("Piksel güncellemeleri localStorage'a kaydediliyor...");
        savePixelsToLocalStorage(pixels);
        sessionStorage.removeItem('pixels_updated');
      }
    }, 5000);
    
    return () => clearInterval(saveInterval);
  }, [pixels]);
  
  // Canvas boyutu değiştiğinde yeniden çiz
  useEffect(() => {
    const handleResize = () => {
        redrawCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);
  
  // Başlangıçta pikselleri yükle
  useEffect(() => {
    loadPixels();
  }, [loadPixels]);
  
  // Piksel verileri veya seçili piksel değiştiğinde canvas'i yeniden çiz
  useEffect(() => {
    redrawCanvas();
  }, [pixels, selectedPixel, redrawCanvas]);
  
  // Canvas'ı temizleme onayı modalı
  const handleClearConfirm = async () => {
    if (!isUserAdmin || !account) {
      showNotification("Sadece admin bu işlemi yapabilir", "error");
      onClose();
      return;
    }
    
    try {
      // Önce mevcut piksel sayısını kontrol edelim (debug için)
      console.log(`Temizleme öncesi piksel sayısı: ${pixels.length}`);
      
      // API'ye temizleme isteği gönder
      const clearResponse = await fetch('/api/pixels/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminAddress: account }),
      });
      
      const clearResult = await clearResponse.json();
      
      if (clearResponse.ok) {
        console.log("Temizleme başarılı:", clearResult);
        showNotification("Canvas başarıyla temizlendi", "success");
        
        // UI'ı güncelle - boş bir dizi ile state'i güncelle
        setPixels([]);
        
        // LocalStorage'ı TAMAMEN temizle
        try {
          // Canvas ile ilgili TÜM localStorage anahtarlarını temizle
          localStorage.removeItem('canvas_pixels');
          localStorage.removeItem('pixels_updated');
          sessionStorage.removeItem('pixels_updated');
          
          // Canvas'ın temizlendiğini belirten işaret koy
          localStorage.setItem('canvas_cleared', 'true');
          
          console.log('Canvas pikselleri localStorage\'dan tamamen temizlendi ve temizlenme durumu kaydedildi');
      } catch (error) {
          console.error('LocalStorage temizleme hatası:', error);
        }
        
        // Temizleme sonrası piksel sayısını logla (debug)
        console.log(`Temizleme sonrası piksel sayısı: ${pixels.length}`);
        
        // Sayfayı yenileme yerine, manuel olarak yeni pikselleri yükle
        setTimeout(() => {
          loadPixels();
        }, 1000);
      } else {
        console.error("Temizleme hatası:", clearResult);
        showNotification(`Temizleme hatası: ${clearResult.error}`, "error");
      }
    } catch (error) {
      console.error("Canvas temizleme hatası:", error);
      showNotification("Canvas temizleme sırasında hata oluştu", "error");
    }
    
    onClose();
  };

  // Canvas temizleme fonksiyonu (admin butonu için)
  const handleClearCanvas = useCallback(() => {
    if (!isUserAdmin) {
      showNotification("Bu işlem sadece admin kullanıcıları içindir", "error");
      return;
    }
    
    // Temizleme onay modalını aç
    onOpen();
  }, [isUserAdmin, onOpen, showNotification]);

  // Piksel tıklama işleyicisi
  const handlePixelClick = useCallback(async (x: number, y: number) => {
    if (!account) {
      showNotification("Lütfen önce cüzdanınızı bağlayın");
      return;
    }
    
    if (!selectedColor) {
      showNotification("Lütfen önce bir renk seçin");
      return;
    }
    
    // Mevcut işlem devam ediyorsa engelleyelim
    if (loading) {
      console.log("İşlem zaten devam ediyor, lütfen bekleyin...");
      return;
    }
    
    // İşlemi başlatıyoruz
    setLoading(true);
    setNotification(null);
    
    try {
      console.log(`Piksel renklendiriliyor: (${x}, ${y}) - Renk: ${selectedColor}`);
      
      // Önce local storage'da piksel durumunu işaretle - bu doğrulamada yardımcı olacak
      try {
        localStorage.setItem('last_pixel_update', JSON.stringify({
          x, y, color: selectedColor, timestamp: Date.now(), status: 'pending'
        }));
      } catch (storageError) {
        console.error("localStorage hatası:", storageError);
      }
      
      // Blockchain işlemi
      const txHash = await colorPixel(x, y, selectedColor);
      console.log("Transaction hash:", txHash);
      
      // İşlem hash'ini sakla
      setLastTxHash(txHash);
      
      // Local storage'da işlem durumunu güncelle
      try {
        localStorage.setItem('last_pixel_update', JSON.stringify({
          x, y, color: selectedColor, timestamp: Date.now(), status: 'completed', txHash
        }));
      } catch (storageError) {
        console.error("localStorage güncelleme hatası:", storageError);
      }
      
      // Bildirim göster
      showNotification(`Piksel renklendirme işlemi başarılı: (${x}, ${y})`);
    } catch (error: any) {
      console.error("Piksel renklendirme hatası:", error);
      
      // Hata mesajını analiz et
      let errorMessage = "Piksel renklendirme işlemi başarısız oldu.";
      
      if (error.message && typeof error.message === 'string') {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Yetersiz bakiye. İşlem için yeterli STT yok.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "İşlem kullanıcı tarafından reddedildi.";
        } else if (error.message.includes("network") || error.message.includes("timeout")) {
          errorMessage = "Ağ hatası. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.";
        }
      }
      
      // Hata bildirimini göster
      showNotification(`Error: ${errorMessage}`);
      
      // Local storage'da işlem durumunu güncelle
      try {
        localStorage.setItem('last_pixel_update', JSON.stringify({
          x, y, color: selectedColor, timestamp: Date.now(), status: 'failed', error: errorMessage
        }));
      } catch (storageError) {
        console.error("localStorage güncelleme hatası:", storageError);
      }
    } finally {
      // İşlem tamamlandı, yükleme durumunu kapat
      setLoading(false);
      
      // Canvas'ı yenile - son durumu almak için
      loadPixels();
    }
  }, [account, selectedColor, loading, showNotification, loadPixels]);
  
  // Canvas tıklama işleyicisi
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Canvas'ın mevcut fiziksel boyutunu al
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Tıklamanın piksel pozisyonunu bul
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Canvas boyutunu ve grid boyutunu kullanarak doğru piksel koordinatlarını hesapla
    const totalPixelsPerSide = Math.floor(CANVAS_SIZE / (GRID_CELL_SIZE * 8));
    
    // Piksel koordinatını displayWidth'ten totalPixelsPerSide'a oranla
    const pixelX = Math.floor((mouseX / displayWidth) * totalPixelsPerSide);
    const pixelY = Math.floor((mouseY / displayHeight) * totalPixelsPerSide);
    
    // Canvas sınırları kontrolü
    if (pixelX < 0 || pixelX >= totalPixelsPerSide || pixelY < 0 || pixelY >= totalPixelsPerSide) {
      return;
    }
    
    console.log(`Mouse position: ${mouseX}, ${mouseY}, Canvas size: ${displayWidth}x${displayHeight}`);
    console.log(`Calculated pixel: (${pixelX}, ${pixelY}), Total pixels per side: ${totalPixelsPerSide}`);
    
    // Seçili pikseli güncelle
    setSelectedPixel({ x: pixelX, y: pixelY });
    
    // Piksel bilgilerini göster
    const pixel = pixels.find(p => p.x === pixelX && p.y === pixelY);
    console.log('Selected pixel:', pixelX, pixelY, pixel || 'Empty');
    
    // Piksel rengini değiştirme işlemini başlat - herkes boyama yapabilsin
    handlePixelClick(pixelX, pixelY);
  }, [pixels, CANVAS_SIZE, GRID_CELL_SIZE, handlePixelClick]);
  
  // Admin kontrolü
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (account) {
        const adminStatus = await isAdmin(account);
        setIsUserAdmin(adminStatus);
      } else {
        setIsUserAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [account]);
  
  // Piksel olaylarını dinle
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    const setupEventListener = async () => {
      try {
        console.log("Piksel event listener'ları kuruluyor...");
        
        // Global event listener'ı başlat
        await startListeningToPixelEvents();
        
        // Piksel güncellemelerini dinle
        cleanup = await listenToPixelEvents((event: Pixel) => {
          console.log("Piksel güncelleme olayı alındı:", event);
          
          // Yeni/değişen pikseli hemen UI'da göster
          drawPixel(event);
          
          // Bildirimi göster (sadece kendi piksellerimiz değilse)
          if (account && event.owner.toLowerCase() !== account.toLowerCase()) {
            setNotification(`Piksel güncellendi: (${event.x}, ${event.y})`);
            setTimeout(() => setNotification(null), 3000);
          }
        });
        
        console.log("Piksel event listener'ları kuruldu");
      } catch (error) {
        console.error("Event dinleme hatası:", error);
      }
    };
    
    // Sayfa yüklendiğinde ve hesap değiştiğinde event listener'ları ayarla
    setupEventListener();
    
    // Component unmount olduğunda cleanup
    return () => {
      console.log("Event listener'lar temizleniyor...");
      if (cleanup) {
        cleanup();
      }
    };
  }, [account, drawPixel]);
  
  return (
    <div className="w-full h-full max-h-[calc(100vh-80px)] relative bg-white rounded-lg shadow-lg border border-gray-400 flex items-center justify-center overflow-hidden" ref={containerRef}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="text-center">
            <div className="w-32 h-2 bg-gray-200 rounded-full mb-2">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              Loading Pixels... {loadingProgress}%
            </div>
          </div>
        </div>
      )}
      
      <div className="relative w-full h-full overflow-auto flex items-center justify-center p-2">
      <canvas
        ref={canvasRef}
          className="border border-gray-300 rounded-lg cursor-pointer max-w-full max-h-[calc(100vh-100px)] object-contain"
        onClick={handleCanvasClick}
          width={1024}
          height={1024}
          style={{ 
            width: 'auto', 
            height: 'auto',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 100px)',
            display: 'block'
          }}
        />
      </div>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md rounded-lg z-10">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-indigo-100 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="animate-spin mb-6 mx-auto w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Processing Transaction</h3>
            <p className="text-center text-gray-600 mb-4">Your pixel coloring operation is being processed on the blockchain...</p>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div className="flex items-center">
                <div className="mr-3 bg-indigo-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Please check your MetaMask wallet</p>
                  <p className="text-xs text-gray-500">You need to confirm the transaction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {notification && (
        <div className="notification absolute bottom-4 left-1/2 transform -translate-x-1/2 max-w-md w-full mx-4 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-start p-4">
            <div className="flex-shrink-0 pt-0.5">
              {notification.includes('Error') ? (
                <div className="bg-red-100 p-2 rounded-full">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="bg-green-100 p-2 rounded-full">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-base font-medium text-gray-800">{notification}</p>
          {lastTxHash && (
            <a 
              href={`https://shannon-explorer.somnia.network/tx/${lastTxHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 py-1 px-2 rounded-md w-fit"
                >
                  <span>View transaction</span>
                  <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => setNotification(null)}
                className="rounded-md inline-flex p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          {notification.includes('successfully') && (
            <div className="bg-green-50 border-t border-green-100 px-4 py-2 flex items-center">
              <svg className="h-5 w-5 text-green-700 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-700">Transaction completed</p>
            </div>
          )}
        </div>
      )}
      
      {/* Canvas temizleme onay modalı */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Canvas'ı Temizle</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Tüm pikseller silinecek. Bu işlem geri alınamaz! Devam etmek istiyor musunuz?</Text>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={handleClearConfirm}>
              Evet, Temizle
            </Button>
            <Button variant="ghost" onClick={onClose}>İptal</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Canvas; 