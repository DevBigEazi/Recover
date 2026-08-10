import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  const startTime = performance.now();

  try {
    // Check MongoDB connection status
    await connectDB();
    const isDbConnected = mongoose.connection.readyState === 1;
    const isRelayerConfigured = Boolean(process.env.BACKEND_SIGNER_PRIVATE_KEY);

    const responseTime = Math.round(performance.now() - startTime);

    return NextResponse.json(
      {
        status: isDbConnected ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: "v1.0.0",
        services: {
          database: isDbConnected ? "connected" : "disconnected",
          chain: "Electroneum Mainnet (Chain ID 52014)",
          relayerConfigured: isRelayerConfigured,
        },
        responseTimeMs: responseTime,
      },
      { status: isDbConnected ? 200 : 503 }
    );
  } catch (error: unknown) {
    const responseTime = Math.round(performance.now() - startTime);
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: "v1.0.0",
        error: "Health check failed",
        responseTimeMs: responseTime,
      },
      { status: 503 }
    );
  }
}
