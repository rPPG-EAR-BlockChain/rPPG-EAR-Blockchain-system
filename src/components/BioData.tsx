import React from "react";
import { ethers } from "ethers";

export {};

interface BioRecord {
  data: string[];
  comment: string;
  doctor: string;
  timestamp: string;
}

interface Props {
  records: BioRecord[];
}

const BioDataTable: React.FC<Props> = ({ records }) => {
  if (!records || records.length === 0) return null;

  return (
    <div className="data-table-wrapper">
      <h3>조회된 생체 데이터</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>HeartRate</th>
            <th>Respiration</th>
            <th>Stress</th>
            <th>SpO2</th>
            <th>Comment</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, idx) => {
            const [heartRate, respirationRate, stressLevel, spo2] = record.data.map((hex: string) =>
              ethers.utils.parseBytes32String(hex)
            );
            const readableComment = ethers.utils.parseBytes32String(record.comment);
            return (
              <tr key={idx}>
                <td>{new Date(Number(record.timestamp) * 1000).toLocaleString()}</td>
                <td>{heartRate}</td>
                <td>{respirationRate}</td>
                <td>{stressLevel}</td>
                <td>{spo2}</td>
                <td>{readableComment}</td>
                <td>{record.doctor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BioDataTable;
