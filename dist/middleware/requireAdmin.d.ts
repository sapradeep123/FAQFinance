import { Request, Response, NextFunction } from 'express';
export interface AdminRequest extends Request {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const isAdmin: (userId: number) => Promise<boolean>;
//# sourceMappingURL=requireAdmin.d.ts.map