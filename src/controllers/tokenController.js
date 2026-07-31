import {
    listTokensService,
    generateTokenService,
    revokeTokenService
} from '../services/user/tokenServices.js';

export const listTokens = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await listTokensService(userId);
        if (result.success) {
            res.status(200).json({ tokens: result.tokens });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const generateToken = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const email = req.user?.email;
        const { name } = req.body;

        if (!userId || !email) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Token name is required' });
        }

        const result = await generateTokenService(userId, email, name.trim());
        if (result.success) {
            res.status(201).json({ token: result.token });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const revokeToken = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await revokeTokenService(userId, id);
        if (result.success) {
            res.status(200).json({ message: 'Token revoked successfully' });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
