function updateClock() {
  const now = new Date();

  const hours24 = now.getHours();
  const ampm = hours24 >= 12 ? '오후' : '오전';
  document.getElementById('ampm').textContent = ampm;

  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const hoursStr = String(hours12).padStart(2, ' ');
  const minutesStr = String(now.getMinutes()).padStart(2, '0');
  const secondsStr = String(now.getSeconds()).padStart(2, '0');

  document.getElementById('digitalTime').textContent = `${hoursStr}:${minutesStr}:${secondsStr}`;

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();

  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const weekdayStr = weekdays[now.getDay()];

  document.getElementById('date').textContent = `${year}년 ${month}월 ${date}일 ${weekdayStr}`;
}

updateClock();
setInterval(updateClock, 1000);