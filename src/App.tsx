// App.tsx (최종 통합 버전 - 스타일 반영 및 주석 포함)
import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useEAR } from "./hooks/useEAR";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import * as tf from "@tensorflow/tfjs";
import {
  browser,
  image,
  tidy,
  dispose,
  reshape,
  cumsum,
  Tensor3D,
  Tensor4D,
} from "@tensorflow/tfjs";
import { fft } from "mathjs";
import Fili from "fili";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
} from "chart.js";

// rPPG 처리 관련 모듈 import
import TensorStore from "./lib/tensorStore";
import Preprocessor from "./lib/preprocessor";
import Posprocessor from "./lib/posprocessor";

// 커스텀 훅, 컴포넌트 import
import Header from "./components/header/header";
import { useWallet } from "./hooks/useWallet";
import { useRole } from "./hooks/useRole";
import { useAuthorizedAccess } from "./hooks/useAccess";
import { toBytes32 } from "./utils/format";
import DoctorRegistrationForm from "./components/DoctorForm";
import BioDataTable from "./components/BioData";

// FaceMesh 관련 import
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
// 스타일 및 차트 등록
import "./styles/App.scss";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const postprocessor = new Posprocessor();
const preprocessor = new Preprocessor(TensorStore, postprocessor);

const BATCH_DURATION_SEC = 10; // Mini_BATCH
const SAMPLE_RATE = 30;

const App = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const countdownTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(
    null
  );
  const [latestLandmarks, setLatestLandmarks] = useState<
    NormalizedLandmark[] | null
  >(null);
  const { ear, blinkPerMin, score, pitch, yaw, roll } = useEAR(latestLandmarks);

  //  FaceMesh 초기화 (가벼운 모델 적용)
  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );
      setFaceLandmarker(landmarker);
    };
    initializeFaceLandmarker();
  }, []);

  //  FaceMesh 실시간 분석 루프
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = async () => {
      console.log("renderLoop running...");
      if (
        webcamRef.current?.video?.readyState === 4 &&
        faceLandmarker &&
        canvasRef.current
      ) {
        const video = webcamRef.current.video!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = await faceLandmarker.detectForVideo(
          video,
          performance.now()
        );
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const drawingUtils = new DrawingUtils(ctx);
        if (results?.faceLandmarks) {
          for (const landmarks of results.faceLandmarks) {
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              {
                color: "#C0C0C070",
                lineWidth: 1,
              }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              {
                color: "#E0E0E0",
                lineWidth: 1,
              }
            );
          }
        }
        if (results?.faceLandmarks?.[0]) {
          console.log("setLatestLandmarks 실행됨");
          setLatestLandmarks(results.faceLandmarks[0]);
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    if (faceLandmarker) renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [faceLandmarker]);

  // 생체 정보 상태 관리
  const [rppgGraphData, setRppgGraphData] = useState<number[]>([]);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [respirationRate, setRespirationRate] = useState<number>(0);
  const [stressLevel, setStressLevel] = useState<number>(0);
  const [spo2, setSpo2] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);

  const [comment, setComment] = useState("Normal");

  useEffect(() => {
    if (score >= 80) setComment("Normal");
    else if (score >= 40) setComment("Carefully");
    else setComment("Dangerous");
  }, [score]);

  // Web3 상태
  const {
    account,
    isLoggedIn,
    web3,
    contract,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const { role, chooseRole, registerAsDoctor, getMyRole } = useRole(
    contract,
    account
  );
  const { authorizedData, fetchAuthorizedData } = useAuthorizedAccess(
    contract,
    account
  );
  const [roleChosen, setRoleChosen] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ name: "", hospital: "" });
  const [registrationError, setRegistrationError] = useState("");
  const [doctorRegistered, setDoctorRegistered] = useState(false);
  const [displayedData, setDisplayedData] = useState<
    typeof authorizedData | null
  >(null);
  const [showDoctorForm, setShowDoctorForm] = useState(true);

  useEffect(() => {
    if (account && contract) getMyRole();
  }, [account, contract, getMyRole]);

  useEffect(() => {
    if (!account) {
      setDoctorRegistered(false);
      setDoctorForm({ name: "", hospital: "" });
      setShowDoctorForm(false);
    } else {
      setShowDoctorForm(true);
    }
  }, [account]);

  useEffect(() => {
    if (authorizedData && authorizedData.length > 0) {
      setDisplayedData(authorizedData);
    }
  }, [authorizedData]);

  useEffect(() => {
    setDisplayedData(null);
  }, [account]);

  useEffect(() => {
    const checkDoctorRegistered = async () => {
      if (contract && account && role === "Doctor") {
        try {
          const profile = await contract.methods.doctorProfiles(account).call();
          setDoctorRegistered(profile.isRegistered);
        } catch {
          setDoctorRegistered(false);
        }
      }
    };
    checkDoctorRegistered();
  }, [contract, account, role]);

  const isRoleUnselected = (role === "" || role === "None") && !roleChosen;

  const handleContractSend = async () => {
    if (!web3 || !contract || !account) {
      alert("MetaMask가 연결되어 있지 않습니다.");
      return;
    }

    const comment = heartRate > 100 ? "Dangerous" : "Normal";
    const bioArray = [
      toBytes32(heartRate.toString()),
      toBytes32(respirationRate.toString()),
      toBytes32(stressLevel.toString()),
      toBytes32(spo2.toString()),
    ];
    const commentHex = toBytes32(comment);

    try {
      await contract.methods
        .sendBiometricData(bioArray, commentHex)
        .send({ from: account });

      alert("블록체인에 데이터 전송 완료!");
    } catch (err: any) {
      console.error("전송 실패:", err.message || err);
      alert("전송 실패: " + (err?.message || "알 수 없는 오류"));
    }
  };

  const capture = useCallback(() => {
    const webcam = webcamRef.current;
    if (webcam) {
      const screenshot = webcam.getScreenshot();
      if (!screenshot) return;
      const img = new Image(480, 640);
      img.src = screenshot;
      img.onload = () => {
        const tensor = tidy(
          () => browser.fromPixels(img).expandDims(0) as Tensor4D
        );
        const crop = image.cropAndResize(
          tensor,
          [[0.1, 0.3, 0.56, 0.7]],
          [0],
          [36, 36],
          "bilinear"
        );
        dispose(tensor);
        const frame = crop.reshape([36, 36, 3]) as Tensor3D;
        TensorStore.addRawTensor(frame);
      };
    }
  }, []);

  const getSignalFrequency = (
    signal: number[],
    sampleRate: number,
    min: number,
    max: number
  ) => {
    const spectrum: any = fft(signal);
    let maxAmp = -Infinity,
      maxFreq = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * sampleRate) / signal.length;
      if (freq >= min && freq <= max) {
        const amp = Math.sqrt(spectrum[i].re ** 2 + spectrum[i].im ** 2);
        if (amp > maxAmp) {
          maxAmp = amp;
          maxFreq = freq;
        }
      }
    }
    return maxFreq;
  };
  const plotGraph = () => {
    const raw = TensorStore.rppgPltData;
    if (!raw.length) {
      alert("rPPG 데이터가 아직 준비되지 않았습니다.");
      return;
    }

    // 누적 신호로 변환 → 그래프 시각화용
    const rppgSignal = cumsum(reshape(raw, [-1, 1]), 0).dataSync();

    // Butterworth 필터 적용
    const filter = new Fili.CalcCascades().bandpass({
      order: 2,
      characteristic: "butterworth",
      Fs: SAMPLE_RATE,
      Fc: 1.5,
      BW: 2.0,
    });
    const filtered = new Fili.IirFilter(filter).filtfilt(
      Array.from(rppgSignal)
    );

    // rPPG 그래프 출력용 (뒤에 일부 자름)
    const cropped = filtered.slice(0, filtered.length - 30);
    setRppgGraphData(cropped);

    // 필터링된 시그널 기반으로 생체 정보 분석
    const hr = getSignalFrequency(filtered, SAMPLE_RATE, 1, 3.5);
    const rr = getSignalFrequency(filtered, SAMPLE_RATE, 0.1, 0.7);

    setHeartRate(Math.round(hr * 60));
    setRespirationRate(Math.round(rr * 40));

    const hrRpm = Math.round(hr * 60);
    const rrRpm = Math.round(rr * 40);
    const ratio = hrRpm / (rrRpm || 1);
    const diff = ratio - 4.5;
    const stressRaw = Math.tanh(Math.abs(diff)) * 100;
    const stressStage = Math.min(5, Math.max(1, Math.ceil(stressRaw / 20)));

    setHeartRate(hrRpm);
    setRespirationRate(rrRpm);
    setStressLevel(stressStage);
    setSpo2(98);

    setHeartRate(hrRpm);
    setRespirationRate(rrRpm);
    setStressLevel(stressStage);
    setSpo2(98);

    setHeartRate(hrRpm);
    setRespirationRate(rrRpm);
    setStressLevel(stressStage);
    setSpo2(98);
  };

  const startMonitoring = async () => {
    await tf.setBackend("webgl");
    await tf.ready();
    await postprocessor.loadModel();
    preprocessor.startProcess();
    setRecording(true);
    intervalId.current = setInterval(capture, 30);
    countdownTimeoutId.current = setTimeout(() => {
      setTimeout(() => {
        plotGraph();
        stopMonitoring();
      }, 100);
    }, BATCH_DURATION_SEC * 1000);
  };

  const stopMonitoring = () => {
    preprocessor.stopProcess();
    TensorStore.reset();
    setRecording(false);
    if (intervalId.current) clearInterval(intervalId.current);
    if (countdownTimeoutId.current) clearTimeout(countdownTimeoutId.current);
  };

  const stressStage = Math.min(
    5,
    Math.max(1, Math.ceil((stressLevel + 1) / 20))
  );

  return (
    <div className="App">
      <Header />
      <main className="main-wrapper">
        <div className="full-center">
          <div
            className="video-wrapper"
            style={{
              position: "relative",
              width: 640,
              height: 480,
              marginBottom: "24px",
            }}
          >
            <Webcam
              ref={webcamRef}
              className="webcam-video"
              audio={false}
              mirrored={true}
              screenshotFormat="image/jpeg"
            />
            <canvas
              ref={canvasRef}
              className="facemesh-canvas"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 2,
                transform: "scaleX(-1)",
              }}
            />
          </div>
          <div className="scrollable-wrapper">
            <div className="button-group">
              {isLoggedIn ? (
                <>
                  <p className="custom-account">
                    Login: {account}
                    <br />
                    <small className="account-role-label">
                      현재 역할: {role || "미선택"}
                    </small>
                  </p>
                  <button
                    className="custom-button"
                    onClick={() => {
                      disconnectWallet();
                      setDisplayedData(null);
                      setDoctorRegistered(false);
                      setDoctorForm({ name: "", hospital: "" });
                      setShowDoctorForm(false);
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button className="custom-button" onClick={connectWallet}>
                  MetaMask Login
                </button>
              )}
              <button
                className="custom-button"
                onClick={startMonitoring}
                disabled={recording}
              >
                {recording ? "Recording..." : "Start Monitoring"}
              </button>

              <button className="custom-button" onClick={handleContractSend}>
                Contract send
              </button>
              <button
                className="custom-button"
                onClick={() => {
                  if (role !== "Doctor")
                    return alert("의사 인증 후 접근 가능합니다.");
                  fetchAuthorizedData();
                }}
              >
                Data road
              </button>
            </div>

            {isRoleUnselected && isLoggedIn && (
              <div className="button-group">
                <p>당신의 역할을 선택해주세요.</p>
                <button
                  className="custom-button"
                  onClick={() => {
                    chooseRole(true);
                    setRoleChosen(true);
                  }}
                >
                  Doctor
                </button>
                <button
                  className="custom-button"
                  onClick={() => {
                    chooseRole(false);
                    setRoleChosen(true);
                  }}
                >
                  User
                </button>
              </div>
            )}

            {role === "Doctor" && showDoctorForm && !doctorRegistered && (
              <DoctorRegistrationForm
                doctorForm={doctorForm}
                setDoctorForm={setDoctorForm}
                registerAsDoctor={registerAsDoctor}
                setDoctorRegistered={setDoctorRegistered}
                registrationError={registrationError}
                setRegistrationError={setRegistrationError}
              />
            )}

            {displayedData && displayedData.length > 0 && (
              <div className="bio-data-wrapper">
                <BioDataTable records={displayedData} />
              </div>
            )}
            <div className="ear-status-box">
              <h2>졸음/집중 상태</h2>
              <p>
                <strong>EAR:</strong> <span>{ear.toFixed(3)}</span>
              </p>
              <p>
                <strong>Blink/min:</strong> <span>{blinkPerMin}</span>
              </p>
              <p>
                <strong>Comment:</strong>{" "}
                <span
                  style={{
                    color:
                      comment === "Dangerous"
                        ? "red"
                        : comment === "Carefully"
                        ? "orange"
                        : "green",
                    fontWeight: "bold",
                  }}
                >
                  {comment}
                </span>
              </p>

              <p>
                <strong>Head Pose:</strong>
                Pitch <span>{pitch.toFixed(1)}°</span>, Yaw{" "}
                <span>{yaw.toFixed(1)}°</span>, Roll{" "}
                <span>{roll.toFixed(1)}°</span>
              </p>
            </div>
            {heartRate > 0 && (
              <div className="data-vote-wrapper">
                <div className="bio-summary-row">
                  <div>
                    <div className="label">Heart Rate</div>
                    <div className="value">{heartRate} BPM</div>
                  </div>
                  <div>
                    <div className="label">Respiration Rate</div>
                    <div className="value">{respirationRate} RPM</div>
                  </div>
                  <div>
                    <div className="label">Stress Level</div>
                    <div className="value">{stressStage} 단계</div>
                  </div>
                  <div>
                    <div className="label">SpO₂</div>
                    <div className="value">{spo2} %</div>
                  </div>
                </div>

                <Line
                  data={{
                    labels: rppgGraphData.map((_, i) => i.toString()),
                    datasets: [
                      {
                        label: " ",
                        data: rppgGraphData,
                        fill: false,
                        borderColor: "red",
                        tension: 0.1,
                      },
                    ],
                  }}
                  width={600}
                  height={200}
                  options={{
                    animation: false,
                    responsive: true,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      x: { display: false },
                      y: { display: false },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
