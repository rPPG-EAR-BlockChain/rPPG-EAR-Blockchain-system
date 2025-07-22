import { useState, useEffect, useRef } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const FPS = 30;
const EAR_THRESH = 0.2;

function getDistance(p1: number[], p2: number[]) {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

function calculateEAR(landmarks: NormalizedLandmark[], indices: number[]) {
  const p = indices.map((i) => [landmarks[i].x, landmarks[i].y]);
  const hor = getDistance(p[0], p[3]);
  const ver = (getDistance(p[1], p[5]) + getDistance(p[2], p[4])) / 2;
  return hor !== 0 ? ver / hor : 0;
}

function computeFFT(data: number[]) {
  const N = data.length;
  const mean = data.reduce((sum, x) => sum + x, 0) / N;
  const centered = data.map((x) => x - mean);
  const smooth = centered.map((x, i, arr) => {
    const w = [arr[i - 2], arr[i - 1], x, arr[i + 1], arr[i + 2]];
    return (
      w.filter(Boolean).reduce((a, b) => a + b, 0) / w.filter(Boolean).length
    );
  });

  const re = new Array(N).fill(0);
  const im = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      re[k] += smooth[n] * Math.cos(angle);
      im[k] += smooth[n] * Math.sin(angle);
    }
  }
  const fft = re.map((r, i) => Math.sqrt(r ** 2 + im[i] ** 2));
  const freqs = Array.from({ length: N / 2 }, (_, i) => (i * FPS) / N);
  return { freqs, fftVals: fft.slice(0, N / 2) };
}

function getEulerAngles(
  landmarks: NormalizedLandmark[]
): [number, number, number] {
  const nose = landmarks[1];
  const chin = landmarks[152];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const forehead = landmarks[10];

  const faceHeight = Math.abs(chin.y - forehead.y);
  const normPitch = (chin.y - nose.y) / (faceHeight || 1);
  const pitch = (normPitch - 0.42) * 120;

  const faceCenterX = (leftEye.x + rightEye.x) / 2;
  const dxYaw = nose.x - faceCenterX;
  const yaw = dxYaw * 400;

  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  return [pitch, yaw, roll];
}

export function useEAR(landmarks: NormalizedLandmark[] | null) {
  const [ear, setEar] = useState(0);
  const [blinkPerMin, setBlinkPerMin] = useState(0);
  const [score, setScore] = useState(100);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [roll, setRoll] = useState(0);

  const earBuf = useRef<number[]>([]);
  const pitchBuf = useRef<number[]>([]);
  const yawBuf = useRef<number[]>([]);
  const headDownFrames = useRef(0);

  useEffect(() => {
    if (!landmarks) return;

    const leftEAR = calculateEAR(landmarks, LEFT_EYE);
    const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
    const avgEAR = (leftEAR + rightEAR) / 2;
    setEar(avgEAR);

    earBuf.current.push(avgEAR);
    if (earBuf.current.length > FPS * 10) earBuf.current.shift();

    const [p, y, r] = getEulerAngles(landmarks);
    const absPitch = Math.abs(p);
    const absYaw = Math.abs(y);
    const absRoll = Math.abs(r);

    setPitch(absPitch);
    setYaw(absYaw);
    setRoll(absRoll);

    pitchBuf.current.push(p);
    yawBuf.current.push(y);
    if (pitchBuf.current.length > 150) pitchBuf.current.shift();
    if (yawBuf.current.length > 150) yawBuf.current.shift();

    headDownFrames.current = p > 15 ? headDownFrames.current + 1 : 0;

    if (earBuf.current.length >= FPS * 10) {
      const { freqs, fftVals } = computeFFT(earBuf.current);
      let maxVal = 0;
      let maxFreq = 0;

      for (let i = 1; i < freqs.length; i++) {
        const f = freqs[i];
        if (f >= 0.1 && f <= 0.6) {
          if (fftVals[i] > maxVal) {
            maxVal = fftVals[i];
            maxFreq = f;
          }
        }
      }

      const freq = maxFreq || 0;
      const blinkCount = Math.round(freq * 10);
      const blinkMin = blinkCount * 6;
      setBlinkPerMin(blinkMin);

      const closedFrames = earBuf.current.filter((e) => e < EAR_THRESH).length;
      const yawChanges = yawBuf.current
        .slice(1)
        .map((v, i) => Number(Math.abs(v - yawBuf.current[i]) > 10))
        .reduce((a, b) => a + b, 0);

      const yawStd = Math.sqrt(
        yawBuf.current.reduce((sum, yVal) => sum + (yVal - y) ** 2, 0) /
          yawBuf.current.length
      );

      let drowsyScore = 0;

      if (blinkMin < 8) drowsyScore += 3;
      else if (blinkMin > 40) drowsyScore += 1;
      if (closedFrames > 60) drowsyScore += 2;
      if (headDownFrames.current >= 90) drowsyScore += 2;
      if (yawStd > 12 && yawChanges > 20) drowsyScore += 1;
      if (absPitch > 25) drowsyScore += 1;
      if (absRoll > 20) drowsyScore += 1;

      const scoreChange = drowsyScore >= 5 ? -3 : drowsyScore >= 3 ? -1 : +1;
      setScore((prev) => Math.max(0, Math.min(100, prev + scoreChange)));
    }
  }, [landmarks]);

  return {
    ear,
    blinkPerMin,
    score,
    pitch,
    yaw,
    roll,
  };
}
