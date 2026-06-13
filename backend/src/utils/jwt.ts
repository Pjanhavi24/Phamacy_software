import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'pharmacy-erp-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'pharmacy-erp-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
  name: string;
}

export interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
    issuer: 'pharmacy-erp',
    audience: 'pharmacy-erp-client',
    algorithm: 'HS256',
  };

  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      pharmacyId: payload.pharmacyId,
      name: payload.name,
    },
    ACCESS_TOKEN_SECRET,
    options
  );
};

export const generateRefreshToken = (userId: string, email: string): string => {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY as any,
    issuer: 'pharmacy-erp',
    audience: 'pharmacy-erp-client',
    algorithm: 'HS256',
  };

  return jwt.sign(
    {
      userId,
      email,
      type: 'refresh',
    },
    REFRESH_TOKEN_SECRET,
    options
  );
};

export const generateTokenPair = (payload: TokenPayload): GeneratedTokens => {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload.userId, payload.email);

  // Calculate expiry in seconds
  const expiresIn = parseExpiryToSeconds(ACCESS_TOKEN_EXPIRY);

  return { accessToken, refreshToken, expiresIn };
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const options: VerifyOptions = {
      issuer: 'pharmacy-erp',
      audience: 'pharmacy-erp-client',
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, options) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.debug('[JWT] Token expired:', error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.debug('[JWT] Invalid token:', error.message);
    }
    return null;
  }
};

export const verifyRefreshToken = (token: string): { userId: string; email: string; type: string } | null => {
  try {
    const options: VerifyOptions = {
      issuer: 'pharmacy-erp',
      audience: 'pharmacy-erp-client',
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, options) as {
      userId: string;
      email: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

export const decodeTokenWithoutVerify = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string): Date | null => {
  const decoded = decodeTokenWithoutVerify(token);
  if (!decoded || !decoded.exp) return null;
  return new Date(decoded.exp * 1000);
};

const parseExpiryToSeconds = (expiry: string): number => {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900; // 15 minutes default
  }
};

export const getRefreshTokenExpirySeconds = (): number => {
  return parseExpiryToSeconds(REFRESH_TOKEN_EXPIRY);
};

export const getAccessTokenExpirySeconds = (): number => {
  return parseExpiryToSeconds(ACCESS_TOKEN_EXPIRY);
};
