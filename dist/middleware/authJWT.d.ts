import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}
interface JWTPayload {
    id: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const generateToken: (payload: {
    id: string;
    email: string;
    role: string;
}) => string;
export declare const generateRefreshToken: (payload: {
    id: string;
    email: string;
    role: string;
}) => string;
export declare const verifyRefreshToken: (token: string) => JWTPayload;
declare const _default: {
    authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
    requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
    optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
    generateToken: (payload: {
        id: string;
        email: string;
        role: string;
    }) => string;
    generateRefreshToken: (payload: {
        id: string;
        email: string;
        role: string;
    }) => string;
    verifyRefreshToken: (token: string) => JWTPayload;
};
export default _default;
//# sourceMappingURL=authJWT.d.ts.map