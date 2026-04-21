export class AppError extends Error {
    constructor(message, statusCode, params, data = null) {
        super(message);
        this.statusCode = statusCode;
        this.params = params;
        this.data = data;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
