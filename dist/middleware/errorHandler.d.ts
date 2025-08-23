import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFound: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    AppError: typeof AppError;
    errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
    asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
    notFound: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=errorHandler.d.ts.map