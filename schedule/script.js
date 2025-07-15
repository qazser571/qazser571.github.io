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
const editScheduleBtn = document.getElementById('editScheduleBtn');

let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let timerRunning = false;
let selectedSchedule = null;
let selectingMode = false;
let isEditing = false;

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

  // --- 색상 순위 결정을 위한 임시 정렬 리스트 생성 ---
  let categoriesForColorRanking = order.map(category => ({ category, time: dailyTotalTimes[category] || 0 }));
  let exceptionScheduleItemForColor = null;

  // '예외 스케줄' 항목을 색상 순위 결정 리스트에서 분리
  const exceptionColorIndex = categoriesForColorRanking.findIndex(item => item.category === '예외 스케줄');
  if (exceptionColorIndex !== -1) {
      exceptionScheduleItemForColor = categoriesForColorRanking.splice(exceptionColorIndex, 1)[0];
  }

  // 나머지 카테고리들을 시간 순으로 정렬 (색상 순위 결정용)
  categoriesForColorRanking.sort((a, b) => b.time - a.time);

  // '예외 스케줄' 항목을 색상 순위 결정 리스트의 맨 뒤에 추가
  if (exceptionScheduleItemForColor) {
      categoriesForColorRanking.push(exceptionScheduleItemForColor);
  }

  // --- 카테고리별 색상 매핑 생성 ---
  // 1등: 빨강, 2등: 주황, 3등: 노랑, 나머지: 회색
  const rankColors = ['#d33', '#FF8C00', '#FFD700', '#B0B0B0']; // 빨강, 주황, 노랑, 회색
  const categoryColorMap = new Map();
  categoriesForColorRanking.forEach((item, idx) => {
      // 3등까지는 고정 색상, 그 이후는 회색
      categoryColorMap.set(item.category, idx < 3 ? rankColors[idx] : rankColors[3]);
  });
  // --- 색상 매핑 끝 ---


  if (order.length === 0) {
    const noDataMessage = document.createElement('div');
    noDataMessage.textContent = '분석 데이터를 불러올 수 없습니다.';
    noDataMessage.style.textAlign = 'center';
    noDataMessage.style.padding = '20px';
    noDataMessage.style.color = '#888';
    analysisGraphContainer.appendChild(noDataMessage);
    return;
  }

  // --- 원래 order 배열을 기준으로 그래프 렌더링 (표시 순서 유지) ---
  order.forEach(category => {
    const time = dailyTotalTimes[category] || 0; // 해당 카테고리의 시간
    const barColor = categoryColorMap.get(category) || rankColors[3]; // 매핑된 색상 사용, 매핑 안된 경우 기본 회색

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
    barInner.style.backgroundColor = barColor; // 순위에 따라 결정된 색상 적용
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

  editScheduleBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    editScheduleBtn.textContent = isEditing ? '완료' : '편집';
    renderTaskList();
  });
}

window.addEventListener('DOMContentLoaded', init);
