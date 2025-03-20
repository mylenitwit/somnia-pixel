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
    return NextResponse.json(filteredPixels);
  } catch (error) {
    console.error("Piksel yükleme hatası:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST handler: Yeni piksel ekle/güncelle
export async function POST(request: Request) {
  try {
    // JSON parse hatalarını daha iyi yakalamak için
    let rawData: string = '';
    let data: any;
    
    try {
      rawData = await request.text(); // Önce raw text olarak alalım
      console.log('Alınan raw veri:', rawData);
      
      // Boş veya geçersiz veri kontrolü
      if (!rawData || rawData.trim() === '') {
        throw new Error('Boş istek gövdesi');
      }
      
      // Veriyi JSON'a çevirelim
      data = JSON.parse(rawData);
    } catch (parseError: any) {
      console.error('JSON parse hatası:', parseError, 'Raw data:', rawData);
      return NextResponse.json(
        { error: 'Geçersiz JSON formatı', details: parseError.message },
        { status: 400 }
      );
    }
    
    const { x, y, color, owner, transactionHash } = data;
    
    console.log('API: Piksel güncelleme isteği alındı:', { x, y, color, owner, transactionHash });
    
    // Tüm gerekli alanların gönderildiğinden emin ol
    if (x === undefined || y === undefined || color === undefined || !owner) {
      return NextResponse.json(
        { error: 'Geçersiz veri: x, y, color ve owner alanları gereklidir' },
        { status: 400 }
      );
    }
    
    // Pikseli ekle veya güncelle (mülkiyet kontrolü yapmadan)
    // Hem global değişkende hem de dosyada saklayalım
    if (!global.pixelData) {
      global.pixelData = loadPixels(); // Mevcut pikselleri yükle
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
      global.pixelData[existingIndex] = newPixel;
      console.log(`Piksel güncellendi: (${x}, ${y})`);
    } else {
      global.pixelData.push(newPixel);
      console.log(`Yeni piksel eklendi: (${x}, ${y})`);
    }
    
    // Dosyaya da kaydet
    savePixels(global.pixelData);
    
    return NextResponse.json({ success: true, pixel: newPixel });
  } catch (error: any) {
    console.error('API Piksel ekleme/güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Piksel eklenirken bir hata oluştu', details: error.message },
      { status: 500 }
    );
  }
}

// Canvas'ı temizleme API'si
export async function DELETE(request: Request) {
  try {
    // Request body'i parse et
    const body = await request.json();
    const { adminAddress } = body;
    
    // Admin kontrolü - basit kontrol
    if (!adminAddress || !adminAddress.startsWith('0x')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Pikselleri temizle
    clearAllPixels();
    
    // Global değişkeni de temizle
    if (global.pixelData) {
      global.pixelData = [];
    }
    
    return NextResponse.json({ success: true, message: 'All pixels cleared' });
  } catch (error) {
    console.error("Error clearing pixels:", error);
    return NextResponse.json({ error: 'Failed to clear pixels' }, { status: 500 });
  }
} 