import React from "react";
import "./header.scss";
import metaMaskLogo from "../../image/MetaMask.png";
import hackatone from "../../image/hackatone.png";
import KyungnamMAKE from "../../image/KyungnamMAKE.png";

const Header = () => {
  return (
    <header className="header">
      <div className="logo-section1">
        <img src={metaMaskLogo} alt="MetaMask" className="logo-img" />
        <span className="logo-text">MetaMask</span>
      </div>
      <div className="center-text">
        <strong>RPPG with Blockchain</strong>
      </div>
      <div className="logo-section2">
        <img src={KyungnamMAKE} alt="KyungnamMAKE" className="logo-img" />
        <div className="subtitle">Better Life with Smart media & things</div>
      </div>
    </header>
  );
};

export default Header;
