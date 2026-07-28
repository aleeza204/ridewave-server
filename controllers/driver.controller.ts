require("dotenv").config();
import { NextFunction, Request, Response } from "express";
import {prisma} from "../utils/prisma";
import jwt from "jsonwebtoken";
import { sendToken } from "../utils/send-token";
import { sendEmail } from "../utils/sendEmail";

// sending otp to driver phone number
export const sendingOtpToPhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone_number } = req.body;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    (global as any).phoneOtpStore = (global as any).phoneOtpStore || {};
    (global as any).phoneOtpStore[phone_number] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // No SMS provider is configured yet, so print the OTP for local testing
    // and also return it directly so the app can show it on-screen.
    // TODO: remove `otp` from the response once a real SMS provider is wired up.
    console.log(`[Driver OTP] ${phone_number} -> ${otp}`);

    res.status(201).json({
      success: true,
      otp,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
    });
  }
};

// verifying otp for login
export const verifyPhoneOtpForLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone_number, otp } = req.body;

    const store = (global as any).phoneOtpStore || {};
    const record = store[phone_number];

    console.log(
      `[Driver OTP verify] got phone_number="${phone_number}" otp="${otp}" | stored keys=${JSON.stringify(
        Object.keys(store)
      )}`
    );

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP expired, please resend",
      });
    }

    if (Date.now() > record.expiresAt) {
      delete (global as any).phoneOtpStore[phone_number];
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

    delete (global as any).phoneOtpStore[phone_number];

    const driver = await prisma.driver.findUnique({
      where: {
        phone_number,
      },
    });

    if (!driver) {
      return res.status(400).json({
        success: false,
        message: "No driver account found for this phone number",
      });
    }

    sendToken(driver, res);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: "Something went wrong!",
    });
  }
};

// verifying phone otp for registration
export const verifyPhoneOtpForRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone_number, otp } = req.body;

    try {

      await sendingOtpToEmail(req, res);
    } catch (error) {
      console.log(error);
      res.status(400).json({
        success: false,
        message: "Something went wrong!",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
    });
  }
};

export const sendingOtpToEmail = async (req: Request, res: Response) => {
  try {
    const {
      name,
      country,
      phone_number,
      email,
      vehicle_type,
      registration_number,
      registration_date,
      driving_license,
      vehicle_color,
      rate,
    } = req.body;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign(
      {
        otp,
        driver: {
          name,
          country,
          phone_number,
          email,
          vehicle_type,
          registration_number,
          registration_date,
          driving_license,
          vehicle_color,
          rate,
        },
      },
      process.env.EMAIL_ACTIVATION_SECRET!,
      { expiresIn: "5m" }
    );

    await sendEmail(email, otp);

    res.status(201).json({
      success: true,
      token,
    });

  } catch (error: any) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// verifying email otp and creating driver account
export const verifyingEmailOtp = async (req: Request, res: Response) => {
  try {
    const { otp, token } = req.body;

    const newDriver: any = jwt.verify(
      token,
      process.env.EMAIL_ACTIVATION_SECRET!
    );

    if (newDriver.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is not correct or expired!",
      });
    }

    const {
      name,
      country,
      phone_number,
      email,
      vehicle_type,
      registration_number,
      registration_date,
      driving_license,
      vehicle_color,
      rate,
    } = newDriver.driver;

    const driver = await prisma.driver.create({
      data: {
        name,
        country,
        phone_number,
        email,
        vehicle_type,
        registration_number,
        registration_date,
        driving_license,
        vehicle_color,
        rate,
      },
    });
    sendToken(driver, res);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: "Your otp is expired!",
    });
  }
};

// get logged in driver data
export const getLoggedInDriverData = async (req: any, res: Response) => {
  try {
    const driver = req.driver;

    res.status(201).json({
      success: true,
      driver,
    });
  } catch (error) {
    console.log(error);
  }
};

// updating driver status
export const updateDriverStatus = async (req: any, res: Response) => {
  try {
    const { status } = req.body;

    const driver = await prisma.driver.update({
      where: {
        id: req.driver.id!,
      },
      data: {
        status,
      },
    });
    res.status(201).json({
      success: true,
      driver,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get drivers data with id
export const getDriversById = async (req: Request, res: Response) => {
  try {
    const { ids } = req.query as any;
    console.log(ids,'ids')
    if (!ids) {
      return res.status(400).json({ message: "No driver IDs provided" });
    }

    const driverIds = ids.split(",");

    // Only expose what the rider app needs to match/display a nearby
    // driver before booking - not licensing/registration/email PII.
    const drivers = await prisma.driver.findMany({
      where: {
        id: { in: driverIds },
      },
      select: {
        id: true,
        vehicle_type: true,
        rate: true,
        notificationToken: true,
        ratings: true,
        status: true,
      },
    });

    res.json(drivers);
  } catch (error) {
    console.error("Error fetching driver data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// accepting a ride request: claims the existing "Pending" ride created by the
// rider instead of creating a duplicate row, guarding against two drivers
// accepting the same ride at once.
export const acceptRide = async (req: any, res: Response) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res
        .status(400)
        .json({ success: false, message: "rideId is required" });
    }

    // Prisma's MongoDB connector doesn't reliably match `driverId: null` in a
    // where filter (a known Prisma+Mongo gap between "field is null" and
    // "field is unset"), so a combined updateMany filter on it always
    // returns count 0 even for genuinely unassigned rides. Check and update
    // in two steps instead - the brief race window this opens (two drivers
    // accepting the exact same ride in the same instant) is an acceptable
    // trade-off against the previous version accepting zero rides ever.
    const existingRide = await prisma.rides.findUnique({ where: { id: rideId } });

    if (!existingRide) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (existingRide.driverId) {
      return res.status(409).json({
        success: false,
        message: "This ride has already been accepted by another driver",
      });
    }

    const updatedRide = await prisma.rides.update({
      where: { id: rideId },
      data: {
        driverId: req.driver.id,
        status: "Processing",
      },
      include: { user: true },
    });

    await prisma.driver.update({
      where: { id: req.driver.id },
      data: { pendingRides: { increment: 1 } },
    });

    res.status(201).json({ success: true, updatedRide });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// updating ride status
export const updatingRideStatus = async (req: any, res: Response) => {
  try {
    const { rideId, rideStatus } = req.body;

    // Validate input
    if (!rideId || !rideStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid input data" });
    }

    const driverId = req.driver?.id;
    if (!driverId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch the ride data to get the rideCharge
    const ride = await prisma.rides.findUnique({
      where: {
        id: rideId,
      },
    });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    const rideCharge = ride.charge;

    // Update ride status
    const updatedRide = await prisma.rides.update({
      where: {
        id: rideId,
        driverId,
      },
      data: {
        status: rideStatus,
      },
    });

    if (rideStatus === "Completed") {
      // Update driver stats if the ride is completed
      await prisma.driver.update({
        where: {
          id: driverId,
        },
        data: {
          totalEarning: {
            increment: rideCharge,
          },
          totalRides: {
            increment: 1,
          },
          pendingRides: {
            decrement: 1,
          },
        },
      });

      // Auto-create the cash payment record for this ride so both apps can
      // show/confirm it without a separate "start payment" step.
      const existingPayment = await prisma.payment.findFirst({
        where: { rideId },
      });
      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            rideId,
            amount: rideCharge,
            method: "cash",
            status: "pending",
          },
        });
      }
    } else if (rideStatus === "Cancelled") {
      await prisma.driver.update({
        where: {
          id: driverId,
        },
        data: {
          cancelRides: {
            increment: 1,
          },
          pendingRides: {
            decrement: 1,
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      updatedRide,
    });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// getting drivers rides
export const getAllRides = async (req: any, res: Response) => {
  const rides = await prisma.rides.findMany({
    where: {
      driverId: req.driver?.id,
    },
    include: {
      driver: true,
      user: true,
    },
  });

  // payment isn't a formal relation on `rides`, so attach it manually for
  // the ride history / payment-status badge in the app.
  const payments = await prisma.payment.findMany({
    where: { rideId: { in: rides.map((ride: any) => ride.id) } },
  });
  const paymentByRideId = new Map(payments.map((p: any) => [p.rideId, p]));
  const ridesWithPayment = rides.map((ride: any) => ({
    ...ride,
    payment: paymentByRideId.get(ride.id) ?? null,
  }));

  res.status(201).json({
    rides: ridesWithPayment,
  });
};
export const updateNotificationToken = async (req: any, res: Response) => {
  try {
    const { notificationToken } = req.body;

    const driver = await prisma.driver.update({
      where: {
        id: req.driver.id,
      },
      data: {
        notificationToken,
      },
    });

    res.status(200).json({
      success: true,
      driver,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// driver confirms they collected the cash payment for a completed ride
export const confirmCashPayment = async (req: any, res: Response) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res
        .status(400)
        .json({ success: false, message: "rideId is required" });
    }

    const ride = await prisma.rides.findUnique({ where: { id: rideId } });
    if (!ride || ride.driverId !== req.driver.id) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    const payment = await prisma.payment.findFirst({ where: { rideId } });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "No payment record found for this ride" });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    });

    res.status(200).json({ success: true, payment: updatedPayment });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getRidePaymentForDriver = async (req: any, res: Response) => {
  try {
    const { rideId } = req.params;

    const ride = await prisma.rides.findUnique({ where: { id: rideId } });
    if (!ride || ride.driverId !== req.driver.id) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    const payment = await prisma.payment.findFirst({ where: { rideId } });
    res.status(200).json({ success: true, payment });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};