import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI ortam değişkeni tanımlanmamış. Lütfen .env dosyasında tanımlayın.');
}

const uri = process.env.MONGODB_URI;

// Güncel MongoDB sürümünde desteklenen seçenekleri kullan
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Geliştirme ortamında her sunucu yeniden başlatıldığında istemciyi yeniden oluştur
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
    console.log("MongoDB bağlantısı oluşturuldu (geliştirme ortamı)");
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // Production ortamında yeni istemci oluştur
  client = new MongoClient(uri);
  clientPromise = client.connect();
  console.log("MongoDB bağlantısı oluşturuldu (üretim ortamı)");
}

// MongoClient'a yapılan tüm işlemlerde bu Promise'ı kullan
export default clientPromise; 