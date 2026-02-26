export class AppError extends Error {
    public statusCode: number;
    public params?: Record<string, string>;

    constructor(message: string, statusCode: number, params?: Record<string, string>) {
        super(message);
        this.statusCode = statusCode;
        this.params = params;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
