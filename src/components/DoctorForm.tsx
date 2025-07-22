import React from "react";

// props 타입 정의 - 의사 인증 폼에서 필요한 모든 상태 및 함수들을 명시
interface DoctorRegistrationFormProps {
  doctorForm: {
    name: string;
    hospital: string;
  };
  setDoctorForm: (form: { name: string; hospital: string }) => void;
  registerAsDoctor: (name: string, hospital: string) => Promise<void>;
  registrationError: string;
  setRegistrationError: (error: string) => void;
  setDoctorRegistered: (val: boolean) => void;
}

// 의사 인증 입력 폼 컴포넌트 정의
const DoctorRegistrationForm: React.FC<DoctorRegistrationFormProps> = ({
  doctorForm,
  setDoctorForm,
  registerAsDoctor,
  registrationError,
  setRegistrationError,
  setDoctorRegistered,
}) => {
  return (
    <div className="button-group">
      <h3>의사 인증 등록</h3>

      {/* 이름과 병원명 입력 필드 구성 */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          className="custom-input"
          type="text"
          placeholder="이름"
          value={doctorForm.name}
          onChange={(e) =>
            setDoctorForm({ ...doctorForm, name: e.target.value })
          }
        />
        <input
          className="custom-input"
          type="text"
          placeholder="병원명"
          value={doctorForm.hospital}
          onChange={(e) =>
            setDoctorForm({ ...doctorForm, hospital: e.target.value })
          }
        />
      </div>

      {/* 등록 버튼 클릭 시 registerAsDoctor 실행 */}
      <button
        className="custom-button"
        onClick={async () => {
          try {
            await registerAsDoctor(doctorForm.name, doctorForm.hospital);
            setRegistrationError("");
            setDoctorRegistered(true);
            alert("의사 등록 완료!");
          } catch (err: any) {
            console.error("의사 등록 실패:", err.message || err);
            setRegistrationError(
              "의사 등록에 실패했습니다. 메타마스크 확인 또는 네트워크 상태를 점검해주세요."
            );
          }
        }}
      >
        의사로 등록
      </button>

      {/* 등록 실패 시 에러 메시지 표시 */}
      {registrationError && (
        <p style={{ color: "red" }}>{registrationError}</p>
      )}
    </div>
  );
};

export default DoctorRegistrationForm;
