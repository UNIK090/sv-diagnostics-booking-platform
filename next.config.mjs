/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native addon — it must stay a real require() at runtime,
  // not be bundled into a server chunk.
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
