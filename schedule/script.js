const ORDER_FILE_PATH = 'data/order.txt';
const DUTY_FOLDER_PATH = 'data/duty/';

const D_DAY_TARGET_DATE = new Date('2025-11-13T00:00:00');

const btnStart = document.querySelector('.btn-start');
const btnPause = document.querySelector('.btn-pause');
const btnComplete = document.querySelector('.btn-complete');

const timerStateDiv = document.querySelector('.timer-state');
const timerTimeDiv = document.querySelector('.timer-time');

const ampmSpan = document.querySelector('.ampm');
const digitalTimeSpan = document.querySelector('.digital-time');
const currentDateDiv = document.querySelector('.current-date');
const ddayCountDiv = document.querySelector('.dday-count'); // 오타 수정: .dday-count로 변경

const taskListContainer = document.querySelector('.task-list-container');
const analysisGraphContainer = document.querySelector('.analysis-graph-container');
const totalTimeDisplay = document.querySelector('.total-time-display');

const exceptionInput = document.getElementById('exception-input');
const exceptionSaveBtn = document.getElementById('exception-save-btn');

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let timerRunning = false;
let selectedSchedule = null; // { category, task }
let selectingMode = false;
let isEditing = false;

let currentSelectedTaskItemElement = null; // 현재 선택된 task-item DOM 요소를 추적

const STORAGE_KEYS = {
  records: 'records',
  exceptionSchedules: 'exceptionSchedules',
  TIMER_STATE: 'timerState' // 타이머 상태 저장을 위한 새로운 키
};

let order = [];
let schedules = {};
let records = {};
let exceptionSchedules = [];

async function init() {
  records = JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || {};
  exceptionSchedules = JSON.parse(localStorage.getItem(STORAGE_KEYS.exceptionSchedules)) || [];

  try {
    await loadOrder();
    if (order.includes('예외 스케줄')) {
      order = order.filter(cat => cat !== '예외 스케줄');
    }
    order.unshift('예외 스케줄');

    await loadSchedules();
    schedules['예외 스케줄'] = exceptionSchedules;

  } catch (error) {
    console.error("스케줄 파일을 불러오는 데 실패했습니다. 서버 환경에서 실행 중인지 확인해주세요.", error);
    alert("스케줄 파일을 불러오는 데 실패했습니다. 웹페이지에 스케줄이 표시되지 않을 수 있습니다.");
    order = ['예외 스케줄'];
    schedules['예외 스케줄'] = exceptionSchedules;
  }

  updateCurrentDateAndDDay();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);

  renderTaskList();
  renderAnalysisGraph();
  loadTimerState(); // 페이지 로드 시 저장된 타이머 상태 복원
  updateTimerUI(); // loadTimerState 후 UI 업데이트
  setupEventListeners();
}

async function loadOrder() {
  const response = await fetch(ORDER_FILE_PATH);
  if (!response.ok) throw new Error(`order.txt 파일을 불러오는데 실패했습니다: ${response.statusText}`);
  const text = await response.text();
  order = text.split(/\r?\n/).filter(line => line.trim() !== '');
}

async function loadSchedules() {
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
      schedules[category] = [];
    }
  }
}

function updateCurrentDateAndDDay() {
  const today = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  currentDateDiv.textContent = today.toLocaleDateString('ko-KR', options);

  const diffTime = D_DAY_TARGET_DATE.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  ddayCountDiv.textContent = `D-${diffDays}`;
}

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

function padZero(num) {
  return num.toString().padStart(2, '0');
}

function updateTimerUI() {
  const rightSection = document.querySelector('.right');
  const timerStatusBox = document.querySelector('.timer-status-box');

  if (!timerRunning) {
    timerStateDiv.textContent = '쉬는중';
    timerTimeDiv.textContent = '00:00:00';

    btnStart.textContent = selectingMode ? '일정 선택' : '시작';
    if (selectingMode) {
      btnStart.classList.add('selecting-mode');
    } else {
      btnStart.classList.remove('selecting-mode');
    }

    btnStart.classList.remove('inactive');
    btnPause.classList.add('inactive');
    btnComplete.classList.add('inactive');

    selectedSchedule = null;
    if (!selectingMode) {
      rightSection.classList.remove('selecting');
    }
    timerStatusBox.classList.remove('running-highlight');
  } else {
    timerStateDiv.textContent = '진행중';
    btnStart.textContent = '시작';
    btnStart.classList.add('inactive');
    btnStart.classList.remove('selecting-mode');
    btnPause.classList.remove('inactive');
    btnComplete.classList.remove('inactive');
    rightSection.classList.remove('selecting');
    timerStatusBox.classList.add('running-highlight');
  }
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerElapsed = Date.now() - timerStartTime.getTime(); // Date.now() 사용
    timerTimeDiv.textContent = formatDuration(timerElapsed);
  }, 1000);
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor((totalSeconds / 3600) % 24);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${padZero(h)}:${padZero(m)}:${padZero(s)}`;
}

function stopTimer(status) {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  selectingMode = false;

  // 타이머가 멈출 때 localStorage에서 상태 제거
  localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);

  const endTime = new Date();
  const duration = endTime - timerStartTime;

  const currentCategory = selectedSchedule ? selectedSchedule.category : '알 수 없음';
  const currentTask = selectedSchedule ? selectedSchedule.task : '알 수 없음';


  if (!records[currentCategory]) {
    records[currentCategory] = {};
  }
  if (!records[currentCategory][currentTask]) {
    records[currentCategory][currentTask] = [];
  }
  records[currentCategory][currentTask].push({
    start: endTime.toISOString(), // 종료 시간 기준으로 기록
    end: endTime.toISOString(),
    duration,
    status
  });

  saveRecords();
  updateTimerUI();
  renderTaskList();
  renderAnalysisGraph();

  if (currentSelectedTaskItemElement) {
    currentSelectedTaskItemElement.classList.remove('selected');
    currentSelectedTaskItemElement = null;
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

// 현재 타이머 상태를 localStorage에 저장하는 함수
function saveTimerState() {
  const state = {
    timerRunning: timerRunning,
    timerStartTime: timerStartTime ? timerStartTime.toISOString() : null,
    selectedSchedule: selectedSchedule
  };
  localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
}

// localStorage에서 타이머 상태를 불러와 복원하는 함수
function loadTimerState() {
  const savedState = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
  if (savedState) {
    const state = JSON.parse(savedState);
    timerRunning = state.timerRunning;
    timerStartTime = state.timerStartTime ? new Date(state.timerStartTime) : null;
    selectedSchedule = state.selectedSchedule;

    if (timerRunning && timerStartTime && selectedSchedule) {
      // 복원된 타이머가 실행 중 상태라면, UI를 업데이트하고 인터벌 재개
      timerElapsed = Date.now() - timerStartTime.getTime();
      timerTimeDiv.textContent = formatDuration(timerElapsed);

      // 선택된 task-item을 UI에서 찾아 하이라이트
      // renderTaskList가 먼저 실행되어야 task-item 요소들이 DOM에 존재함
      // 따라서 loadTimerState는 init()의 renderTaskList() 호출 이후에 실행되어야 함
      const allTaskItems = document.querySelectorAll('.task-item');
      allTaskItems.forEach(item => {
        if (item.dataset.category === selectedSchedule.category && item.dataset.task === selectedSchedule.task) {
          item.classList.add('selected');
          currentSelectedTaskItemElement = item;
        }
      });

      startTimerInterval(); // 인터벌 재개
    } else {
      // 저장된 상태가 유효하지 않으면 (예: timerRunning이 false), localStorage에서 제거
      localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
    }
  }
}


function saveExceptionSchedule(text) {
  exceptionSchedules.push(text);
  schedules['예외 스케줄'] = exceptionSchedules;
  localStorage.setItem(STORAGE_KEYS.exceptionSchedules, JSON.stringify(exceptionSchedules));
  renderTaskList();
}

function renderTaskList() {
  taskListContainer.innerHTML = '';

  const todayScheduleTitle = document.querySelector('.today-schedule-title-text');


  if (order.length === 0) {
    const noDataMessage = document.createElement('div');
    noDataMessage.textContent = '스케줄 데이터를 불러올 수 없습니다. 파일 경로를 확인해주세요.';
    noDataMessage.style.textAlign = 'center';
    noDataMessage.style.padding = '20px';
    noDataMessage.style.color = '#888';
    taskListContainer.appendChild(noDataMessage);
    return;
  }

  order.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.classList.add('task-category');

    const titleDiv = document.createElement('div');
    titleDiv.classList.add('category-title');
    categoryDiv.appendChild(titleDiv);

    const categoryNameSpan = document.createElement('span');
    categoryNameSpan.textContent = category;
    titleDiv.appendChild(categoryNameSpan);


    if (category === '예외 스케줄') {
      const editExceptionBtn = document.createElement('button');
      editExceptionBtn.classList.add('edit-exception-schedule-btn');
      editExceptionBtn.textContent = isEditing ? '완료' : '편집';
      editExceptionBtn.addEventListener('click', () => {
        isEditing = !isEditing;
        renderTaskList();
      });
      titleDiv.appendChild(editExceptionBtn);
    }


    const tasks = schedules[category] || [];

    if (tasks.length === 0) {
      const noTaskMessage = document.createElement('div');
      noTaskMessage.style.textAlign = 'center';
      noTaskMessage.style.padding = '5px';
      noTaskMessage.style.color = '#aaa';
      if (category === '예외 스케줄') {
        noTaskMessage.textContent = '등록된 예외 스케줄이 없습니다.';
      } else {
        noTaskMessage.textContent = '일정 없음';
      }
      categoryDiv.appendChild(noTaskMessage);
    }

    tasks.forEach((task, index) => {
      const taskDiv = document.createElement('div');
      taskDiv.classList.add('task-item');
      taskDiv.dataset.category = category;
      taskDiv.dataset.task = task;
      taskDiv.dataset.index = index;

      // --- 새로운 task-item-header 생성 시작 ---
      const taskItemHeader = document.createElement('div');
      taskItemHeader.classList.add('task-item-header');
      taskDiv.appendChild(taskItemHeader); // task-item의 자식으로 추가

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('task-name');
      nameSpan.textContent = task;
      taskItemHeader.appendChild(nameSpan); // task-item-header의 자식으로 추가

      const taskActionsDiv = document.createElement('div');
      taskActionsDiv.classList.add('task-actions');
      taskItemHeader.appendChild(taskActionsDiv); // task-item-header의 자식으로 추가
      // --- task-item-header 생성 끝 ---

      if (category === '예외 스케줄') {
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-item-btn');
        deleteBtn.textContent = '삭제';
        deleteBtn.style.display = isEditing ? 'inline-block' : 'none';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const confirmDelete = confirm(`"${task}" 일정을 정말 삭제하시겠습니까?`);
          if (confirmDelete) {
            const taskToDelete = e.target.closest('.task-item').dataset.task;
            const taskIndexToDelete = parseInt(e.target.closest('.task-item').dataset.index);

            if (exceptionSchedules[taskIndexToDelete] === taskToDelete) {
                exceptionSchedules.splice(taskIndexToDelete, 1);
                schedules['예외 스케줄'] = exceptionSchedules;
                localStorage.setItem(STORAGE_KEYS.exceptionSchedules, JSON.stringify(exceptionSchedules));
                renderTaskList();
            }
          }
        });
        taskActionsDiv.appendChild(deleteBtn);
      }

      const statusBox = document.createElement('div');
      statusBox.classList.add('status-box');
      const recs = records[category]?.[task] || [];
      if (recs.length > 0) {
        const lastRecord = recs[recs.length - 1];
        if (lastRecord.status === 'completed') {
          statusBox.classList.add('completed');
        } else if (lastRecord.status === 'paused') {
          statusBox.classList.add('paused');
        }
      }
      taskActionsDiv.appendChild(statusBox);

      // --- task-timer-record를 task-item의 자식으로 추가 ---
      const timerRecordDiv = document.createElement('div');
      timerRecordDiv.classList.add('task-timer-record');

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
      taskDiv.appendChild(timerRecordDiv); // task-item의 자식으로 추가
      // --- task-timer-record 추가 끝 ---

      categoryDiv.appendChild(taskDiv); // task-item을 categoryDiv에 추가

      taskDiv.addEventListener('click', (event) => {
        event.stopPropagation();

        if (timerRunning || isEditing) {
          document.querySelectorAll('.task-timer-record').forEach(div => {
            if (div !== timerRecordDiv) {
              div.style.display = 'none';
            }
          });
          if (timerRecordDiv.style.display === 'block') {
            timerRecordDiv.style.display = 'none';
          } else {
            timerRecordDiv.style.display = 'block';
          }
          return;
        }

        if (selectingMode) {
          if (currentSelectedTaskItemElement) {
            currentSelectedTaskItemElement.classList.remove('selected');
          }
          taskDiv.classList.add('selected');
          currentSelectedTaskItemElement = taskDiv;

          selectedSchedule = { category, task };
          selectingMode = false;

          timerRunning = true;
          timerStartTime = new Date();
          saveTimerState();

          timerElapsed = 0;
          updateTimerUI();
          startTimerInterval();

        } else {
          document.querySelectorAll('.task-timer-record').forEach(div => {
            if (div !== timerRecordDiv) {
              div.style.display = 'none';
            }
          });

          if (timerRecordDiv.style.display === 'block') {
            timerRecordDiv.style.display = 'none';
          } else {
            timerRecordDiv.style.display = 'block';
          }
        }
      });
    });

    taskListContainer.appendChild(categoryDiv);
  });
}

/**
 * 현재 "하루"의 시작 시간 (오전 5시 기준)을 반환합니다.
 * 예: 현재 시간이 7/15 03:00 이면 7/14 05:00 반환
 *     현재 시간이 7/15 06:00 이면 7/15 05:00 반환
 * @returns {Date} 현재 "하루"의 시작 시간
 */
function getStartOfCurrentDay() {
    const now = new Date();
    const startOfToday5AM = new Date(now);
    startOfToday5AM.setHours(5, 0, 0, 0);

    if (now.getHours() < 5) {
        // 현재 시간이 오전 5시 이전이면, "하루"는 어제 오전 5시에 시작
        const startOfYesterday5AM = new Date(startOfToday5AM);
        startOfYesterday5AM.setDate(startOfYesterday5AM.getDate() - 1);
        return startOfYesterday5AM;
    } else {
        // 현재 시간이 오전 5시 이후이면, "하루"는 오늘 오전 5시에 시작
        return startOfToday5AM;
    }
}


function renderAnalysisGraph() {
  analysisGraphContainer.innerHTML = '';

  const startOfCurrentDay = getStartOfCurrentDay(); // 현재 "하루"의 시작 시간 (오전 5시 기준)
  const endOfCurrentDay = new Date(startOfCurrentDay);
  endOfCurrentDay.setDate(endOfCurrentDay.getDate() + 1); // 현재 "하루"의 끝 시간 (다음날 오전 5시)


  const dailyTotalTimes = {};
  order.forEach(category => {
    dailyTotalTimes[category] = 0;
  });

  for (const category in records) {
    for (const task in records[category]) {
      records[category][task].forEach(r => {
        const recordStartTime = new Date(r.start);
        // 레코드가 현재 "하루" (오전 5시 ~ 다음날 오전 5시) 범위 내에 있는지 확인
        if (recordStartTime.getTime() >= startOfCurrentDay.getTime() && recordStartTime.getTime() < endOfCurrentDay.getTime()) {
          if (dailyTotalTimes[category] !== undefined) {
            dailyTotalTimes[category] += r.duration;
          }
        }
      });
    }
  }

  const totalAllDaily = Object.values(dailyTotalTimes).reduce((a, b) => a + b, 0);

  // 총 시간 합계 업데이트
  totalTimeDisplay.innerHTML = ''; // 기존 내용 지우기
  const totalTimeLabel = document.createElement('span');
  totalTimeLabel.classList.add('total-time-label');
  totalTimeLabel.textContent = '합계:';
  const totalTimeValue = document.createElement('span');
  totalTimeValue.classList.add('total-time-value');
  totalTimeValue.textContent = formatDuration(totalAllDaily);
  totalTimeDisplay.appendChild(totalTimeLabel);
  totalTimeDisplay.appendChild(totalTimeValue);


  // 모든 카테고리를 시간 순으로 정렬하여 색상 순위를 결정
  let categoriesForColorRanking = order.map(category => ({ category, time: dailyTotalTimes[category] || 0 }));
  categoriesForColorRanking.sort((a, b) => b.time - a.time); // 시간 총합으로 정렬

  const rankColors = ['#d33', '#FF8C00', '#FFD700', '#B0B0B0']; // 빨강, 주황, 노랑, 회색
  const categoryColorMap = new Map();
  categoriesForColorRanking.forEach((item, idx) => {
      categoryColorMap.set(item.category, idx < 3 ? rankColors[idx] : rankColors[3]);
  });


  if (order.length === 0) {
    const noDataMessage = document.createElement('div');
    noDataMessage.textContent = '분석 데이터를 불러올 수 없습니다.';
    noDataMessage.style.textAlign = 'center';
    noDataMessage.style.padding = '20px';
    noDataMessage.style.color = '#888';
    analysisGraphContainer.appendChild(noDataMessage);
    return;
  }

  // analysis-graph-inner 생성 및 추가
  const analysisGraphInner = document.createElement('div');
  analysisGraphInner.classList.add('analysis-graph-inner');
  analysisGraphContainer.appendChild(analysisGraphInner);

  // 2열 구조를 위한 컬럼 생성 (analysis-graph-inner의 자식으로)
  const labelsColumn = document.createElement('div');
  labelsColumn.classList.add('analysis-labels-column');
  analysisGraphInner.appendChild(labelsColumn);

  const barsColumn = document.createElement('div');
  barsColumn.classList.add('analysis-bars-column');
  analysisGraphInner.appendChild(barsColumn);

  let graphDisplayOrder = order.filter(category => category !== '예외 스케줄');
  const exceptionScheduleCategory = order.find(category => category === '예외 스케줄');
  if (exceptionScheduleCategory) {
      graphDisplayOrder.push(exceptionScheduleCategory);
  }


  graphDisplayOrder.forEach(category => { // graphDisplayOrder 배열을 기준으로 순서 유지
    const time = dailyTotalTimes[category] || 0;
    const barColor = categoryColorMap.get(category) || rankColors[3]; // 매핑된 색상 사용, 매핑 안된 경우 기본 회색

    // 레이블 생성 및 labelsColumn에 추가
    const labelSpan = document.createElement('span');
    labelSpan.classList.add('analysis-label-item');
    labelSpan.textContent = category;
    labelsColumn.appendChild(labelSpan);

    // 막대그래프 생성 및 barsColumn에 추가
    const barOuter = document.createElement('div');
    barOuter.classList.add('analysis-bar-outer');
    // .analysis-bar-outer의 border는 styles.css에서 제어

    const barInner = document.createElement('div');
    barInner.classList.add('analysis-bar-inner');
    barInner.style.width = totalAllDaily > 0 ? `${(time / totalAllDaily) * 100}%` : '0%';
    barInner.style.backgroundColor = barColor;
    barInner.style.transition = 'width 0.5s ease-out';

    barOuter.appendChild(barInner);
    barsColumn.appendChild(barOuter);
  });
}

function setupEventListeners() {
  const rightSection = document.querySelector('.right');

  btnStart.addEventListener('click', () => {
    if (!timerRunning) {
      if (!selectingMode) {
        selectingMode = true;
        btnStart.textContent = '일정 선택';
        btnStart.classList.add('selecting-mode');
        rightSection.classList.add('selecting');
        updateTimerUI();
      } else {
        selectingMode = false;
        selectedSchedule = null;
        if (currentSelectedTaskItemElement) {
          currentSelectedTaskItemElement.classList.remove('selected');
          currentSelectedTaskItemElement = null;
        }
        btnStart.textContent = '시작';
        btnStart.classList.remove('selecting-mode');
        rightSection.classList.remove('selecting');
        updateTimerUI();
      }
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

window.addEventListener('DOMContentLoaded', init);
