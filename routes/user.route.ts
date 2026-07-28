import express from "express";
import {
  createNewRide,
  getAllRides,
  getLoggedInUserData,
  getRidePaymentForUser,
  registerUser,
  sendingOtpToPhone,
  submitReview,
  verifyOtp,
  verifyEmailOtp,
  sendEmailOtp
} from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';

const userRouter = express.Router();

userRouter.post("/registration", registerUser);
userRouter.post("/send-otp", sendingOtpToPhone);
userRouter.post("/verify-otp", verifyOtp);
userRouter.put("/sign-up-user", registerUser);
userRouter.post("/email-otp-request", sendEmailOtp);
userRouter.put("/email-otp-verify", verifyEmailOtp);
userRouter.post("/resend-email-otp", sendEmailOtp);
userRouter.get("/me", isAuthenticated, getLoggedInUserData);
userRouter.get("/get-rides", isAuthenticated, getAllRides);
userRouter.post("/create-new-ride", isAuthenticated, createNewRide);
userRouter.post("/submit-review", isAuthenticated, submitReview);
userRouter.get("/payment/:rideId", isAuthenticated, getRidePaymentForUser);

export default userRouter;