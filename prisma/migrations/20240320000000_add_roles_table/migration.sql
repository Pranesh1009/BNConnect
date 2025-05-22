-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role" ("name");

-- CreateIndex
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser" ("A", "B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser" ("B");

-- AddForeignKey
ALTER TABLE "_RoleToUser"
ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser"
ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default roles
INSERT INTO
    "Role" (
        "id",
        "name",
        "description",
        "createdAt",
        "updatedAt"
    )
VALUES (
        gen_random_uuid (),
        'SUPER_ADMIN',
        'Super Administrator with full access',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid (),
        'SUB_ADMIN',
        'Sub Administrator with limited access',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        gen_random_uuid (),
        'LEADER',
        'Team Leader with basic access',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

-- Assign SUPER_ADMIN role to existing users
INSERT INTO
    "_RoleToUser" ("A", "B")
SELECT r.id, u.id
FROM "Role" r, "User" u
WHERE
    r.name = 'SUPER_ADMIN';