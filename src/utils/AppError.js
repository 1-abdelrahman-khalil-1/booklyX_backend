export class AppError extends Error {
    /**
     * @param {string} message
     * @param {number} statusCode
     * @param {Record<string, string | number | boolean> | null} [params]
     * @param {unknown} [data]
     */
    constructor(message, statusCode, params, data = null) {
        super(message);
        this.statusCode = statusCode;
        this.params = params;
        this.data = data;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
