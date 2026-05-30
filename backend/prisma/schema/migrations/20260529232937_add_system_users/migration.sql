-- CreateTable
CREATE TABLE "system_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_refresh_tokens" (
    "id" TEXT NOT NULL,
    "systemUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_users_email_key" ON "system_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_refresh_tokens_token_key" ON "system_refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "system_refresh_tokens" ADD CONSTRAINT "system_refresh_tokens_systemUserId_fkey" FOREIGN KEY ("systemUserId") REFERENCES "system_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
