// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.
let faceMesh;
let video;
// let classifier;
let faces = [];

const videoW = 640;
const videoH = 480;

let haTexts = [];
let textCreationTimer = 0;
let textCreationDelay = 10;

let inputText = '텍스트를 입력하세요';
let userInput;

// const {
//   Engine,
//   Body,
//   Bodies,
//   Composite,
//   Composites,
//   Mouse,
//   MouseConstraint,
//   Vector,
// } = Matter;

let mouthOpen = 0;
let keyIdx = 0;
let engine, world;
let canvas;
let mouse, mouseConstraint;
let mouseCenter;
// let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: true };

function preload() {
  faceMesh = ml5.faceMesh({
    maxFaces: 1,
    refineLandmarks: false,
    flipHorizontal: true,
  });
}

function calcMouthOpen(face) {
  let upper = face.keypoints[13];
  let lower = face.keypoints[14];
  let distance = dist(upper.x, upper.y, upper.z, lower.x, lower.y, lower.z);
  return distance;
}

function calcWidth(face) {
  let left = face.keypoints[21];
  let right = face.keypoints[251];
  let distance = dist(left.x, left.y, left.z, right.x, right.y, right.z);
  return distance;
}

function faceAD(face) {
  let leftPoint = face.keypoints[21];
  let rightPoint = face.keypoints[251];
  // let centerPoint = face.keypoints[4];
  let distance = dist(
    leftPoint.x,
    leftPoint.y,
    leftPoint.z,
    rightPoint.x,
    rightPoint.y,
    rightPoint.z
  );
  return distance;
}

// function videoScale() {
//   return width / height > videoW / videoH ? width / videoW : height / videoH;
// }

function setup() {
  // 입력 필드 생성
  userInput = createInput('텍스트를 입력하세요');
  userInput.position(10, 10);
  userInput.size(200);
  userInput.input(updateInputText);
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  if (aspectW === 0 || aspectH === 0) {
    createCanvas(containerW, containerH).parent(container);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else if (containerW / containerH > aspectW / aspectH) {
    createCanvas((containerH * aspectW) / aspectH, containerH).parent(
      container
    );
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }
  init();
  // createCanvas를 제외한 나머지 구문을 여기 혹은 init()에 작성.
  video = createCapture(VIDEO, { flipped: true });
  video.size(videoW, videoH);
  video.hide();
  faceMesh.detectStart(video, gotFaces);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function updateInputText() {
  inputText = this.value();
}

function draw() {
  // background('white');
  // circle(mouseX, mouseY, 50);
  image(video, 0, 0, width, height);
  const scaleX = width / videoW;
  const scaleY = height / videoH;

  // 무지개 색상 정의
  const colors = [
    color(148, 0, 211), // 보라
    color(75, 0, 200), // 남색
    color(0, 0, 255), // 파랑
    color(0, 255, 0), // 초록
    color(230, 230, 0), // 노랑
    color(240, 165, 0), // 주황
    color(255, 0, 0), // 빨강
  ];
  // image(
  //   video,
  //   0,
  //   0,
  //   video.width * currentVideoScale,
  //   video.height * currentVideoScale
  // );
  // let currentVideoScale = 0;
  // const currentVideoZero = { x: 0, y: 0 };
  // if (video) {
  //   currentVideoScale = videoScale();
  //   currentVideoZero.x = (width - video.width * videoScale()) * 0.5;
  //   currentVideoZero.y = (height - video.height * videoScale()) * 0.5;
  // }
  // Draw all the tracked face points
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    let mouthDist = calcMouthOpen(face);

    if (mouthDist > 10 && textCreationTimer >= textCreationDelay) {
      let faceDir = calcFaceDirection(face);
      let mouthCenter = face.keypoints[13];

      // 텍스트 크기 계산
      let minSize = 20;
      let maxSize = 100;
      let textSizeValue = map(mouthDist, 10, 50, minSize, maxSize, true);

      // 텍스트 색상 계산
      let colorIndex = floor(
        map(mouthDist, 10, 50, 0, colors.length - 1, true)
      );

      haTexts.push({
        x: mouthCenter.x * scaleX,
        y: mouthCenter.y * scaleY,
        dx: faceDir.x * 5,
        dy: faceDir.y * -5,
        alpha: 255,
        text: inputText,
        textSize: textSizeValue,
        textColor: colors[colorIndex], // 동적 색상 추가
      });

      textCreationTimer = 0;
    }
  }

  for (let i = haTexts.length - 1; i >= 0; i--) {
    let ha = haTexts[i];
    ha.x += ha.dx;
    ha.y += ha.dy;
    ha.alpha -= 2;

    // 색상과 크기 적용
    fill(red(ha.textColor), green(ha.textColor), blue(ha.textColor), ha.alpha);
    textSize(ha.textSize);
    textAlign(CENTER, CENTER);
    text(ha.text, ha.x, ha.y);

    if (ha.alpha <= 0) haTexts.splice(i, 1);
  }
  textCreationTimer++;

  // for (let j = 0; j < face.keypoints.length; j++) {
  //   let keypoint = face.keypoints[j];
  //   const x = keypoint.x * scaleX;
  //   const y = keypoint.y * scaleY;
  //   fill(0, 255, 0);
  //   noStroke();
  //   circle(x, y, 5);
  // }

  // console.log(mouthDist);

  // let normalMouth = mouthDist / faceWidth;
  // console.log('정규화된 입', normalMouth);

  // let fWeight = map(normalMouth, 0, 0.33, 100, 900);
  // document.documentElement.style.setProperty('--fWeight', fWeight);
}

function calcMouthOpen(face) {
  let upper = face.keypoints[13];
  let lower = face.keypoints[14];
  return dist(upper.x, upper.y, lower.x, lower.y);
}

function calcFaceDirection(face) {
  let leftTemple = face.keypoints[21];
  let rightTemple = face.keypoints[251];
  let noseTip = face.keypoints[4];

  let midPoint = {
    x: (leftTemple.x + rightTemple.x) / 2,
    y: (leftTemple.y + rightTemple.y) / 2,
  };

  let dx = noseTip.x - midPoint.x;
  let dy = noseTip.y - midPoint.y;

  return createVector(dx, dy).normalize();
}

// Callback function for when faceMesh outputs data
function gotFaces(results) {
  // Save the output to the faces variable
  faces = results;
}

function windowResized() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스 크기를 조정.
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
  // 위 과정을 통해 캔버스 크기가 조정된 경우, 다시 처음부터 그려야할 수도 있다.
  // 이런 경우 setup()의 일부 구문을 init()에 작성해서 여기서 실행하는게 편리하다.
  // init();
}
