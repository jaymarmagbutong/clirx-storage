import nodemailer from 'nodemailer';

const getTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null; // Local debug fallback
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass
        }
    });
};

export const sendVerificationEmail = async (email, token) => {
    const backendUrl = process.env.API_URL || 'http://localhost:8000';
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

    const transporter = getTransporter();

    if (!transporter) {
        // Fallback banner for local testing
        console.log(`
┌────────────────────────────────────────────────────────┐
│             ✉️  MOCK EMAIL VERIFICATION                │
├────────────────────────────────────────────────────────┤
│  Recipient:  ${email.padEnd(42)}│
│                                                        │
│  Please click the link below to verify your account:   │
│  ${verificationUrl.padEnd(54)}│
└────────────────────────────────────────────────────────┘
        `);
        return;
    }

    const mailOptions = {
        from: process.env.SMTP_FROM || '"Clirx Storage Cloud" <noreply@clirxcloud.com>',
        to: email,
        subject: 'Verify Your Clirx Cloud Account',
        text: `Welcome to Clirx Storage Cloud!\n\nPlease verify your email by clicking the link below:\n\n${verificationUrl}\n\nThank you!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #6366f1; text-align: center;">Welcome to Clirx Storage Cloud!</h2>
                <p>Hello,</p>
                <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
                </div>
                <p style="font-size: 12px; color: #64748b;">If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p style="font-size: 12px; color: #6366f1; word-break: break-all;">${verificationUrl}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">This is an automated email, please do not reply.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent successfully to ${email}`);
    } catch (error) {
        console.error(`Failed to send verification email to ${email}:`, error.message);
        // Fall back to console log if SMTP sending failed
        console.log(`[Backup Link] Verify account: ${verificationUrl}`);
    }
};
