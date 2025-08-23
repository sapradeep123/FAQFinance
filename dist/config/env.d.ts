interface Config {
    port: number;
    nodeEnv: string;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        ssl: boolean;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    marketDataApiKey: string;
    llmApiKey: string;
    llmApiUrl: string;
    GOOGLE_SHEETS_ID?: string;
    GOOGLE_API_KEY?: string;
    SERPAPI_KEY?: string;
    FINNHUB_KEY?: string;
    admin: {
        email: string;
        password: string;
    };
    logLevel: string;
}
export declare const config: Config;
export default config;
//# sourceMappingURL=env.d.ts.map