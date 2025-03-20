import { Pixel } from '@/types/Pixel';
import * as fs from 'fs';
import * as path from 'path';

// Global piksel verisi
const DATA_DIR = path.join(process.cwd(), '.next');
const PIXELS_FILE = path.join(DATA_DIR, 'pixels-data.json');

// Klasörün var olduğundan emin ol
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Veri klasörü oluşturuldu: ${DATA_DIR}`);
  }
} catch (error) {
  console.error(`Veri klasörü oluşturulamadı: ${error}`);
}

// Dosyanın en başına global değişken tanımlarını ekle
declare global {
  var pixelData: any[];
  var _pixelsInitialized: boolean;
  var _preventTestPixels: boolean;
}

// Pikselleri yükle
export const loadPixels = (): Pixel[] => {
  try {
    if (fs.existsSync(PIXELS_FILE)) {
      console.log(`Pikseller dosyadan yükleniyor: ${PIXELS_FILE}`);
      const data = fs.readFileSync(PIXELS_FILE, 'utf8');
      try {
        const pixels = JSON.parse(data);
        console.log(`${pixels.length} piksel yüklendi`);
        return pixels;
      } catch (parseError) {
        console.error(`JSON parse hatası: ${parseError}`);
        return [];
      }
    } else {
      console.log(`Piksel dosyası bulunamadı, yeni dosya oluşturulacak: ${PIXELS_FILE}`);
      fs.writeFileSync(PIXELS_FILE, JSON.stringify([]), 'utf8');
      return [];
    }
  } catch (error) {
    console.error('Piksel yükleme hatası:', error);
    return [];
  }
};

// Pikselleri kaydet
export const savePixels = (pixels: Pixel[]): void => {
  try {
    console.log(`${pixels.length} piksel şuraya kaydediliyor: ${PIXELS_FILE}`);
    fs.writeFileSync(PIXELS_FILE, JSON.stringify(pixels, null, 2), 'utf8');
    
    // Dosyanın başarıyla yazıldığını kontrol et
    if (fs.existsSync(PIXELS_FILE)) {
      const stats = fs.statSync(PIXELS_FILE);
      console.log(`Piksel dosyası boyutu: ${stats.size} bayt - Kayıt başarılı!`);
    } else {
      console.error(`Dosya oluşturulamadı: ${PIXELS_FILE}`);
    }
  } catch (error) {
    console.error(`Piksel kaydetme hatası (${PIXELS_FILE}):`, error);
  }
};

// Piksel ekle veya güncelle
export const addOrUpdatePixel = (newPixel: Pixel): void => {
  const pixels = loadPixels();
  const index = pixels.findIndex(p => p.x === newPixel.x && p.y === newPixel.y);
  
  if (index !== -1) {
    pixels[index] = newPixel;
  } else {
    pixels.push(newPixel);
  }
  
  savePixels(pixels);
};

// Pikselleri temizle
export const clearAllPixels = (): void => {
  console.log(`Tüm pikseller siliniyor: ${PIXELS_FILE}`);
  savePixels([]);
}; 