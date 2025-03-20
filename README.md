This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MongoDB Entegrasyonu

Bu projede piksel verileri MongoDB'de saklanmaktadır. Projenin çalışması için aşağıdaki adımları takip edin:

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) hesabı oluşturun (ücretsiz plan yeterlidir)
2. Yeni bir cluster oluşturun ve bağlantı bilgilerini alın
3. `.env.local` dosyasını project kök dizininde oluşturun ve şu bilgileri ekleyin:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/somniaPixel?retryWrites=true&w=majority
```

4. Vercel'e deploy ederken aynı ortam değişkenini Vercel ayarlarından da eklemeyi unutmayın.

MongoDB bağlantı URI'sini kendi cluster bilgilerinizle değiştirmeyi unutmayın.
