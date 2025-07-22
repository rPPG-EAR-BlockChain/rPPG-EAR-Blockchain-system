//지갑 연결, 상태 관리, 컨트랙트 인스턴스를 반환하는 로직을 모듈화
import { useState, useEffect } from "react";
import Web3 from "web3";
import { rppgAbi } from "../abi/rppgAbi";

export const useWallet = () => {
  // 상태 변수 정의(지갑주소,web3인스턴스,컨트랙트인스턴스,로그인여부)
  const [account, setAccount] = useState<string>("");
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // 지갑 연결 함수
  const connectWallet = async () => {
    const { ethereum } = window as any;
    if (!ethereum) return alert("MetaMask를 설치해주세요."); // MetaMask 설치 확인

    // 현재 네트워크가 Sepolia인지 확인
    const chainId = await ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16).toString() !== "11155111") {
      return alert("Sepolia 테스트넷으로 전환해주세요.");
    }

    // 지갑 계정 요청
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });

    // Web3 인스턴스 생성 및 컨트랙트 연결
    const w3 = new Web3(ethereum);
    const contractAddress = "0x1D13564eC8161E4F250bbF4Ce90Ef29130DC78B8";

    setAccount(accounts[0]);
    setIsLoggedIn(true);
    setWeb3(w3);
    setContract(new w3.eth.Contract(rppgAbi, contractAddress));
  };

  // 지갑 연결 해제 함수
  const disconnectWallet = () => {
    setAccount("");
    setIsLoggedIn(false);
    setWeb3(null);
    setContract(null);
  };

  // 외부에서 사용할 수 있도록 반환
  return {
    account, // 현재 연결된 지갑 주소
    isLoggedIn, // 로그인 상태
    web3, // Web3 인스턴스
    contract, // 스마트 컨트랙트 인스턴스
    connectWallet, // 지갑 연결 함수
    disconnectWallet, // 지갑 해제 함수
  };
};