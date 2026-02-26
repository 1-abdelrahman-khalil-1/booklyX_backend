export class AppError extends Error {
    constructor(message, statusCode, params) {
        super(message);
        this.statusCode = statusCode;
        this.params = params;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
