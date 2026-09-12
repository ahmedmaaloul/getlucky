import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactCompiler: true,
    turbopack: {
        // Pin the workspace root. Without it Turbopack walks up the filesystem
        // looking for a lockfile and can latch onto an unrelated one in a
        // parent directory.
        root: __dirname,
    },
};

export default nextConfig;
