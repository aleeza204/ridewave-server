require("dotenv").config();

import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";

import userRouter from "./routes/user.route";
import driverRouter from "./routes/driver.route";

export const app = express();

// Body parser
app.use(express.json({ limit: "50mb" }));

// Cookie parser
app.use(cookieParser());


// Routes
app.use("/api/v1", userRouter);
app.use("/api/v1/driver", driverRouter);


// Testing API
app.get(
  "/test",
  (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
      success: true,
      message: "API is working",
    });
  }
);

// TEMPORARY diagnostic endpoint - reports whether required env vars are
// present without ever exposing their actual values. Remove once the
// DATABASE_URL deployment issue is confirmed fixed.
app.get("/debug-env", (req: Request, res: Response) => {
  const check = (key: string) => {
    const value = process.env[key];
    return {
      present: !!value,
      length: value ? value.length : 0,
      startsWith: value ? value.slice(0, 12) : null,
    };
  };
  res.status(200).json({
    DATABASE_URL: check("DATABASE_URL"),
    NODE_ENV: check("NODE_ENV"),
    SMTP_MAIL: check("SMTP_MAIL"),
    SMTP_PASSWORD: check("SMTP_PASSWORD"),
    EMAIL_ACTIVATION_SECRET: check("EMAIL_ACTIVATION_SECRET"),
    PORT: process.env.PORT || null,
  });
});