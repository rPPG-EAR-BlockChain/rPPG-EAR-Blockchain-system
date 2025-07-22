import React from "react";
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
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  data: number[];
}

const options = {
  responsive: true,
  animation: {
    duration: 0, // 애니메이션 끔
  },
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 150,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
  },
};

const HeartrateChart: React.FC<Props> = ({ data }) => {
  const chartData = {
    labels: data.map((_, i) => i.toString()), // 인덱스를 라벨로
    datasets: [
      {
        label: "Heart Rate (BPM)",
        data: data,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: false,
        tension: 0.1,
        pointRadius: 0, // 점 제거
      },
    ],
  };

  return <Line data={chartData} options={options} />;
};

export default HeartrateChart;
