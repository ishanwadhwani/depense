import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

router.get("/", authMiddleware, async (req, res) => {
    try { 
        const qEmail = req.query.email as string | undefined;

        if (!qEmail) {
            return res.status(400).json({ error: "email query required" })
        }

        const user = await prisma.user.findUnique({
            where: { email: qEmail },
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        console.error("GET /users error:", err);
        res.status(500).json({ error: "Failed to search user" });
    }
});

export default router;