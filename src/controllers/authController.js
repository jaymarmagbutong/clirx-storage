import { generateToken, revokeToken, verifyToken } from '../services/auth/jwtHelper.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/auth/mailer.js';

const prisma = new PrismaClient();

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email + " attempt login");
        
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).send({ error: 'Invalid email or password' });
        }

        // Compare password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid email or password' });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(403).send({ error: 'Please verify your email before logging in.' });
        }

        // Create payload for the token
        const payload = { userId: user.id, email: user.email };

        // Generate JWT
        const token = generateToken(payload);

        res.status(200).send({ token });
    } catch (error) {
        res.status(500).send({ error: 'Login failed' });
    }
};


export const signOutUser = async (req, res) => {
    try {
        const token = req.body.token;

        if (!token) {
            return res.status(400).send({ error: 'Token is required for logout' });
        }

        try {
            verifyToken(token); // Verify the token to ensure it’s valid
            revokeToken(token); // Revoke the token
            return res.status(200).send({ message: 'Logout successful' });
        } catch (error) {
            return res.status(401).send({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to revoke token' });
    }
};

export const verifyUser = async (req, res) => {
    try {
        const token = await req.params.token;

        if (!token) {
            return res.status(400).send({ error: 'Token is required for verification' });
        }

        try {
            const decoded = verifyToken(token);
            return res.status(200).send({ message: 'Token is valid', decoded });
        } catch (error) {
            return res.status(401).send({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        res.status(500).send({ error: 'Failed to verify token' });
    }
}

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send({ error: 'Verification token is required' });
        }

        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        });

        if (!user) {
            return res.status(400).send({ error: 'Invalid or expired verification token' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null
            }
        });

        // Generate session JWT token so the user is auto-logged in upon verification
        const tokenPayload = { userId: user.id, email: user.email };
        const sessionToken = generateToken(tokenPayload);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/login?verified=true&token=${sessionToken}`);
    } catch (error) {
        res.status(500).send({ error: 'Verification failed: ' + error.message });
    }
};

export const googleLoginOrRegister = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).send({ error: 'Google ID token is required' });
        }

        // Verify ID token by calling Google Tokeninfo API
        const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
        const verifyRes = await fetch(googleVerifyUrl);
        
        if (!verifyRes.ok) {
            return res.status(401).send({ error: 'Invalid Google ID token' });
        }

        const payload = await verifyRes.json();
        
        // Ensure email is verified by Google
        if (payload.email_verified !== 'true' && payload.email_verified !== true) {
            return res.status(400).send({ error: 'Google email is not verified' });
        }

        // Verify client ID / audience matches (if configured)
        const expectedClientId = process.env.GOOGLE_CLIENT_ID;
        if (expectedClientId && payload.aud !== expectedClientId) {
            return res.status(401).send({ error: 'Audience mismatch. Invalid client ID.' });
        }

        const email = payload.email;

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // Register new user since they don't exist
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const hashed = await bcrypt.hash(randomPassword, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');

            user = await prisma.user.create({
                data: {
                    email,
                    password: hashed,
                    isVerified: false, // Must verify via email before dashboard access
                    verificationToken
                }
            });

            // Send verification email in background
            sendVerificationEmail(email, verificationToken).catch(err => {
                console.error('Async mailer error:', err.message);
            });

            console.log(`Registered new user via Google (pending verification): ${email}`);

            return res.status(200).send({
                requiresVerification: true,
                message: `Registration successful! A verification email has been sent to ${email}. Please check your email to activate your account.`
            });
        }

        if (!user.isVerified) {
            // Re-send verification email for existing unverified user attempting Google sign-in
            const verificationToken = crypto.randomBytes(32).toString('hex');
            await prisma.user.update({
                where: { id: user.id },
                data: { verificationToken }
            });

            sendVerificationEmail(email, verificationToken).catch(err => {
                console.error('Async mailer error:', err.message);
            });

            console.log(`Re-sent verification email via Google sign-in: ${email}`);

            return res.status(200).send({
                requiresVerification: true,
                message: `Account is not verified yet. A new verification email has been sent to ${email}. Please check your email.`
            });
        }

        // Generate our JWT
        const tokenPayload = { userId: user.id, email: user.email };
        const token = generateToken(tokenPayload);

        res.status(200).send({ token });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).send({ error: 'Google authentication failed' });
    }
};


