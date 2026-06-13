import { prisma } from '../db/prisma';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';

const router = Router();

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.NODE_ENV === 'production' ? '15m' : '8h' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    const user = await prisma.user.findFirst({ where: { email, isActive: true } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '5m' });
      return res.status(200).json({ requires2FA: true, tempToken });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, storeId: user.storeId },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await prisma.user.findFirst({ where: { id: payload.userId, isActive: true } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const tokens = generateTokens(user.id, user.role);
    return res.json(tokens);
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', async (_req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});

// POST /auth/2fa/setup
router.post('/2fa/setup', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `PharmacyERP (${user.email})` });
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret.base32 } });
    const qr = await qrcode.toDataURL(secret.otpauth_url!);
    return res.json({ secret: secret.base32, qrCode: qr });
  } catch (err) {
    console.error('2FA setup error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /auth/2fa/verify
router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { tempToken, token } = req.body;
    const payload = jwt.verify(tempToken, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorSecret) return res.status(404).json({ message: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) return res.status(401).json({ message: 'Invalid 2FA code' });

    if (!user.twoFactorEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    }

    const tokens = generateTokens(user.id, user.role);
    return res.json({ ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      select: { id: true, name: true, email: true, role: true, storeId: true, phone: true, isActive: true, lastLoginAt: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
