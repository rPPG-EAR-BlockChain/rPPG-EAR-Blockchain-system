import { useState, useCallback } from "react";

// 훅이 반환하는 상태 및 함수들의 타입 정의
interface UseRoleResult {
  role: string;
  chooseRole: (isDoctor: boolean) => Promise<void>;
  registerAsDoctor: (name: string, hospital: string) => Promise<void>;
  getMyRole: () => Promise<void>;
}

// 스마트 컨트랙트와 연결된 역할 관련 커스텀 훅
export const useRole = (contract: any, account: string | null): UseRoleResult => {
  const [role, setRole] = useState<string>("");

  // 현재 연결된 계정의 역할(Role)을 조회하는 함수
  const getMyRole = useCallback(async () => {
    if (!contract || !account) return;

    const result = await contract.methods.getMyRole().call({ from: account });
    console.log("getMyRole 결과:", result); // 확인용 로그
    setRole(result);
  }, [contract, account]);

  // 유저가 Doctor 또는 User 역할을 선택하도록 요청하는 함수
  const chooseRole = useCallback(
    async (isDoctor: boolean) => {
      if (!contract || !account) return;

      await contract.methods.chooseRole(isDoctor).send({ from: account });
      await getMyRole(); // 역할을 설정한 후 즉시 다시 조회
    },
    [contract, account, getMyRole]
  );

  // Doctor로 등록하기 위한 이름/병원명 입력 처리 함수
  const registerAsDoctor = useCallback(
    async (name: string, hospital: string) => {
      if (!contract || !account) return;

      await contract.methods.registerAsDoctor(name, hospital).send({ from: account });
    },
    [contract, account]
  );

  return { role, chooseRole, registerAsDoctor, getMyRole };
};
