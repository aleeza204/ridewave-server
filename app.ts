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

