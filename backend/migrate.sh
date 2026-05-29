#!/bin/sh
cat > prisma.config.ts << EOF
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: { url: '$DATABASE_URL' }
});
EOF
npx prisma migrate deploy
rm -f prisma.config.ts
