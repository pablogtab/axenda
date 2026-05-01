-- 1. Crear la tabla user_identities
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- 2. Crear índices únicos
CREATE UNIQUE INDEX "user_identities_provider_providerId_key" ON "user_identities"("provider", "providerId");

-- 3. Añadir Foreign Key
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. MIGRACIÓN DE DATOS: Mover credenciales actuales a la nueva tabla
INSERT INTO "user_identities" ("id", "userId", "provider", "providerId", "passwordHash", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(), 
    "id", 
    "provider", 
    CASE WHEN "provider" = 'EMAIL' THEN "email" ELSE "googleId" END, 
    "passwordHash", 
    "createdAt", 
    "updatedAt"
FROM "users";

-- 5. LIMPIEZA: Eliminar columnas redundantes de la tabla users
-- Nota: Primero eliminamos los índices únicos asociados si existen
DROP INDEX IF EXISTS "users_googleId_key";

ALTER TABLE "users" DROP COLUMN "passwordHash";
ALTER TABLE "users" DROP COLUMN "provider";
ALTER TABLE "users" DROP COLUMN "googleId";
