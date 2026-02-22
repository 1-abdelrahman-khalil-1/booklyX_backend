import { JwtPayload } from "../middleware/authenticate.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
