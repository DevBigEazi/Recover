"use client";

import { useState } from "react";
import { useConnect } from "thirdweb/react";
import { inAppWallet, preAuthenticate } from "thirdweb/wallets";
import { client } from "@/lib/client";
import {
  X,
  AlertCircle,
  Mail,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebookF } from "react-icons/fa";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = "select" | "email-otp";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { connect } = useConnect();

  const [step, setStep] = useState<AuthStep>("select");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep("select");
    setEmail("");
    setOtpSent(false);
    setOtpCode("");
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSocialConnect = async (
    strategy: "google" | "apple" | "facebook"
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({ client, strategy });
        return wallet;
      });
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : `Failed to sign in with ${strategy}.`;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await preAuthenticate({
        client,
        strategy: "email",
        email: email.trim(),
      });
      setOtpSent(true);
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please check your email.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !email.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client,
          strategy: "email",
          email: email.trim(),
          verificationCode: otpCode.trim(),
        });
        return wallet;
      });
      handleClose();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Invalid or expired verification code. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-ink/50 backdrop-blur-xs transition-opacity duration-300">
      <div
        className="w-full max-w-md bg-neutral-white border border-neutral-mist rounded-2xl shadow-xl overflow-hidden animate-fade-in relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-slate hover:text-primary p-1.5 rounded-lg hover:bg-neutral-mist transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-neutral-mist text-center space-y-1">
          <h2 className="text-2xl font-bold text-primary font-display">
            Sign In to Recover
          </h2>
          <p className="text-xs text-neutral-slate max-w-xs mx-auto">
            Connect to secure your physical items and manage recovery options.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {step === "select" ? (
            <div className="space-y-3">
              {/* Email Option */}
              <button
                onClick={() => setStep("email-otp")}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
              >
                <Mail className="w-4 h-4" />
                <span>Continue with Email</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="grow border-t border-neutral-mist" />
                <span className="shrink mx-4 text-neutral-500 text-xs font-medium uppercase tracking-wider select-none">
                  or sign in with
                </span>
                <div className="grow border-t border-neutral-mist" />
              </div>

              {/* Social Logins */}
              <div className="space-y-2">
                {/* Google */}
                <button
                  onClick={() => handleSocialConnect("google")}
                  disabled={isLoading}
                  className="w-full bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-xs"
                >
                  <FcGoogle className="w-4.5 h-4.5 text-[18px]" />
                  <span>Continue with Google</span>
                </button>

                {/* Apple */}
                <button
                  onClick={() => handleSocialConnect("apple")}
                  disabled={isLoading}
                  className="w-full bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-xs"
                >
                  <FaApple className="w-4.5 h-4.5 text-[18px]" />
                  <span>Continue with Apple</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={() => handleSocialConnect("facebook")}
                  disabled={isLoading}
                  className="w-full bg-neutral-white hover:bg-neutral-mist border border-neutral-mist text-primary font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2.5 shadow-xs"
                >
                  <FaFacebookF className="w-4 h-4 text-[#1877F2] text-[18px]" />
                  <span>Continue with Facebook</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!otpSent ? (
                /* Step 1: Email Input */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-sm text-primary placeholder-neutral-slate/50 outline-hidden transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: OTP Input */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="auth-otp"
                        className="block text-xs font-semibold text-neutral-slate uppercase tracking-wider"
                      >
                        Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Change Email
                      </button>
                    </div>
                    <input
                      id="auth-otp"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                      disabled={isLoading}
                      className="w-full text-center tracking-widest border border-neutral-mist hover:border-gray-300 focus:border-accent focus:ring-1 focus:ring-accent rounded-xl px-4 py-3 text-lg font-bold text-primary placeholder-neutral-slate/30 outline-hidden transition-all"
                    />
                    <p className="text-[10px] text-neutral-slate mt-1 text-center">
                      We sent a 6-digit code to{" "}
                      <span className="font-semibold text-primary">{email}</span>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-neutral-white font-semibold rounded-xl py-3 text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Verify &amp; Sign In</span>
                    )}
                  </button>
                </form>
              )}

              {/* Back to options */}
              {!isLoading && (
                <button
                  onClick={() => setStep("select")}
                  className="w-full text-center text-xs font-semibold text-neutral-slate hover:text-primary transition-colors py-1 cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Other sign-in options
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
