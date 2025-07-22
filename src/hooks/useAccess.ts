import { useState, useCallback } from "react";
import Web3 from "web3";

// 컨트랙트에서 받아올 생체 데이터 타입 정의
interface BioRecord {
  data: string[];
  comment: string;
  doctor: string;
  timestamp: string;
}

// 커스텀 훅의 반환 타입 정의
interface UseAuthorizedAccessResult {
  authorizedData: BioRecord[] | null;
  fetchAuthorizedData: () => Promise<void>;
}

// 의사 인증 계정만 전체 유저 데이터에 접근 가능한 훅
export const useAuthorizedAccess = (
  contract: any,
  account: string | null
): UseAuthorizedAccessResult => {
  const [authorizedData, setAuthorizedData] = useState<BioRecord[] | null>(null);

  const fetchAuthorizedData = useCallback(async () => {
    if (!contract || !account) {
      alert("MetaMask 지갑이 연결되어 있지 않습니다.");
      return;
    }

    const isAuthorized = window.confirm(
      "의사 인증된 계정만 데이터를 조회할 수 있습니다. 계속하시겠습니까?"
    );
    if (!isAuthorized) return;

    try {
      const web3 = new Web3();

      // 컨트랙트에서 전체 유저 주소 목록 조회
      const rawUserList = await contract.methods.getAllUsers().call({ from: account });
      const checksummedUserList = rawUserList.map((addr: string) => web3.utils.toChecksumAddress(addr));

      const allRecords: BioRecord[] = [];

      for (const userAddress of checksummedUserList) {
        const records = await contract.methods
          .getPatientRecords(userAddress)
          .call({ from: account });

        // 각 유저의 생체 기록을 파싱
        const parsed = records.map((r: any) => ({
          data: r.data,
          comment: r.comment,
          doctor: r.doctor,
          timestamp: r.timestamp,
        }));

        allRecords.push(...parsed);
      }

      setAuthorizedData(allRecords); // 최종적으로 모든 데이터를 상태에 저장
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      alert("데이터 조회에 실패했습니다.");
    }
  }, [contract, account]);

  return { authorizedData, fetchAuthorizedData }; 
};
