-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "city" "City";
