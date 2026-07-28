require("dotenv").config();

import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import jwt from "jsonwebtoken";
import { sendToken } from "../utils/send-token";
import { sendEmail } from "../utils/sendEmail";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    const user = await prisma.user.create({
      data: { phone_number },
    });

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: "User registration failed",
    });
  }
};

// sending otp to the rider's phone before login/registration
export const sendingOtpToPhone = async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: "phone_number is required",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    (global as any).userPhoneOtpStore = (global as any).userPhoneOtpStore || {};
    (global as any).userPhoneOtpStore[phone_number] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // No SMS provider is configured yet, so print the OTP for local testing
    // and also return it directly so the app can show it on-screen.
    // TODO: remove `otp` from the response once a real SMS provider is wired up.
    console.log(`[User OTP] ${phone_number} -> ${otp}`);

    return res.status(201).json({ success: true, otp });
  } catch (error: any) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        message: "phone_number and otp are required",
      });
    }

    const store = (global as any).userPhoneOtpStore || {};
    const record = store[phone_number];

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP expired, please resend",
      });
    }

    if (Date.now() > record.expiresAt) {
      delete store[phone_number];
      return res.status(400).json({
        success: false,
        message: "OTP expired, please resend",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    delete store[phone_number];

    let user = await prisma.user.findUnique({
      where: { phone_number },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone_number },
      });
    }

    return sendToken(user, res);
  } catch (error: any) {
    console.log("VERIFY OTP ERROR:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email, name, phoneNumber, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({
        success: false,
        message: "Email and User ID are required",
      });
    }

    // Update user information
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
        email,
        phone_number: phoneNumber,
      },
    });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const expiresAt = Date.now() + 5 * 60 * 1000;

    (global as any).otpStore = (global as any).otpStore || {};
    (global as any).otpStore[email] = {
      otp,
      expiresAt,
    };

    await sendEmail(email, otp);

    const token = jwt.sign(
      {
        email,
        userId,
      },
      process.env.EMAIL_ACTIVATION_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      token,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { otp, token } = req.body;

    const decoded: any = jwt.verify(
      token,
      process.env.EMAIL_ACTIVATION_SECRET!
    );

    const email = decoded.email;
    const userId = decoded.userId;

    const record = (global as any).otpStore?.[email];

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP expired, resend again",
      });
    }

    if (Date.now() > record.expiresAt) {
      delete (global as any).otpStore[email];

      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    delete (global as any).otpStore[email];

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return sendToken(existingUser, res);

  } catch (error: any) {
    console.log(error);

    return res.status(400).json({
      success: false,
      message: "OTP expired or invalid",
    });
  }
};

export const getLoggedInUserData = async (req: any, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.log(error);
  }
};

export const createNewRide = async (req: any, res: Response) => {
  try {
    const {
      charge,
      currentLocationName,
      destinationLocationName,
      distance,
      pickupLatitude,
      pickupLongitude,
      destinationLatitude,
      destinationLongitude,
    } = req.body;

    if (
      !charge ||
      !currentLocationName ||
      !destinationLocationName ||
      !distance ||
      pickupLatitude == null ||
      pickupLongitude == null ||
      destinationLatitude == null ||
      destinationLongitude == null
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required ride details",
      });
    }

    const newRide = await prisma.rides.create({
      data: {
        userId: req.user.id,
        charge: parseFloat(charge),
        currentLocationName,
        destinationLocationName,
        distance: `${distance}`,
        pickupLatitude: parseFloat(pickupLatitude),
        pickupLongitude: parseFloat(pickupLongitude),
        destinationLatitude: parseFloat(destinationLatitude),
        destinationLongitude: parseFloat(destinationLongitude),
        status: "Pending",
      },
    });

    return res.status(201).json({
      success: true,
      newRide,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const submitReview = async (req: any, res: Response) => {
  try {
    const { rideId, rating, comment } = req.body;

    if (!rideId || rating == null) {
      return res.status(400).json({
        success: false,
        message: "rideId and rating are required",
      });
    }

    const ride = await prisma.rides.findUnique({ where: { id: rideId } });

    if (!ride || ride.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!ride.driverId) {
      return res.status(400).json({
        success: false,
        message: "This ride has no driver assigned",
      });
    }

    if (ride.status !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review a completed ride",
      });
    }

    const existingReview = await prisma.review.findFirst({ where: { rideId } });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this ride",
      });
    }

    const parsedRating = parseFloat(rating);

    const review = await prisma.review.create({
      data: {
        rideId,
        userId: req.user.id,
        driverId: ride.driverId,
        rating: parsedRating,
        comment,
      },
    });

    // recompute the driver's average rating from all of their reviews
    const driverReviews = await prisma.review.findMany({
      where: { driverId: ride.driverId },
    });
    const averageRating =
      driverReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
      driverReviews.length;

    await prisma.driver.update({
      where: { id: ride.driverId },
      data: { ratings: averageRating },
    });

    await prisma.rides.update({
      where: { id: rideId },
      data: { rating: parsedRating },
    });

    return res.status(201).json({ success: true, review });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getRidePaymentForUser = async (req: any, res: Response) => {
  try {
    const { rideId } = req.params;

    const ride = await prisma.rides.findUnique({ where: { id: rideId } });
    if (!ride || ride.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    const payment = await prisma.payment.findFirst({ where: { rideId } });
    return res.status(200).json({ success: true, payment });
  } catch (error: any) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllRides = async (req: any, res: Response) => {
  try {
    const rides = await prisma.rides.findMany({
      where: {
        userId: req.user?.id,
      },
      include: {
        driver: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // payment isn't a formal relation on `rides`, so attach it manually for
    // the ride history / payment-status badge in the app.
    const payments = await prisma.payment.findMany({
      where: { rideId: { in: rides.map((ride) => ride.id) } },
    });
    const paymentByRideId = new Map(payments.map((p) => [p.rideId, p]));
    const ridesWithPayment = rides.map((ride) => ({
      ...ride,
      payment: paymentByRideId.get(ride.id) ?? null,
    }));

    return res.status(200).json({
      success: true,
      rides: ridesWithPayment,
    });
  } catch (error) {
    console.log(error);
  }
};