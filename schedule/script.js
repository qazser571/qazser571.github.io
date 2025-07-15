const ORDER_FILE_PATH = 'data/order.txt';
const DUTY_FOLDER_PATH = 'data/duty/';

const D_DAY_TARGET_DATE = new Date('2025-11-13T00:00:00');

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
let selectedSchedule = null;
let selectingMode = false;

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
    if (!order.includes('예외 스케줄')) {
      order.unshift('예외 스케줄');
    }
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
  if (!timerRunning) {
    timerStateDiv.textContent = '쉬는중';
    timerTimeDiv.textContent = '00:00:00';
    scheduleCategoryDiv.textContent = '';
    scheduleTaskDiv.textContent = '';

    btnStart.textContent = selectingMode ? '일정 선택' : '시작';
    btnStart.classList.remove('inactive');
    btnPause.classList.add('inactive');
    btnComplete.classList.add('inactive');

    selectedSchedule = null;
    if (!selectingMode) {
      taskListContainer.classList.remove('selecting');
    }
  } else {
    timerStateDiv.textContent = '진행중';
    btnStart.textContent = '시작';
    btnStart.classList.add('inactive');
    btnPause.classList.remove('inactive');
    btnComplete.classList.remove('inactive');
    taskListContainer.classList.remove('selecting');
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
  updateTimerUI();
  renderTaskList();
  renderAnalysisGraph();
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
    titleDiv.textContent = category;
    categoryDiv.appendChild(titleDiv);

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

    tasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.classList.add('task-item');
      taskDiv.dataset.category = category;
      taskDiv.dataset.task = task;

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('task-name');
      nameSpan.textContent = task;
      taskDiv.appendChild(nameSpan);

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
      taskDiv.appendChild(statusBox);

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

        if (selectingMode) return;

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
      });

      taskDiv.addEventListener('click', () => {
        if (!selectingMode) return;

        selectedSchedule = { category, task };
        scheduleCategoryDiv.textContent = category;
        scheduleTaskDiv.textContent = task;

        timerRunning = true;
        timerStartTime = new Date();
        timerElapsed = 0;
        updateTimerUI();
        startTimerInterval();
      });
    });

    taskListContainer.appendChild(categoryDiv);
  });
}

function renderAnalysisGraph() {
  analysisGraphContainer.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyTotalTimes = {};
  order.forEach(category => {
    dailyTotalTimes[category] = 0;
  });

  for (const category in records) {
    for (const task in records[category]) {
      records[category][task].forEach(r => {
        const recordDate = new Date(r.start);
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate.getTime() === today.getTime()) {
          if (dailyTotalTimes[category] !== undefined) {
            dailyTotalTimes[category] += r.duration;
          }
        }
      });
    }
  }

  const totalAllDaily = Object.values(dailyTotalTimes).reduce((a, b) => a + b, 0);

  let categoriesForSorting = order.map(category => ({ category, time: dailyTotalTimes[category] || 0 }));
  let exceptionScheduleItem = null;

  const exceptionIndex = categoriesForSorting.findIndex(item => item.category === '예외 스케줄');
  if (exceptionIndex !== -1) {
      exceptionScheduleItem = categoriesForSorting.splice(exceptionIndex, 1)[0];
  }

  categoriesForSorting.sort((a, b) => b.time - a.time);

  if (exceptionScheduleItem) {
      categoriesForSorting.push(exceptionScheduleItem);
  }

  const finalSortedCategories = categoriesForSorting;

  const colors = ['#d33', '#3366cc', '#ffcc00', '#28a745', '#6f42c1', '#fd7e14', '#17a2b8', '#dc3545'];

  if (order.length === 0) {
    const noDataMessage = document.createElement('div');
    noDataMessage.textContent = '분석 데이터를 불러올 수 없습니다.';
    noDataMessage.style.textAlign = 'center';
    noDataMessage.style.padding = '20px';
    noDataMessage.style.color = '#888';
    analysisGraphContainer.appendChild(noDataMessage);
    return;
  }

  finalSortedCategories.forEach((item, idx) => {
    const category = item.category;
    const time = item.time;

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
    labelSpan.style.flexShrink = '0';

    const barOuter = document.createElement('div');
    barOuter.style.flexGrow = '1';
    barOuter.style.height = '12px';
    barOuter.style.border = '1px solid #ccc';
    barOuter.style.position = 'relative';

    const barInner = document.createElement('div');
    barInner.style.height = '100%';
    barInner.style.width = totalAllDaily > 0 ? `${(time / totalAllDaily) * 100}%` : '0%';
    barInner.style.backgroundColor = colors[idx % colors.length];
    barInner.style.transition = 'width 0.5s ease-out';

    barOuter.appendChild(barInner);
    barDiv.appendChild(labelSpan);
    barDiv.appendChild(barOuter);

    analysisGraphContainer.appendChild(barDiv);
  });
}

function setupEventListeners() {
  btnStart.addEventListener('click', () => {
    if (!timerRunning && !selectingMode) {
      selectingMode = true;
      btnStart.textContent = '일정 선택';
      taskListContainer.classList.add('selecting');
      updateTimerUI();
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
