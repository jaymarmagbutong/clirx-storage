import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const createUserService = async ({ email, password }) => {
    try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: { email, password: hashed }
        });
        return { success: true, user: { id: user.id, email: user.email, createdAt: user.createdAt } };
    } catch (error) {
        return { success: false, error: error.message };
    }
};