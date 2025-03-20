/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Üretim derlemesinde ESLint kontrolünü devre dışı bırak
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 