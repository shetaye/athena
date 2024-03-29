import express from "express";
import logger from "@/logging";
import { Request, Response, NextFunction } from "express";
import "@/express-shim";
import axios from "axios";
const router = express.Router();

// Health check
router.get("/", function (_1, res, _3) {
  res.status(200).json({ status: "healthy" });
});

// Auth
import authHandler from "./auth";
router.use("/auth", authHandler);

// Auth Scanner
router.use(function (req, res, next) {
  const authHeader = req.headers.authorization;
  if(!authHeader) return next({ status: 401, message: "Invalid Authorization" });
  axios({
    method: 'get',
    url: 'https://discordapp.com/api/oauth2/@me',
    headers: {
      "Authorization": authHeader
    }
  })
  .then((response) => {
    const data = response.data;
    res.locals.user = data.user;
    next();
  })
  .catch(() => {
    next({ status: 401, message: "Invalid Authorization" });
  });
});

// Server
import serverHandler from "./server";
router.use("/server", serverHandler);

// Error handling
router.use(function (err: any, _0: Request, res: Response, _1: NextFunction) {
  logger.info(`[API] ${err.status || 500} : ${err.message}`);
  res.status(err.status || 500).json({ error: err.message });
})

export default router;
