// 1. 코돈 데이터 정의 (이전과 동일)
const codonData = {
    "UUU": "Phe", "UUC": "Phe", "UUA": "Leu", "UUG": "Leu",
    "UCU": "Ser", "UCC": "Ser", "UCA": "Ser", "UCG": "Ser",
    "UAU": "Tyr", "UAC": "Tyr", "UAA": "STOP", "UAG": "STOP",
    "UGU": "Cys", "UGC": "Cys", "UGA": "STOP", "UGG": "Trp",

    "CUU": "Leu", "CUC": "Leu", "CUA": "Leu", "CUG": "Leu",
    "CCU": "Pro", "CCC": "Pro", "CCA": "Pro", "CCG": "Pro",
    "CAU": "His", "CAC": "His", "CAA": "Gln", "CAG": "Gln",
    "CGU": "Arg", "CGC": "Arg", "CGA": "Arg", "CGG": "Arg",

    "AUU": "Ile", "AUC": "Ile", "AUA": "Ile", "AUG": "Met (Start)",
    "ACU": "Thr", "ACC": "Thr", "ACA": "Thr", "ACG": "Thr",
    "AAU": "Asn", "AAC": "Asn", "AAA": "Lys", "AAG": "Lys",
    "AGU": "Ser", "AGC": "Ser", "AGA": "Arg", "AGG": "Arg",

    "GUU": "Val", "GUC": "Val", "GUA": "Val", "GUG": "Val",
    "GCU": "Ala", "GCC": "Ala", "GCA": "Ala", "GCG": "Ala",
    "GAU": "Asp", "GAC": "Asp", "GAA": "Glu", "GAG": "Glu",
    "GGU": "Gly", "GGC": "Gly", "GGA": "Gly", "GGG": "Gly"
};

// 2. DOM 요소 참조 (이전과 동일)
const codonTableBody = document.querySelector('#codonTable tbody');
const startButton = document.getElementById('startButton');
const currentCodonDisplay = document.getElementById('currentCodonDisplay');
const feedbackDiv = document.getElementById('feedback');
const correctCountSpan = document.getElementById('correctCount');
const remainingCountSpan = document.getElementById('remainingCount');
const resetGameButton = document.getElementById('resetGameButton');
const missedCodonsContainer = document.getElementById('missedCodonsContainer');
const missedCodonsList = document.getElementById('missedCodonsList');

// 3. 게임 상태 변수 (이전과 동일)
let allCodons = Object.keys(codonData);
let availableCodons = [];
let missedCodons = [];
let currentRandomCodon = null;
let selectedCodonItem = null;
let correctCodonItem = null;
let correctCount = 0;
let totalCodonsToGuess = allCodons.length;
let isReviewMode = false;

// 4. 코돈표 동적 생성 (★★★ th 생성 부분 제거 ★★★)
function createCodonTable() {
    const bases = ['U', 'C', 'A', 'G']; // 이 배열은 코돈 생성 로직에만 사용됨
    codonTableBody.innerHTML = '';

    bases.forEach(firstBase => {
        const row = document.createElement('tr');
        // ★★★ th 요소 생성 부분 제거 ★★★
        // const rowHeader = document.createElement('th');
        // rowHeader.textContent = firstBase;
        // row.appendChild(rowHeader);

        bases.forEach(secondBase => {
            const cell = document.createElement('td');
            const codonGroupDiv = document.createElement('div');
            codonGroupDiv.classList.add('codon-group');

            bases.forEach(thirdBase => {
                const codon = firstBase + secondBase + thirdBase;
                const aminoAcid = codonData[codon];

                const codonItemDiv = document.createElement('div');
                codonItemDiv.classList.add('codon-item');
                codonItemDiv.setAttribute('data-codon', codon);
                codonItemDiv.addEventListener('click', handleCellClick);

                codonItemDiv.innerHTML = `
                    <span class="codon-text">${codon}</span><br>
                    <span class="amino-acid-text">${aminoAcid}</span>
                `;
                codonGroupDiv.appendChild(codonItemDiv);
            });
            cell.appendChild(codonGroupDiv);
            row.appendChild(cell);
        });
        codonTableBody.appendChild(row);
    });
}

// 5. 게임 초기화 (이전과 동일)
function initializeGame() {
    availableCodons = [...allCodons];
    missedCodons = [];
    currentRandomCodon = null;
    selectedCodonItem = null;
    correctCodonItem = null;
    correctCount = 0;
    isReviewMode = false;

    currentCodonDisplay.textContent = '';
    feedbackDiv.textContent = '';
    feedbackDiv.className = 'message';
    correctCountSpan.textContent = correctCount;
    remainingCountSpan.textContent = availableCodons.length;

    document.querySelectorAll('.codon-item').forEach(item => {
        item.classList.remove('selected', 'correct-answer', 'incorrect-answer', 'visible');
        item.querySelector('.codon-text').classList.remove('visible');
        item.querySelector('.amino-acid-text').classList.remove('visible');
    });

    startButton.textContent = '시작';
    startButton.disabled = false;
    resetGameButton.classList.add('hidden');
    missedCodonsContainer.classList.add('hidden');
    missedCodonsList.innerHTML = '';
}

// 6. 무작위 코돈 선택 및 표시 (이전과 동일)
function selectRandomCodon() {
    document.querySelectorAll('.codon-item').forEach(item => {
        item.classList.remove('selected', 'correct-answer', 'incorrect-answer');
        item.querySelector('.codon-text').classList.remove('visible');
        item.querySelector('.amino-acid-text').classList.remove('visible');
    });
    selectedCodonItem = null;
    correctCodonItem = null;

    let pool = isReviewMode ? missedCodons : availableCodons;

    if (pool.length === 0) {
        if (!isReviewMode) {
            if (missedCodons.length > 0) {
                isReviewMode = true;
                startButton.textContent = '틀린 코돈 복습 시작';
                alert('모든 코돈을 한 번씩 확인했습니다! 이제 틀린 코돈을 복습합니다.');
                updateMissedCodonsList();
                pool = missedCodons;
                missedCodonsContainer.classList.remove('hidden');
                if (pool.length === 0) {
                    currentCodonDisplay.textContent = '완료!';
                    feedbackDiv.textContent = '모든 코돈을 완벽하게 마스터했습니다! 축하합니다!';
                    feedbackDiv.classList.add('correct');
                    startButton.disabled = true;
                    resetGameButton.classList.remove('hidden');
                    return;
                }
            } else {
                currentCodonDisplay.textContent = '완료!';
                feedbackDiv.textContent = '모든 코돈을 완벽하게 마스터했습니다! 축하합니다!';
                feedbackDiv.classList.add('correct');
                startButton.disabled = true;
                resetGameButton.classList.remove('hidden');
                return;
            }
        } else {
            currentCodonDisplay.textContent = '완료!';
            feedbackDiv.textContent = '틀린 코돈까지 모두 맞췄습니다! 대단해요!';
            feedbackDiv.classList.add('correct');
            startButton.disabled = true;
            resetGameButton.classList.remove('hidden');
            missedCodonsContainer.classList.add('hidden');
            return;
        }
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    currentRandomCodon = pool[randomIndex];
    currentCodonDisplay.textContent = currentRandomCodon;
    feedbackDiv.textContent = '';
    feedbackDiv.className = 'message';

    startButton.textContent = '다음';
    startButton.disabled = true;
}

// 7. 개별 코돈 클릭 이벤트 핸들러 (이전과 동일)
function handleCellClick(event) {
    if (!currentRandomCodon) {
        feedbackDiv.textContent = '먼저 "시작" 또는 "다음" 버튼을 눌러주세요!';
        feedbackDiv.classList.add('incorrect');
        return;
    }

    document.querySelectorAll('.codon-item').forEach(item => {
        item.classList.remove('selected', 'correct-answer', 'incorrect-answer');
    });
    
    selectedCodonItem = event.currentTarget;
    selectedCodonItem.classList.add('selected');

    const clickedCodon = selectedCodonItem.getAttribute('data-codon');

    correctCodonItem = document.querySelector(`.codon-item[data-codon="${currentRandomCodon}"]`);

    if (clickedCodon === currentRandomCodon) {
        feedbackDiv.textContent = '정답입니다! 짝짝짝!';
        feedbackDiv.classList.remove('incorrect');
        feedbackDiv.classList.add('correct');

        selectedCodonItem.classList.add('correct-answer');
        selectedCodonItem.classList.add('visible');
        
        selectedCodonItem.closest('td').querySelectorAll('.codon-item').forEach(item => {
            item.classList.add('visible');
        });

        if (isReviewMode) {
            missedCodons = missedCodons.filter(codon => codon !== currentRandomCodon);
            updateMissedCodonsList();
        } else {
            correctCount++;
            availableCodons = availableCodons.filter(codon => codon !== currentRandomCodon);
        }
    } else {
        feedbackDiv.textContent = `오답입니다! ${currentRandomCodon}은(는) ${codonData[currentCodonDisplay.textContent]} 입니다.`;
        feedbackDiv.classList.remove('correct');
        feedbackDiv.classList.add('incorrect');

        selectedCodonItem.classList.add('incorrect-answer');
        selectedCodonItem.classList.add('visible');

        selectedCodonItem.closest('td').querySelectorAll('.codon-item').forEach(item => {
            item.classList.add('visible');
        });

        if (correctCodonItem) {
            correctCodonItem.classList.add('correct-answer');
            correctCodonItem.classList.add('visible');
            correctCodonItem.closest('td').querySelectorAll('.codon-item').forEach(item => {
                item.classList.add('visible');
            });
        }

        if (!missedCodons.includes(currentRandomCodon) && !isReviewMode) {
            missedCodons.push(currentRandomCodon);
        }
    }

    currentRandomCodon = null;
    startButton.disabled = false;
    updateCounts();
}

// 8. 카운트 업데이트 (이전과 동일)
function updateCounts() {
    correctCountSpan.textContent = correctCount;
    remainingCountSpan.textContent = isReviewMode ? missedCodons.length : availableCodons.length;
    if (isReviewMode && missedCodons.length === 0) {
        selectRandomCodon();
    }
}

// 9. 틀린 코돈 목록 업데이트 (이전과 동일)
function updateMissedCodonsList() {
    missedCodonsList.innerHTML = '';
    if (missedCodons.length === 0) {
        missedCodonsContainer.classList.add('hidden');
        return;
    }
    missedCodonsContainer.classList.remove('hidden');
    missedCodons.forEach(codon => {
        const li = document.createElement('li');
        li.textContent = `${codon} (${codonData[codon]})`;
        missedCodonsList.appendChild(li);
    });
}

// 10. 이벤트 리스너 등록 (이전과 동일)
startButton.addEventListener('click', selectRandomCodon);
resetGameButton.addEventListener('click', initializeGame);

// 초기 설정
createCodonTable();
initializeGame();
