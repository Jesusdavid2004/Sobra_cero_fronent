"use client";

import { useEffect, useRef, useState } from "react";

import { parsePickupPayload, type PickupCredential } from "@/lib/pickup-qr";

type Props = { t: Record<string, string>; onScan: (credential: PickupCredential) => void };
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

const SCAN_INTERVAL_MS = 250;
const QR_FORMAT = "qr_code";

function detectorConstructor(): DetectorConstructor | undefined {
  return (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
}

/**
 * Reads a pickup QR with the camera when the browser has a built-in barcode detector. Where it
 * does not, the shop owner types the reference and code instead; nothing else changes.
 */
export default function PickupScanner({ t, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    setSupported(
      detectorConstructor() !== undefined &&
        typeof navigator.mediaDevices?.getUserMedia === "function",
    );
  }, []);

  useEffect(() => {
    const Detector = detectorConstructor();
    const video = videoRef.current;
    if (!active || !Detector || !video) return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;

    const scan = async (detector: Detector) => {
      try {
        const codes = await detector.detect(video);
        const credential = codes.map((code) => parsePickupPayload(code.rawValue)).find(Boolean);
        if (credential) {
          onScanRef.current(credential);
          setActive(false);
        } else if (codes.length > 0) {
          setMessage(t.pickupScanInvalid);
        }
      } catch {
        // A frame that cannot be read is skipped; the next tick tries again.
      }
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: [QR_FORMAT] });
        timer = setInterval(() => void scan(detector), SCAN_INTERVAL_MS);
      } catch {
        setMessage(t.pickupScanDenied);
        setActive(false);
      }
    };
    void start();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, t.pickupScanInvalid, t.pickupScanDenied]);

  if (!supported) {
    return <p className="mt-3 text-xs text-c5b6257">{t.pickupScanUnsupported}</p>;
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setActive((current) => !current);
        }}
        className="rounded-xl border border-ccfdac6 bg-cf4f7f1 px-4 py-2 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1"
      >
        {active ? t.pickupScanStop : t.pickupScanButton}
      </button>
      {active ? (
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label={t.pickupScanHint}
          className="mt-3 aspect-video w-full max-w-sm rounded-2xl bg-black object-cover"
        />
      ) : null}
      {message ? (
        <p role="status" className="mt-2 text-sm text-stone-600">
          {message}
        </p>
      ) : null}
    </div>
  );
}
