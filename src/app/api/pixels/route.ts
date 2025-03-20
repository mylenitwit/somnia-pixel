import { NextRequest, NextResponse } from 'next/server';
import { Pixel } from '@/types/Pixel';
import clientPromise from '@/lib/mongodb';

// Piksel koleksiyonu adı
const COLLECTION_NAME = 'pixels';

// Pikselleri yükle
const loadPixels = async (): Promise<Pixel[]> => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Tüm pikselleri al
    const pixels = await collection.find({}).toArray();
    console.log(`MongoDB'den ${pixels.length} piksel yüklendi`);
    return pixels.map(p => ({
      x: p.x,
      y: p.y,
      color: p.color,
      owner: p.owner,
      updatedAt: p.updatedAt,
      transactionHash: p.transactionHash
    })) as Pixel[];
  } catch (error) {
    console.error('MongoDB piksel yükleme hatası:', error);
    return [];
  }
};

// Pikselleri kaydet/güncelle
const savePixel = async (newPixel: Pixel): Promise<boolean> => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Piksel zaten var mı kontrol et
    const existingPixel = await collection.findOne({ 
      x: newPixel.x, 
      y: newPixel.y 
    });
    
    if (existingPixel) {
      // Var olan pikseli güncelle
      await collection.updateOne(
        { x: newPixel.x, y: newPixel.y },
        { $set: newPixel }
      );
      console.log(`Piksel güncellendi: (${newPixel.x}, ${newPixel.y})`);
    } else {
      // Yeni piksel ekle
      await collection.insertOne(newPixel);
      console.log(`Yeni piksel eklendi: (${newPixel.x}, ${newPixel.y})`);
    }
    
    return true;
  } catch (error) {
    console.error('MongoDB piksel kaydetme hatası:', error);
    return false;
  }
};

// Pikselleri temizle
const clearAllPixels = async (): Promise<boolean> => {
  try {
    console.log('Tüm pikseller temizleniyor (MongoDB)');
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);
    
    // Tüm belgeleri sil
    const result = await collection.deleteMany({});
    console.log(`${result.deletedCount} piksel silindi`);
    return true;
  } catch (error) {
    console.error('MongoDB piksel temizleme hatası:', error);
    return false;
  }
};

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
    // MongoDB'den tüm pikselleri yükle
    const allPixels = await loadPixels();
    
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
    
    const timestamp = new Date().toISOString();
    const newPixel = {
      x,
      y,
      color,
      owner,
      updatedAt: timestamp,
      transactionHash: transactionHash || `api-${Date.now()}`
    };
    
    // MongoDB'ye kaydet
    const success = await savePixel(newPixel);
    
    if (success) {
      return NextResponse.json({ success: true, pixel: newPixel });
    } else {
      return NextResponse.json(
        { error: 'Veritabanına kaydedilirken bir hata oluştu' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API Piksel ekleme/güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Piksel eklenirken bir hata oluştu', details: error.message },
      { status: 500 }
    );
  }
} 