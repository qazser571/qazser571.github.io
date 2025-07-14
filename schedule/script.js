// script.js

// 전역 변수 및 DOM 요소 캐싱
const ORDER_FILE_PATH = 'data/order.txt';
const DUTY_FOLDER_PATH = 'data/duty/';

const D_DAY_TARGET_DATE = new Date('2026-11-13T00:00:00'); // 2026학년도 수능 날짜 예시 (실제 날짜로 수정 필요)

const btnStart = document.querySelector('.btn-start');
const btnPause = document.querySelector('.btn-pause');
const btnComplete = document.querySelector('.btn-complete');

const timerStateDiv = document.querySelector('.timer-state');
const timerTimeDiv = document.querySelector('.timer-time');
const scheduleCategoryDiv = document.querySelector('.schedule-category');
const scheduleTaskDiv = document.querySelector('.schedule-task');

const ampmSpan = document.querySelector('.ampm');
const digitalTimeSpan = document.querySelector('.digital-time');
const currentDateDiv = document.querySelector('.current-date');
const ddayCountDiv = document.querySelector('.dday-count');

const taskListContainer = document.querySelector('.task-list-container');
const analysisGraphContainer = document.querySelector('.analysis-graph-container');

const exceptionInput = document.getElementById('exception-input');
const exceptionSaveBtn = document.getElementById('exception-save-btn');

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let timerRunning = false;
let selectedSchedule = null; // { category: '국어', task: '문제풀기' }
let selectingMode = false; // 일정 선택 모드 여부

// localStorage 키
const STORAGE_KEYS = {
  records: 'records', // {범주: {일정명: [{start, end, duration, status}]}}
  exceptionSchedules: 'exceptionSchedules' // 예외 스케줄 목록
};

// 스케줄 데이터 (파일에서 로드될 예정)
let order = []; // 범주 순서 배열
let schedules = {}; // {범주: [일정명,...]}
let records = {}; // 로컬 스토리지에서 로드

// 초기화 함수
async function init() {
  // localStorage에서 기록 및 예외 스케줄 불러오기
  records = JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || {};
  exceptionSchedules = JSON.parse(localStorage.getItem(STORAGE_KEYS.exceptionSchedules)) || [];

  // 예외 스케줄은 항상 schedules 객체에 반영
  schedules['예외 스케줄'] = exceptionSchedules;

  // 파일에서 범주 순서 및 스케줄 불러오기
  try {
    await loadOrder(); // order.txt에서 범주 순서 로드
    await loadSchedules(); // 각 범주별 txt 파일에서 일정 로드
  } catch (error) {
    console.error("파일 로드 중 오류 발생:", error);
    alert("스케줄 파일을 불러오는 데 실패했습니다. 서버 환경에서 실행 중인지 확인해주세요.");
    // 기본 데이터로 대체 (개발 시 유용)
    order = ['예외 스케줄', '국어', '수학', '영어', '사회과학', '자연과학'];
    schedules['국어'] = ['책읽기', '문제풀기', '시험보기'];
    schedules['수학'] = ['개념복습', '문제풀이'];
    schedules['영어'] = ['듣기연습', '독해'];
    schedules['사회과학'] = ['정리', '암기'];
    schedules['자연과학'] = ['실험', '복습'];
  }

  updateCurrentDateAndDDay();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000); // 1초마다 현재 시각 업데이트

  renderTaskList(); // 일정 목록 렌더링
  renderAnalysisGraph(); // 분석 그래프 렌더링
  updateTimerUI(); // 타이머 UI 초기 상태 설정
  setupEventListeners(); // 이벤트 리스너 설정
}

// 파일에서 범주 순서 읽기
async function loadOrder() {
  const response = await fetch(ORDER_FILE_PATH);
  if (!response.ok) throw new Error(`order.txt 파일을 불러오는데 실패했습니다: ${response.statusText}`);
  const text = await response.text();
  order = text.split(/\r?\n/).filter(line => line.trim() !== '');
}

// 각 범주별 txt 파일에서 일정 읽기
async function loadSchedules() {
  // '예외 스케줄'은 이미 로컬 스토리지에서 로드되었으므로, 파일에서 불러오지 않음
  const categoriesToLoad = order.filter(category => category !== '예외 스케줄');

  for (const category of categoriesToLoad) {
    const filePath = `${DUTY_FOLDER_PATH}${category}.txt`;
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        console.warn(`${category}.txt 파일을 불러오는데 실패했습니다: ${response.statusText}. 빈 목록으로 처리합니다.`);
        schedules[category] = [];
        continue;
      }
      const text = await response.text();
      schedules[category] = text.split(/\r?\n/).filter(line => line.trim() !== '');
    } catch (err) {
      console.warn(`파일 "${filePath}" 로드 중 오류 발생:`, err.message);
      schedules[category] = []; // 오류 발생 시 빈 배열로 설정
    }
  }
}

// 현재 날짜 및 D-Day 업데이트
function updateCurrentDateAndDDay() {
  const today = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  currentDateDiv.textContent = today.toLocaleDateString('ko-KR', options);

  const diffTime = D_DAY_TARGET_DATE.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  ddayCountDiv.textContent = `D-${diffDays}`;
}

// 현재 시각 업데이트 (오전/오후 시스템)
function updateCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const ampm = hours >= 12 ? '오후' : '오전';
  if (hours === 0) hours = 12; // 0시는 12 AM
  else if (hours > 12) hours -= 12; // 13시는 1 PM

  ampmSpan.textContent = ampm;
  digitalTimeSpan.textContent =
    `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// 숫자 앞에 0 채우기
function padZero(num) {
  return num.toString().padStart(2, '0');
}

// 타이머 UI 업데이트 (버튼 활성화/비활성화 포함)
function updateTimerUI() {
  if (!timerRunning) {
    timerStateDiv.textContent = '쉬는중';
    timerTimeDiv.textContent = '00:00:00';
    scheduleCategoryDiv.textContent = '';
    scheduleTaskDiv.textContent = '';

    btnStart.textContent = selectingMode ? '일정 선택' : '시작';
    btnStart.classList.remove('inactive'); // 시작 버튼은 항상 활성화
    btnPause.classList.add('inactive');
    btnComplete.classList.add('inactive');

    selectedSchedule = null;
    if (!selectingMode) { // 일정 선택 모드가 아닐 때만 클래스 제거
      taskListContainer.classList.remove('selecting');
    }
  } else {
    timerStateDiv.textContent = '진행중';
    btnStart.textContent = '시작'; // 타이머가 돌기 시작하면 시작 버튼은 더 이상 '일정 선택'이 아님
    btnStart.classList.add('inactive'); // 시작 버튼 비활성화
    btnPause.classList.remove('inactive');
    btnComplete.classList.remove('inactive');
    taskListContainer.classList.remove('selecting'); // 타이머 시작 시 빛나는 효과 제거
  }
}

// 타이머 인터벌 시작
function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerElapsed = new Date() - timerStartTime;
    timerTimeDiv.textContent = formatDuration(timerElapsed);
  }, 1000);
}

// 시간 포맷팅 (밀리초 -> HH:MM:SS)
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
}

// 보류 또는 완료 시 타이머 종료 및 기록 저장
function stopTimer(status) {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  selectingMode = false; // 타이머가 멈추면 일정 선택 모드 종료

  const endTime = new Date();
  const duration = endTime - timerStartTime;

  // 기록 저장
  const currentCategory = scheduleCategoryDiv.textContent;
  const currentTask = scheduleTaskDiv.textContent;

  if (!records[currentCategory]) {
    records[currentCategory] = {};
  }
  if (!records[currentCategory][currentTask]) {
    records[currentCategory][currentTask] = [];
  }
  records[currentCategory][currentTask].push({
    start: timerStartTime.toISOString(),
    end: endTime.toISOString(),
    duration,
    status
  });

  saveRecords();
  updateTimerUI(); // 타이머 UI 초기화 및 버튼 상태 업데이트
  renderTaskList(); // 일정 목록 재렌더링 (상태 박스 업데이트)
  renderAnalysisGraph(); // 분석 그래프 재렌더링
}

// localStorage에 기록 저장
function saveRecords() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

// 예외 스케줄 저장
function saveExceptionSchedule(text) {
  exceptionSchedules.push(text);
  schedules['예외 스케줄'] = exceptionSchedules; // schedules 객체에도 반영
  localStorage.setItem(STORAGE_KEYS.exceptionSchedules, JSON.stringify(exceptionSchedules));
  renderTaskList(); // 예외 스케줄 추가 후 목록 재렌더링
}

// 일정 목록 렌더링
function renderTaskList() {
  taskListContainer.innerHTML = '';

  order.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('task-category');

    const titleDiv = document.createElement('div');
    titleDiv.classList.add('category-title');
    titleDiv.textContent = category;
    categoryDiv.appendChild(titleDiv);

    const tasks = schedules[category] || [];

    tasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.classList.add('task-item');
      taskDiv.dataset.category = category;
      taskDiv.dataset.task = task;

      // 일정 이름
      const nameSpan = document.createElement('span');
      nameSpan.classList.add('task-name');
      nameSpan.textContent = task;
      taskDiv.appendChild(nameSpan);

      // 상태 박스
      const statusBox = document.createElement('div');
      statusBox.classList.add('status-box');

      // 해당 일정의 마지막 기록 상태에 따라 색상 지정
      const recs = records[category]?.[task] || [];
      if (recs.length > 0) {
        const lastRecord = recs[recs.length - 1];
        if (lastRecord.status === 'completed') {
          statusBox.classList.add('completed');
        } else if (lastRecord.status === 'paused') {
          statusBox.classList.add('paused');
        }
      }
      taskDiv.appendChild(statusBox);

      // 타이머 기록 영역 (토글용)
      const timerRecordDiv = document.createElement('div');
      timerRecordDiv.classList.add('task-timer-record');

      // 기록 텍스트 생성
      if (recs.length > 0) {
        recs.forEach(r => {
          const start = new Date(r.start);
          const end = new Date(r.end);
          const durationStr = formatDuration(r.duration);
          const recordText =
            `${padZero(start.getHours())}:${padZero(start.getMinutes())} - ` +
            `${padZero(end.getHours())}:${padZero(end.getMinutes())} | ${durationStr}`;
          const p = document.createElement('p');
          p.textContent = recordText;
          timerRecordDiv.appendChild(p);
        });
      } else {
        timerRecordDiv.textContent = '기록 없음';
      }

      categoryDiv.appendChild(taskDiv);
      categoryDiv.appendChild(timerRecordDiv);

      // 일정 클릭 이벤트 (토글)
      taskDiv.addEventListener('click', () => {
        if (selectingMode) return; // 일정 선택 모드일 때는 토글 기능 비활성화

        // 다른 열려있는 기록 닫기
        document.querySelectorAll('.task-timer-record').forEach(div => {
          if (div !== timerRecordDiv) {
            div.style.display = 'none';
          }
        });

        // 현재 기록 토글
        if (timerRecordDiv.style.display === 'block') {
          timerRecordDiv.style.display = 'none';
        } else {
          timerRecordDiv.style.display = 'block';
        }
      });

      // 일정 선택 모드일 때 클릭 시 선택 처리
      taskDiv.addEventListener('click', () => {
        if (!selectingMode) return; // 선택 모드가 아니면 처리 안 함

        selectedSchedule = { category, task };
        scheduleCategoryDiv.textContent = category;
        scheduleTaskDiv.textContent = task;

        // 선택 완료 후 타이머 시작 로직 호출
        timerRunning = true;
        timerStartTime = new Date();
        timerElapsed = 0;
        updateTimerUI(); // UI 업데이트 (시작 버튼 비활성화, 보류/완료 활성화)
        startTimerInterval(); // 타이머 인터벌 시작
      });
    });

    taskListContainer.appendChild(categoryDiv);
  });
}

// 분석 그래프 렌더링
function renderAnalysisGraph() {
  analysisGraphContainer.innerHTML = '';

  // 각 범주별 총 시간 계산 (밀리초)
  const totalTimes = {};
  for (const category in records) {
    let sum = 0;
    for (const task in records[category]) {
      records[category][task].forEach(r => {
        sum += r.duration;
      });
    }
    if (sum > 0) { // 0분 이상인 범주만 표시
      totalTimes[category] = sum;
    }
  }

  // 총합
  const totalAll = Object.values(totalTimes).reduce((a, b) => a + b, 0);

  // 시간 많은 순 정렬
  const sortedCategories = Object.entries(totalTimes)
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  // 색상 배열 (시간이 많은 순서대로 다른 색상 부여)
  const colors = ['#d33', '#3366cc', '#ffcc00', '#28a745', '#6f42c1', '#fd7e14']; // 추가 색상

  sortedCategories.forEach((category, idx) => {
    const time = totalTimes[category];
    // if (time === 0) return; // 이미 위에서 0분 이상인 범주만 필터링 됨

    const barDiv = document.createElement('div');
    barDiv.style.display = 'flex';
    barDiv.style.alignItems = 'center';
    barDiv.style.marginBottom = '4px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = category;
    labelSpan.style.width = '60px'; // 레이블 너비 고정
    labelSpan.style.fontSize = '12px';
    labelSpan.style.fontWeight = '600';
    labelSpan.style.marginRight = '6px';
    labelSpan.style.flexShrink = '0'; // 레이블이 줄어들지 않도록

    const barOuter = document.createElement('div');
    barOuter.style.flexGrow = '1'; // 남은 공간 모두 차지
    barOuter.style.height = '12px';
    barOuter.style.border = '1px solid #ccc';
    barOuter.style.position = 'relative';

    const barInner = document.createElement('div');
    barInner.style.height = '100%';
    barInner.style.width = totalAll > 0 ? `${(time / totalAll) * 100}%` : '0%';
    barInner.style.backgroundColor = colors[idx % colors.length]; // 색상 순환
    barInner.style.transition = 'width 0.5s ease-out'; // 애니메이션 효과

    barOuter.appendChild(barInner);
    barDiv.appendChild(labelSpan);
    barDiv.appendChild(barOuter);

    analysisGraphContainer.appendChild(barDiv);
  });
}

// 이벤트 리스너 설정
function setupEventListeners() {
  btnStart.addEventListener('click', () => {
    if (!timerRunning && !selectingMode) {
      // '시작' 버튼 클릭 -> '일정 선택' 모드 진입
      selectingMode = true;
      btnStart.textContent = '일정 선택';
      taskListContainer.classList.add('selecting'); // 빛나는 효과
      updateTimerUI(); // 버튼 상태 업데이트
    }
    // '일정 선택' 상태에서는 일정 클릭을 기다림
  });

  btnPause.addEventListener('click', () => {
    if (timerRunning) {
      stopTimer('paused');
    }
  });

  btnComplete.addEventListener('click', () => {
    if (timerRunning) {
      stopTimer('completed');
    }
  });

  exceptionSaveBtn.addEventListener('click', () => {
    const val = exceptionInput.value.trim();
    if (val) {
      saveExceptionSchedule(val);
      exceptionInput.value = ''; // 입력 필드 초기화
    }
  });
}

// 초기화 호출
window.addEventListener('DOMContentLoaded', init);
