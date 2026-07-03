import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET as string;

export function generateToken(payload: Record<string, any>) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "2h",
  });
}