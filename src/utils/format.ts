import { ethers } from "ethers";

// 문자열을 정확한 bytes32 형식으로 안전하게 변환
export const toBytes32 = (input: string): string => {
  const str = input?.trim() ?? ""; // null/undefined 방지

  // 빈 문자열 → 0x000...000 (EVM 기본값)
  if (str === "") return ethers.constants.HashZero;

  try {
    // ethers는 31자 + null terminator → 총 32바이트로 인코딩됨
    return ethers.utils.formatBytes32String(str);
  } catch (e) {
    console.warn(`문자열이 길어 잘림 처리됨: "${str}"`);
    return ethers.utils.formatBytes32String(str.slice(0, 31));
  }
};
