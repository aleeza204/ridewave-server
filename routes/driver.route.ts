import express from "express";
import {
  acceptRide,
  confirmCashPayment,
  getAllRides,
  getDriversById,
  getLoggedInDriverData,
  getRidePaymentForDriver,
  sendingOtpToPhone,
  updateDriverStatus,
  updateNotificationToken,
  updatingRideStatus,
  verifyingEmailOtp,
  verifyPhoneOtpForLogin,
  verifyPhoneOtpForRegistration,
} from "../controllers/driver.controller";
import { isAuthenticated, isAuthenticatedDriver } from '../middleware/isAuthenticated';

const driverRouter = express.Router();

driverRouter.post("/send-otp", sendingOtpToPhone);

driverRouter.post("/login", verifyPhoneOtpForLogin);

driverRouter.post("/verify-otp", verifyPhoneOtpForRegistration);

driverRouter.post("/registration-driver", verifyingEmailOtp);

driverRouter.get("/me", isAuthenticatedDriver, getLoggedInDriverData);

driverRouter.get("/get-drivers-data", isAuthenticated, getDriversById);

driverRouter.put("/update-status", isAuthenticatedDriver, updateDriverStatus);

driverRouter.put(
  "/update-notification-token",
  isAuthenticatedDriver,
  updateNotificationToken
);

driverRouter.post("/accept-ride", isAuthenticatedDriver, acceptRide);

driverRouter.put(
  "/update-ride-status",
  isAuthenticatedDriver,
  updatingRideStatus
);

driverRouter.get("/get-rides", isAuthenticatedDriver, getAllRides);

driverRouter.put(
  "/confirm-payment",
  isAuthenticatedDriver,
  confirmCashPayment
);

driverRouter.get(
  "/payment/:rideId",
  isAuthenticatedDriver,
  getRidePaymentForDriver
);

export default driverRouter;