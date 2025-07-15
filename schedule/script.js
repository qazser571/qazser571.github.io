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
let isEditing = false; // 예외 스케줄 편집 모드 상태

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
    order.unshift('예외 스케줄'); // 항상 최상단에 추가

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

  if (!timerRunning) {
    timerStateDiv.textContent = '쉬는중';
    timerTimeDiv.textContent = '00:00:00';
    scheduleCategoryDiv.textContent = '';
    scheduleTaskDiv.textContent = '';

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
  } else {
    timerStateDiv.textContent = '진행중';
    btnStart.textContent = '시작';
    btnStart.classList.add('inactive');
    btnStart.classList.remove('selecting-mode');
    btnPause.classList.remove('inactive');
    btnComplete.classList.remove('inactive');
    rightSection.classList.remove('selecting');
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
  renderAnalysisGraph(); // 타이머 종료 시 그래프 색상 업데이트를 위해 호출
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
  // task-list-container의 내용만 초기화. "오늘 일정" 제목은 HTML에 직접 있으므로 그대로 둠.
  taskListContainer.innerHTML = '';

  // "오늘 일정" 제목은 HTML에서 taskListContainer의 형제로 존재해야 하므로,
  // 여기서는 taskListContainer에 추가하지 않습니다.
  // const todayScheduleTitle = document.querySelector('.today-schedule-title-text');
  // if (todayScheduleTitle && todayScheduleTitle.parentNode !== taskListContainer) {
  //     taskListContainer.prepend(todayScheduleTitle);
  // }


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

  // 모든 카테고리를 시간 순으로 정렬하여 색상 순위를 결정
  // '예외 스케줄'도 이제 다른 범주와 동일하게 시간 순위 매김
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

  // 기존 단일 행 구조로 그래프 렌더링
  order.forEach(category => { // order 배열을 기준으로 순서 유지
    const time = dailyTotalTimes[category] || 0;
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
    barInner.style.backgroundColor = barColor;
    barInner.style.transition = 'width 0.5s ease-out';

    barOuter.appendChild(barInner);
    barDiv.appendChild(labelSpan);
    barDiv.appendChild(barOuter);

    analysisGraphContainer.appendChild(barDiv);
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
