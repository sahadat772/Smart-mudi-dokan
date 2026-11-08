import type { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "./firebaseAdmin.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function verifyOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const idToken = authHeader.split(" ")[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (decodedToken.uid !== process.env.OWNER_UID) {
      return res.status(403).json({
        success: false,
        message: "Only the shop owner can perform this action.",
      });
    }

    const ownerDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (
      !ownerDoc.exists ||
      ownerDoc.data()?.role !== "owner" ||
      ownerDoc.data()?.active !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "Owner account is inactive or invalid.",
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error) {
    console.error("Owner verification failed:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}
