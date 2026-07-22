-- CreateTable
CREATE TABLE "SMTPConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "host" STRING NOT NULL,
    "port" INT4 NOT NULL DEFAULT 587,
    "user" STRING NOT NULL,
    "password" STRING NOT NULL,
    "fromName" STRING NOT NULL DEFAULT 'SDC Form',
    "fromEmail" STRING NOT NULL,
    "secure" BOOL NOT NULL DEFAULT false,
    "isActive" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMTPConfig_pkey" PRIMARY KEY ("id")
);
