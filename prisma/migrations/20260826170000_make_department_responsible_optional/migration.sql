-- Drop FK with RESTRICT
ALTER TABLE "DepartmentConfig" DROP CONSTRAINT "DepartmentConfig_responsibleId_fkey";

-- Make column nullable
ALTER TABLE "DepartmentConfig" ALTER COLUMN "responsibleId" DROP NOT NULL;

-- Re-add FK with SET NULL
ALTER TABLE "DepartmentConfig" ADD CONSTRAINT "DepartmentConfig_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;