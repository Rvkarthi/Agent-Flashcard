"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { getSavedS3Config, saveS3Config } from "@/lib/aws-s3";
import { S3UploadConfig } from "@/types";
import { InteractiveButton } from "@/components/ui/InteractiveButton";
import { GlassBadge } from "@/components/ui/GlassBadge";

interface S3ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: S3UploadConfig) => void;
}

export const S3ConfigModal: React.FC<S3ConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<S3UploadConfig>(() => getSavedS3Config());
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCors, setCopiedCors] = useState(false);
  const [copiedIam, setCopiedIam] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleSave = () => {
    saveS3Config(config);
    if (onSaved) onSaved(config);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("Verifying AWS credentials and testing S3 connection...");

    try {
      const res = await fetch("/api/s3/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customBucket: config.bucketName || undefined,
          customRegion: config.region || undefined,
          customKeyId: config.accessKeyId || undefined,
          customSecretKey: config.secretAccessKey || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus("success");
        setTestMessage(data.message || `Successfully connected to S3 bucket ${data.bucketName} (${data.region})`);
      } else {
        setTestStatus("error");
        if (data.issues && data.issues.length > 0) {
          setTestMessage(data.issues.join(" | "));
        } else {
          setTestMessage(data.diagnosis || data.rawMessage || data.error || "Failed to reach S3 endpoint");
        }
      }
    } catch (e: unknown) {
      setTestStatus("error");
      setTestMessage(e instanceof Error ? e.message : "Network error during test");
    }
  };

  const corsExample = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]`;

  const iamExample = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${config.bucketName || "your-bucket-name"}",
        "arn:aws:s3:::${config.bucketName || "your-bucket-name"}/*"
      ]
    }
  ]
}`;

  const copyCorsPolicy = () => {
    navigator.clipboard.writeText(corsExample);
    setCopiedCors(true);
    setTimeout(() => setCopiedCors(false), 2000);
  };

  const copyIamPolicy = () => {
    navigator.clipboard.writeText(iamExample);
    setCopiedIam(true);
    setTimeout(() => setCopiedIam(false), 2000);
  };

  const secretLength = (config.secretAccessKey || "").trim().length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-2xl z-10 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    AWS S3 & Amplify Configuration
                    <GlassBadge variant={config.useMockSandbox ? "amber" : "emerald"}>
                      {config.useMockSandbox ? "Sandbox Mode" : "Live AWS"}
                    </GlassBadge>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Direct S3 document bucket upload with presigned URLs & server fallback
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="mt-5 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Sandbox vs Live AWS S3
                </p>
                <p className="text-xs text-zinc-400">
                  Sandbox enables immediate local testing without AWS credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    useMockSandbox: !prev.useMockSandbox,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  !config.useMockSandbox ? "bg-indigo-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    !config.useMockSandbox ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Form Fields */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  S3 Bucket Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. amzn-hackathon"
                  value={config.bucketName}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, bucketName: e.target.value.trim() }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  AWS Region (Must match your S3 bucket location)
                </label>
                <select
                  value={config.region}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, region: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                >
                  <option value="us-east-1">US East (N. Virginia) us-east-1</option>
                  <option value="us-east-2">US East (Ohio) us-east-2</option>
                  <option value="us-west-1">US West (N. California) us-west-1</option>
                  <option value="us-west-2">US West (Oregon) us-west-2</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai) ap-south-1</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore) ap-southeast-1</option>
                  <option value="eu-west-1">Europe (Ireland) eu-west-1</option>
                  <option value="eu-central-1">Europe (Frankfurt) eu-central-1</option>
                </select>
              </div>

              {/* IAM Credentials Input Fields */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      AWS Access Key ID
                    </label>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {(config.accessKeyId || "").trim().length}/20 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="AKIA..."
                    value={config.accessKeyId || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, accessKeyId: e.target.value.trim() }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <span>AWS Secret Access Key</span>
                      {secretLength > 0 && secretLength !== 40 && (
                        <span className="text-rose-400 font-mono text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                          ⚠️ Needs 40 characters (Currently {secretLength})
                        </span>
                      )}
                      {secretLength === 40 && (
                        <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          ✓ 40 characters
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showSecret ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="Paste 40-character secret key..."
                    value={config.secretAccessKey || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, secretAccessKey: e.target.value.trim() }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/60 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Note: AWS Secret Access Keys generated by IAM are always exactly 40 characters long.
                  </p>
                </div>
              </div>

              {/* S3 Bucket CORS Guide */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    Required S3 CORS Policy
                  </span>
                  <button
                    onClick={copyCorsPolicy}
                    className="text-xs text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedCors ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60 text-zinc-300 overflow-x-auto">
                  {corsExample}
                </pre>
              </div>

              {/* IAM Policy Guide */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Recommended IAM Policy
                  </span>
                  <button
                    onClick={copyIamPolicy}
                    className="text-xs text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedIam ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Policy
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/60 text-zinc-300 overflow-x-auto">
                  {iamExample}
                </pre>
              </div>

              {/* Test Connection status */}
              {testStatus !== "idle" && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                    testStatus === "testing"
                      ? "bg-zinc-900/80 border-zinc-700 text-zinc-300"
                      : testStatus === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {testStatus === "testing" && (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {testStatus === "success" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                  {testStatus === "error" && (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="leading-relaxed">{testMessage}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
              <InteractiveButton
                variant="ghost"
                size="sm"
                onClick={handleTestConnection}
              >
                Test Credentials
              </InteractiveButton>

              <div className="flex items-center gap-2.5">
                <InteractiveButton variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </InteractiveButton>
                <InteractiveButton variant="primary" size="sm" onClick={handleSave}>
                  Save Settings
                </InteractiveButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
