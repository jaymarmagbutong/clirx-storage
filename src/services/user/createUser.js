import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendVerificationEmail } from '../auth/mailer.js';

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

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user as unverified
        const user = await prisma.user.create({
            data: { 
                email, 
                password: hashed,
                isVerified: false,
                verificationToken
            }
        });

        // Send verification email in background (don't block the response)
        sendVerificationEmail(email, verificationToken).catch(err => {
            console.error('Async mailer error:', err.message);
        });

        return { 
            success: true, 
            user: { 
                id: user.id, 
                email: user.email, 
                isVerified: user.isVerified,
                createdAt: user.createdAt 
            } 
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};