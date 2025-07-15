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
const ddayCountDiv = document.querySelector('.dday-count');

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
let isEditing = false; // 예외 스케줄 편집 모드 상태

let currentSelectedTaskItemElement = null; // 현재 선택된 task-item DOM 요소를 추적

const STORAGE_KEYS = {
  records: 'records',
  exceptionSchedules: 'exceptionSchedules'
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
    // '예외 스케줄' 범주가 order 배열에 있다면 제거하고, 항상 최상단에 추가
    if (order.includes('예외 스케줄')) {
      order = order.filter(cat => cat !== '예외 스케줄');
    }
    order.unshift('예외 스케줄'); // Right 섹션에서 항상 최상단에 표시되도록 추가

    await loadSchedules();
    schedules['예외 스케줄'] = exceptionSchedules;

  } catch (error) {
    console.error("스케줄 파일을 불러오는 데 실패했습니다. 서버 환경에서 실행 중인지 확인해주세요.", error);
    alert("스케줄 파일을 불러오는 데 실패했습니다. 웹페이지에 스케줄이 표시되지 않을 수 있습니다.");
    // 파일 로드 실패 시에도 '예외 스케줄'만이라도 표시되도록
    order = ['예외 스케줄'];
    schedules['예외 스케줄'] = exceptionSchedules;
  }

  updateCurrentDateAndDDay();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);

  renderTaskList();
  renderAnalysisGraph();
  updateTimerUI();
  setupEventListeners();
}

async function loadOrder() {
  const response = await fetch(ORDER_FILE_PATH);
  if (!response.ok) throw new Error(`order.txt 파일을 불러오는데 실패했습니다: ${response.statusText}`);
  const text = await response.text();
  order = text.split(/\r?\n/).filter(line => line.trim() !== '');
}

async function loadSchedules() {
  // '예외 스케줄'은 로컬 스토리지에서 관리되므로, 파일에서 불러오지 않음
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
    timerElapsed = new Date() - timerStartTime;
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
    start: timerStartTime.toISOString(),
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

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('task-name');
      nameSpan.textContent = task;
      taskDiv.appendChild(nameSpan);

      const taskActionsDiv = document.createElement('div');
      taskActionsDiv.classList.add('task-actions');

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

      taskDiv.appendChild(taskActionsDiv);

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

      categoryDiv.appendChild(taskDiv);
      categoryDiv.appendChild(timerRecordDiv);

      taskDiv.addEventListener('click', (event) => {
        event.stopPropagation();

        // 1. 타이머가 이미 진행 중이거나 예외 스케줄 편집 모드인 경우: 기록 시간만 토글
        if (timerRunning || isEditing) {
          // 모든 기록 시간 요소를 숨김
          document.querySelectorAll('.task-timer-record').forEach(div => {
            if (div !== timerRecordDiv) { // 현재 클릭된 요소의 기록 시간은 제외
              div.style.display = 'none';
            }
          });
          // 현재 클릭된 요소의 기록 시간만 토글
          if (timerRecordDiv.style.display === 'block') {
            timerRecordDiv.style.display = 'none';
          } else {
            timerRecordDiv.style.display = 'block';
          }
          return; // 타이머 선택 로직으로 넘어가지 않음
        }

        // 2. 타이머가 진행 중이 아니고, 편집 모드도 아닐 때의 로직
        if (selectingMode) {
          // 2a. 일정 선택 모드일 때 task-item 클릭 시 (타이머 시작)
          if (currentSelectedTaskItemElement) {
            currentSelectedTaskItemElement.classList.remove('selected'); // 이전 선택 해제
          }
          taskDiv.classList.add('selected'); // 현재 클릭된 task-item 선택
          currentSelectedTaskItemElement = taskDiv; // 현재 선택된 요소 추적

          selectedSchedule = { category, task }; // 선택된 일정 정보 저장
          selectingMode = false; // <--- 일정 선택 후 선택 모드 종료

          timerRunning = true; // 타이머 시작
          timerStartTime = new Date();
          timerElapsed = 0;
          updateTimerUI(); // UI 업데이트 (버튼 상태, 하이라이트 등)
          startTimerInterval(); // 타이머 인터벌 시작

        } else {
          // 2b. 타이머가 진행 중이 아니고, 선택 모드도 아닐 때 (기록 토글)
          // 모든 기록 시간 요소를 숨김
          document.querySelectorAll('.task-timer-record').forEach(div => {
            if (div !== timerRecordDiv) { // 현재 클릭된 요소의 기록 시간은 제외
              div.style.display = 'none';
            }
          });
          // 현재 클릭된 요소의 기록 시간만 토글
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

  const startOfCurrentDay = getStartOfCurrentDay();
  const endOfCurrentDay = new Date(startOfCurrentDay);
  endOfCurrentDay.setDate(endOfCurrentDay.getDate() + 1);


  const dailyTotalTimes = {};
  order.forEach(category => {
    dailyTotalTimes[category] = 0;
  });

  for (const category in records) {
    for (const task in records[category]) {
      records[category][task].forEach(r => {
        const recordStartTime = new Date(r.start);
        if (recordStartTime.getTime() >= startOfCurrentDay.getTime() && recordStartTime.getTime() < endOfCurrentDay.getTime()) {
          if (dailyTotalTimes[category] !== undefined) {
            dailyTotalTimes[category] += r.duration;
          }
        }
      });
    }
  }

  const totalAllDaily = Object.values(dailyTotalTimes).reduce((a, b) => a + b, 0);

  totalTimeDisplay.innerHTML = '';
  const totalTimeLabel = document.createElement('span');
  totalTimeLabel.classList.add('total-time-label');
  totalTimeLabel.textContent = '합계:';
  const totalTimeValue = document.createElement('span');
  totalTimeValue.classList.add('total-time-value');
  totalTimeValue.textContent = formatDuration(totalAllDaily);
  totalTimeDisplay.appendChild(totalTimeLabel);
  totalTimeDisplay.appendChild(totalTimeValue);


  let categoriesForColorRanking = order.map(category => ({ category, time: dailyTotalTimes[category] || 0 }));
  categoriesForColorRanking.sort((a, b) => b.time - a.time);

  const rankColors = ['#d33', '#FF8C00', '#FFD700', '#B0B0B0'];
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

  const analysisGraphInner = document.createElement('div');
  analysisGraphInner.classList.add('analysis-graph-inner');
  analysisGraphContainer.appendChild(analysisGraphInner);

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


  graphDisplayOrder.forEach(category => {
    const time = dailyTotalTimes[category] || 0;
    const barColor = categoryColorMap.get(category) || rankColors[3];

    const labelSpan = document.createElement('span');
    labelSpan.classList.add('analysis-label-item');
    labelSpan.textContent = category;
    labelsColumn.appendChild(labelSpan);

    const barOuter = document.createElement('div');
    barOuter.classList.add('analysis-bar-outer');

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
