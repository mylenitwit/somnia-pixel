import { NextRequest, NextResponse } from 'next/server';
import { Pixel } from '@/types/Pixel';
import { loadPixels, savePixels, addOrUpdatePixel, clearAllPixels } from './lib';

// Global değişken tanımı
declare global {
  var pixelData: any[];
  var _pixelsInitialized: boolean;
  var _preventTestPixels: boolean;
}

// API endpoint'i - GET
export async function GET(request: NextRequest) {
  console.log("GET /api/pixels called");
  
  // URL parametrelerini alma
  const { searchParams } = new URL(request.url);
  const startX = Number(searchParams.get('startX') || 0);
  const startY = Number(searchParams.get('startY') || 0);
  const endX = Number(searchParams.get('endX') || 1024);
  const endY = Number(searchParams.get('endY') || 1024);
  
  try {
    // Pikselleri yükle
    const allPixels = loadPixels();
    
    // Koordinat aralığına göre filtrele
    const filteredPixels = allPixels.filter(
      p => p.x >= startX && p.x <= endX && p.y >= startY && p.y <= endY
    );
    
    console.log(`${filteredPixels.length} piksel query için döndürülüyor`);
    
    // CORS header'ları ekleyelim
    return new NextResponse(JSON.stringify(filteredPixels), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, max-age=0'
      },
    });
  } catch (error) {
    console.error("Piksel yükleme hatası:", error);
    return NextResponse.json([], { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, max-age=0'
      },
    });
  }
}

// OPTIONS metodu için handler ekleyelim (CORS preflight için)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// POST handler: Yeni piksel ekle/güncelle
export async function POST(request: Request) {
  try {
    // JSON parse hatalarını daha iyi yakalamak için
    let rawData: string = '';
    let data: any;
    
    try {
      rawData = await request.text(); // Önce raw text olarak alalım
      console.log('Alınan raw veri (ilk 100 karakter):', rawData.substring(0, 100));
      
      // Boş veya geçersiz veri kontrolü
      if (!rawData || rawData.trim() === '') {
        throw new Error('Boş istek gövdesi');
      }
      
      // Veriyi JSON'a çevirelim
      data = JSON.parse(rawData);
    } catch (parseError: any) {
      console.error('JSON parse hatası:', parseError, 'Raw data ilk 100 karakter:', rawData.substring(0, 100));
      return new NextResponse(
        JSON.stringify({ error: 'Geçersiz JSON formatı', details: parseError.message }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }
    
    const { x, y, color, owner, transactionHash } = data;
    
    console.log('API: Piksel güncelleme isteği alındı:', { 
      x, y, color, owner, 
      transactionHash: transactionHash?.substring(0, 10) + '...',
      metadata: {
        timestamp: data._timestamp,
        attempt: data._attempt,
        confirmed: data._confirmed,
        finalAttempt: data._finalAttempt
      }
    });
    
    // Tüm gerekli alanların gönderildiğinden emin ol
    if (x === undefined || y === undefined || color === undefined || !owner) {
      console.error('Eksik veya geçersiz veri:', { x, y, color, owner });
      return new NextResponse(
        JSON.stringify({ error: 'Geçersiz veri: x, y, color ve owner alanları gereklidir' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }
    
    // Pikseli ekle veya güncelle (mülkiyet kontrolü yapmadan)
    // Hem global değişkende hem de dosyada saklayalım
    if (!global.pixelData) {
      global.pixelData = loadPixels(); // Mevcut pikselleri yükle
      console.log(`Global piksel veri yüklendi, ${global.pixelData.length} piksel`);
    }
    
    // Pikseli ara, varsa güncelle
    const existingIndex = global.pixelData.findIndex(
      (p: any) => p.x === x && p.y === y
    );
    
    const timestamp = new Date().toISOString();
    const newPixel = {
      x,
      y,
      color,
      owner,
      updatedAt: timestamp,
      transactionHash: transactionHash || `api-${Date.now()}`
    };
    
    if (existingIndex !== -1) {
      const oldPixel = global.pixelData[existingIndex];
      console.log(`Piksel güncelleniyor: (${x}, ${y}), eski renk: ${oldPixel.color}, yeni renk: ${color}`);
      global.pixelData[existingIndex] = newPixel;
    } else {
      global.pixelData.push(newPixel);
      console.log(`Yeni piksel eklendi: (${x}, ${y}), renk: ${color}`);
    }
    
    // Dosyaya da kaydet
    try {
      savePixels(global.pixelData);
      console.log(`Piksel verileri kaydedildi, toplam ${global.pixelData.length} piksel`);
    } catch (saveError) {
      console.error("Piksel kaydetme hatası:", saveError);
      // Kaydetme hatası olsa bile işlemi devam ettirelim
    }
    
    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        pixel: newPixel,
        totalPixels: global.pixelData.length,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error: any) {
    console.error('API Piksel ekleme/güncelleme hatası:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Piksel eklenirken bir hata oluştu', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}

// Canvas'ı temizleme API'si
export async function DELETE(request: Request) {
  try {
    // Request body'i parse et
    let bodyText;
    try {
      bodyText = await request.text();
      const body = JSON.parse(bodyText);
      const { adminAddress } = body;
      
      // Admin kontrolü - basit kontrol
      if (!adminAddress || !adminAddress.startsWith('0x')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
      
      // Pikselleri temizle
      clearAllPixels();
      
      // Global değişkeni de temizle
      if (global.pixelData) {
        global.pixelData = [];
      }
      
      return new NextResponse(
        JSON.stringify({ success: true, message: 'All pixels cleared' }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    } catch (parseError) {
      console.error("JSON parse hatası (DELETE):", parseError, "Raw body:", bodyText);
      return new NextResponse(
        JSON.stringify({ error: 'Geçersiz JSON formatı' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  } catch (error) {
    console.error("Error clearing pixels:", error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to clear pixels' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
} 