import jwt from "jsonwebtoken";

export const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
