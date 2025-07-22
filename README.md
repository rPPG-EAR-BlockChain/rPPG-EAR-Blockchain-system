# A Web Demo for Camera-Based Physiological Sensing

This respository is a web form demo for the research paper [Multi-Task Temporal Shift Attention Networks for On-Device Contactless Vitals Measurement](https://papers.nips.cc/paper/2020/file/e1228be46de6a0234ac22ded31417bc7-Paper.pdf). The paper has been accepted to NeurIPS 2020 (Oral, Top 1%).

You may visit [here](https://github.com/xliucs/MTTS-CAN) to checkout our python source code.

## Demo

웹캠을 통해 실시간 생체 신호를 측정할 수 있습니다.

사용 방법:
1. 카메라 권한을 허용해주세요.  
2. 얼굴을 화면 중앙의 사각형 가이드에 맞춰주세요.  
3. `Start Monitoring` 버튼 클릭 후 약 10초간 측정이 진행됩니다.  
4. 결과는 실시간 그래프와 수치로 출력됩니다.
5. `Contract send` 버튼을 누르면 결과가 블록체인에 기록됩니다.

## Run in local

먼저, 필요한 패키지를 설치합니다:
```bash
npm install
```

그 다음, 개발 서버를 실행합니다:

```bash
npm run dev
# or
yarn dev
```
![밝을때+버전](https://github.com/user-attachments/assets/52389a2e-3ec6-469f-8b26-f204d0efeae0)

브라우저에서 http://localhost:3000 에 접속하여 실행 결과를 확인할 수 있습니다.

src/App.tsx 파일을 수정하면 페이지가 자동으로 업데이트됩니다.
