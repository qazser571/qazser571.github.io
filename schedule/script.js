// script.js

// 전역 변수
const titleWidth = getComputedStyle(document.documentElement).getPropertyValue('--title-width').trim();
const btnStart = document.querySelector('.btn-start');
const btnPause = document.querySelector('.btn-pause');
const btnComplete = document.querySelector('.btn-complete');

const timerStateDiv = document.querySelector('.timer-state');
const timerTimeDiv = document.querySelector('.timer-time');
const scheduleCategoryDiv = document.querySelector('.schedule-category');
const scheduleTaskDiv = document.querySelector('.schedule-task');

const ampmSpan = document.querySelector('.ampm');
const digitalTimeSpan = document.querySelector('.digital-time');

const taskListContainer = document.querySelector('.task-list-container');
const analysisGraphContainer = document.querySelector('.analysis-graph-container');

const exceptionInput = document.getElementById('exception-input');
const exceptionSaveBtn = document.getElementById('exception-save-btn');

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let timerRunning = false;
let timerPaused = false;
let selectedSchedule = null;
let selectingMode = false;

// localStorage 키
const STORAGE_KEYS = {
  schedules: 'schedules', // {범주: [일정명,...]}
  order: 'order', // 범주 순서 배열
  records: 'records', // {범주: {일정명: [{start, end, duration, status}]}}
  exceptionSchedules: 'exceptionSchedules' // 예외 스케줄 목록
};

// 초기 데이터 예시 (실제 txt파일 대신 localStorage로 대체)
const defaultOrder = ['예외 스케줄', '국어', '수학', '영어', '사회과학', '자연과학'];
const defaultSchedules = {
  '예외 스케줄': [],
  '국어': ['책읽기', '문제풀기', '시험보기'],
  '수학': ['개념복습', '문제풀이'],
  '영어': ['듣기연습', '독해'],
  '사회과학': ['정리', '암기'],
  '자연과학': ['실험', '복습']
};
let schedules = {};
let order = [];
let records = {};
let exceptionSchedules = [];

// 날짜 문자열 (고정)
const fixedDateStr = '2025년 7월 14일 월요일';

// 초기화 함수
function init() {
  // localStorage에서 데이터 불러오기
  order = JSON.parse(localStorage.getItem(STORAGE_KEYS.order)) || defaultOrder;
  schedules = JSON.parse(localStorage.getItem(STORAGE_KEYS.schedules)) || defaultSchedules;
  records = JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || {};
  exceptionSchedules = JSON.parse(localStorage.getItem(STORAGE_KEYS.exceptionSchedules)) || [];

  // 날짜 표시 (고정)
  document.querySelector('.current-date').textContent = fixedDateStr;

  // 예외 스케줄 반영
  schedules['예외 스케줄'] = exceptionSchedules;

  renderTaskList();
  renderAnalysisGraph();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);

  updateTimerUI();
  setupEventListeners();
}

// 현재 시각 업데이트 (오전/오후 시스템)
function updateCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const ampm = hours >= 12 ? '오후' : '오전';
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  ampmSpan.textContent = ampm;
  digitalTimeSpan.textContent = 
    `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// 0 채우기
function padZero(num) {
  return num.toString().padStart(2, '0');
}

// 타이머 UI 업데이트
function updateTimerUI() {
  if (!timerRunning) {
    timerStateDiv.textContent = '쉬는중';
    timerTimeDiv.textContent = '00:00:00';
    scheduleCategoryDiv.textContent = '';
    scheduleTaskDiv.textContent = '';
    btnStart.textContent = '시작';
    btnStart.classList.remove('inactive');
    btnPause.classList.add('inactive');
    btnComplete.classList.add('inactive');
    selectedSchedule = null;
    selectingMode = false;
    taskListContainer.classList.remove('selecting');
  } else {
    timerStateDiv.textContent = '진행중';
    btnStart.textContent = '시작';
    btnStart.classList.add('inactive');
    btnPause.classList.remove('inactive');
    btnComplete.classList.remove('inactive');
    taskListContainer.classList.remove('selecting');
  }
}

// 타이머 시작
function startTimer() {
  if (!timerRunning && !selectingMode) {
    // 시작 버튼 누르면 일정 선택 모드 진입
    selectingMode = true;
    btnStart.textContent = '일정 선택';
    taskListContainer.classList.add('selecting');
  } else if (selectingMode && selectedSchedule) {
    // 일정 선택 후 타이머 시작
    timerRunning = true;
    timerStartTime = new Date();
    timerElapsed = 0;
    updateTimerUI();
    startTimerInterval();
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

  const endTime = new Date();
  const duration = endTime - timerStartTime;

  // 기록 저장
  if (!records[scheduleCategoryDiv.textContent]) {
    records[scheduleCategoryDiv.textContent] = {};
  }
  if (!records[scheduleCategoryDiv.textContent][scheduleTaskDiv.textContent]) {
    records[scheduleCategoryDiv.textContent][scheduleTaskDiv.textContent] = [];
  }
  records[scheduleCategoryDiv.textContent][scheduleTaskDiv.textContent].push({
    start: timerStartTime.toISOString(),
    end: endTime.toISOString(),
    duration,
    status
  });

  saveRecords();
  updateTimerUI();
  renderTaskList();
  renderAnalysisGraph();
}

// 저장 함수
function saveRecords() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

// 예외 스케줄 저장
function saveExceptionSchedule(text) {
  exceptionSchedules.push(text);
  schedules['예외 스케줄'] = exceptionSchedules;
  localStorage.setItem(STORAGE_KEYS.exceptionSchedules, JSON.stringify(exceptionSchedules));
  renderTaskList();
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

      // 상태에 따라 색상 지정
      const recs = records[category]?.[task] || [];
      if (recs.some(r => r.status === 'completed')) {
        statusBox.classList.add('completed');
      } else if (recs.some(r => r.status === 'paused')) {
        statusBox.classList.add('paused');
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
          const recordText = `${start.getHours()}:${padZero(start.getMinutes())} - ${end.getHours()}:${padZero(end.getMinutes())} | ${durationStr}`;
          const p = document.createElement('p');
          p.textContent = recordText;
          timerRecordDiv.appendChild(p);
        });
      } else {
        timerRecordDiv.textContent = '기록 없음';
      }

      categoryDiv.appendChild(taskDiv);
      categoryDiv.appendChild(timerRecordDiv);

      // 클릭 이벤트 (토글)
      taskDiv.addEventListener('click', () => {
        if (selectingMode) return; // 일정 선택 모드일 때는 토글 안됨
        if (timerRecordDiv.style.display === 'block') {
          timerRecordDiv.style.display = 'none';
        } else {
          // 다른 열려있는 기록 닫기
          document.querySelectorAll('.task-timer-record').forEach(div => {
            div.style.display = 'none';
          });
          timerRecordDiv.style.display = 'block';
        }
      });

      // 일정 선택 모드일 때 클릭 시 선택 처리
      taskDiv.addEventListener('click', () => {
        if (!selectingMode) return;
        selectedSchedule = { category, task };
        scheduleCategoryDiv.textContent = category;
        scheduleTaskDiv.textContent = task;
        startTimer();
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
    totalTimes[category] = sum;
  }

  // 총합
  const totalAll = Object.values(totalTimes).reduce((a,b) => a+b, 0);

  // 시간 많은 순 정렬
  const sortedCategories = Object.entries(totalTimes)
    .sort((a,b) => b[1] - a[1])
    .map(e => e[0]);

  // 색상 배열 (상위 3개 색 다르게)
  const colors = ['#d33', '#3366cc', '#ffcc00'];

  sortedCategories.forEach((category, idx) => {
    const time = totalTimes[category];
    if (time === 0) return;

    const barDiv = document.createElement('div');
    barDiv.style.display = 'flex';
    barDiv.style.alignItems = 'center';
    barDiv.style.marginBottom = '4px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = category;
    labelSpan.style.width = '60px';
    labelSpan.style.fontSize = '12px';
    labelSpan.style.fontWeight = '600';
    labelSpan.style.marginRight = '6px';

    const barOuter = document.createElement('div');
    barOuter.style.flexGrow = '1';
    barOuter.style.height = '12px';
    barOuter.style.border = '1px solid #ccc';
    barOuter.style.position = 'relative';

    const barInner = document.createElement('div');
    barInner.style.height = '100%';
    barInner.style.width = totalAll > 0 ? `${(time / totalAll) * 100}%` : '0%';
    barInner.style.backgroundColor = colors[idx] || '#999';

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
      // 일정 선택 모드 진입
      selectingMode = true;
      btnStart.textContent = '일정 선택';
      taskListContainer.classList.add('selecting');
    } else if (selectingMode && selectedSchedule) {
      // 타이머 시작
      timerRunning = true;
      timerStartTime = new Date();
      timerElapsed = 0;
      updateTimerUI();
      startTimerInterval();
    }
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
      exceptionInput.value = '';
    }
  });
}

// 초기화 호출
window.addEventListener('DOMContentLoaded', init);
