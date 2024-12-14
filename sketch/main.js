// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.
let faceMesh;
let video;
let classifier;

const videoW = 640;
const videoH = 480;

const {
  Engine,
  Body,
  Bodies,
  Composite,
  Composites,
  Mouse,
  MouseConstraint,
  Vector,
} = Matter;

let mouthOpen = 0;
let keyIdx = 0;
let engine, world;
let canvas;
let mouse, mouseConstraint;
let mouseCenter;
let faces = [];
let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };

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
  let centerPoint = face.keypoints[4];
  let distance = dist(
    leftPoint.x,
    leftPoint.y,
    leftPoint.z,
    rightPoint.x,
    rightPoint.y,
    rightPoint.z,
    centerPoint.x,
    centerPoint.y,
    centerPoint.z
  );
  return distance;
}

function preload() {
  // Load the faceMesh model
  faceMesh = ml5.faceMesh(options);
}

// function videoScale() {
//   return width / height > videoW / videoH ? width / videoW : height / videoH;
// }

function setup() {
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
  // createCanvas(640, 480);
  video = createCapture(VIDEO);
  // video = createCapture(VIDEO);
  video.size(videoW, videoH);
  video.hide();
  faceMesh.detectStart(video, gotFaces);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  // background('white');
  // circle(mouseX, mouseY, 50);
  image(video, 0, 0, width, height);
  const scaleX = width / videoW;
  const scaleY = height / videoH;
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
    for (let j = 0; j < face.keypoints.length; j++) {
      let keypoint = face.keypoints[j];
      const x = keypoint.x * scaleX;
      const y = keypoint.y * scaleY;
      fill(0, 255, 0);
      noStroke();
      circle(x, y, 5);
    }

    let mouthDist = calcMouthOpen(face);
    // console.log(mouthDist);

    // let normalMouth = mouthDist / faceWidth;
    // console.log('정규화된 입', normalMouth);

    // let fWeight = map(normalMouth, 0, 0.33, 100, 900);
    // document.documentElement.style.setProperty('--fWeight', fWeight);
  }
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
