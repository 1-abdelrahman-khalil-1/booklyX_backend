import { Router } from "express";
import { Role } from "../../../generated/prisma/client.js";
import { authenticate, authorize } from "../../../middleware/authenticate.js";
import {
  addFavoriteBranchHandler,
  removeFavoriteBranchHandler,
  addFavoriteStaffHandler,
  removeFavoriteStaffHandler,
  getClientFavouritesHandler,
} from "./favourites.controller.js";

const favouritesRouter = Router();
favouritesRouter.use(authenticate, authorize(Role.client));

favouritesRouter.post("/favourites/branches/:id", addFavoriteBranchHandler);
favouritesRouter.delete("/favourites/branches/:id", removeFavoriteBranchHandler);
favouritesRouter.post("/favourites/staff/:id", addFavoriteStaffHandler);
favouritesRouter.delete("/favourites/staff/:id", removeFavoriteStaffHandler);
favouritesRouter.get("/favourites", getClientFavouritesHandler);

export default favouritesRouter;
