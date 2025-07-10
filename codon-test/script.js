document.addEventListener('DOMContentLoaded', () => {
    // 1. 코돈 데이터 정의 (이전과 동일)
    const codonData = [
        [['UUU', 'UUC'], '페닐알라닌', 'F'], [['UUA', 'UUG'], '류신', 'L'],
        [['UCU', 'UCC', 'UCA', 'UCG'], '세린', 'S'],
        [['UAU', 'UAC'], '티로신', 'Y'], [['UAA', 'UAG'], '종결', 'STOP'],
        [['UGU', 'UGC'], '시스테인', 'C'], [['UGA'], '종결', 'STOP'],
        [['UGG'], '트립토판', 'W'],

        [['CUU', 'CUC', 'CUA', 'CUG'], '류신', 'L'],
        [['CCU', 'CCC', 'CCA', 'CCG'], '프롤린', 'P'],
        [['CAU', 'CAC'], '히스티딘', 'H'], [['CAA', 'CAG'], '글루타민', 'Q'],
        [['CGU', 'CGC', 'CGA', 'CGG'], '아르기닌', 'R'],

        [['AUU', 'AUC', 'AUA'], '이소류신', 'I'], [['AUG'], '메티오닌', 'M'],
        [['ACU', 'ACC', 'ACA', 'ACG'], '트레오닌', 'T'],
        [['AAU', 'AAC'], '아스파라진', 'N'], [['AAA', 'AAG'], '리신', 'K'],
        [['AGU', 'AGC'], '세린', 'S'], [['AGA', 'AGG'], '아르기닌', 'R'],

        [['GUU', 'GUC', 'GUA', 'GUG'], '발린', 'V'],
        [['GCU', 'GCC', 'GCA', 'GCG'], '알라닌', 'A'],
        [['GAU', 'GAC'], '아스파르트산', 'D'], [['GAA', 'GAG'], '글루탐산', 'E'],
        [['GGU', 'GGC', 'GGA', 'GGG'], '글라이신', 'G']
    ];

    // 코돈 데이터를 앞 두 글자 기준으로 그룹화 (이전과 동일)
    const groupedCodonBlocks = [
        ['U', 'U', [0, 1]], ['U', 'C', [2]], ['U', 'A', [3, 4]], ['U', 'G', [5, 6, 7]],
        ['C', 'U', [8]], ['C', 'C', [9]], ['C', 'A', [10, 11]], ['C', 'G', [12]],
        ['A', 'U', [13, 14]], ['A', 'C', [15]], ['A', 'A', [16, 17]], ['A', 'G', [18, 19]],
        ['G', 'U', [20]], ['G', 'C', [21]], ['G', 'A', [22, 23]], ['G', 'G', [24]]
    ];

    // 2. DOM 요소 참조
    const codonTableContainer = document.getElementById('codon-table-container');
    const modeSelectionButtons = document.getElementById('mode-selection-buttons');
    const mode1Btn = document.getElementById('mode1-btn');
    const mode2Btn = document.getElementById('mode2-btn');
    const selectionArea = document.getElementById('selection-area');
    const selectAllBtn = document.getElementById('select-all-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const gameInfoArea = document.getElementById('game-info-area');
    const currentQuestionDisplay = document.getElementById('current-question');
    const gameEndArea = document.getElementById('game-end-area');
    const scoreDisplay = document.getElementById('score-display');
    const retryWrongBtn = document.getElementById('retry-wrong-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const toggleCodonsBtn = document.getElementById('toggle-codons');
    const toggleAminoAcidsBtn = document.getElementById('toggle-amino-acids');
    const toggleAminoAcidDisplayModeBtn = document.getElementById('toggle-amino-acid-display-mode');

    // 3. 게임 상태 변수
    let currentMode = null; // 'setup', 'game1', 'game2', 'end'
    let selectedCodonGroupIndices = new Set();
    let questionQueue = [];
    let wrongAnswers = [];
    let currentQuestion = null;
    let currentCorrectCells = [];
    let correctClicksCount = 0;
    let totalQuestions = 0;
    let correctAnswersCount = 0;

    let showCodons = true;
    let showAminoAcids = true;
    let aminoAcidDisplayMode = 0;

    // 4. UI 상태 관리 함수
    function updateUI(state) {
        // 모든 조건부 영역 숨기기
        modeSelectionButtons.classList.add('hidden'); // 일단 숨기고, setup에서 다시 보이게
        selectionArea.classList.add('hidden'); // 일단 숨기고, setup에서 다시 보이게
        gameInfoArea.classList.add('hidden');
        gameEndArea.classList.add('hidden');

        // 모드 선택 버튼의 active 클래스 초기화
        mode1Btn.classList.remove('active');
        mode2Btn.classList.remove('active');

        // 코돈표 셀의 클릭 이벤트 리스너 제거 및 초기화
        document.querySelectorAll('.codon-group-cell').forEach(cell => {
            cell.removeEventListener('click', handleSelectionClick);
            cell.removeEventListener('click', handleCellClick);
            cell.classList.remove('selected-for-game', 'correct-answer', 'wrong-answer-flash');
        });

        // 상태에 따라 특정 영역 표시 및 이벤트 리스너 설정
        switch (state) {
            case 'setup': // 게임 모드 선택 및 학습 범위 설정 단계
                modeSelectionButtons.classList.remove('hidden');
                selectionArea.classList.remove('hidden');
                // 현재 선택된 모드가 있다면 active 클래스 유지
                if (currentMode === 'game1') mode1Btn.classList.add('active');
                if (currentMode === 'game2') mode2Btn.classList.add('active');

                // 셀 선택/해제 이벤트 리스너 다시 추가
                document.querySelectorAll('.codon-group-cell').forEach(cell => {
                    cell.addEventListener('click', handleSelectionClick);
                    // 이전에 선택된 셀은 selected-for-game 클래스 유지
                    if (selectedCodonGroupIndices.has(parseInt(cell.dataset.index))) {
                        cell.classList.add('selected-for-game');
                    }
                });
                updateSelectAllButtonState(); // "모두 선택" 버튼 상태 업데이트
                break;
            case 'game':
                gameInfoArea.classList.remove('hidden');
                // 게임 중에는 코돈표 셀이 클릭되면 정오답 확인
                document.querySelectorAll('.codon-group-cell').forEach(cell => {
                    cell.addEventListener('click', handleCellClick);
                    cell.classList.remove('selected-for-game'); // 게임 시작 시 선택 표시 제거
                });
                break;
            case 'end':
                gameEndArea.classList.remove('hidden');
                break;
        }
    }

    // 5. 코돈표 동적 생성 및 업데이트 함수 (이전과 동일)
    function updateCodonTable() {
        codonTableContainer.innerHTML = '';
        const firstBases = ['U', 'C', 'A', 'G'];
        const secondBases = ['U', 'C', 'A', 'G'];

        for (let i = 0; i < firstBases.length; i++) {
            for (let j = 0; j < secondBases.length; j++) {
                const currentFirstBase = firstBases[i];
                const currentSecondBase = secondBases[j];

                const blockInfo = groupedCodonBlocks.find(block =>
                    block[0] === currentFirstBase && block[1] === currentSecondBase
                );

                const codonBlock = document.createElement('div');
                codonBlock.classList.add('codon-block');

                if (blockInfo) {
                    blockInfo[2].forEach(dataIndex => {
                        const group = codonData[dataIndex];
                        const [codons, aminoAcidName, aminoAcidAbbr] = group;

                        const cell = document.createElement('div');
                        cell.classList.add('codon-group-cell');
                        cell.dataset.index = dataIndex;

                        const codonsDiv = document.createElement('div');
                        codonsDiv.classList.add('codons');
                        codons.forEach(codon => {
                            const codonItem = document.createElement('span');
                            codonItem.classList.add('codon-item');
                            codonItem.textContent = codon;
                            codonsDiv.appendChild(codonItem);
                        });
                        cell.appendChild(codonsDiv);

                        const aminoAcidDiv = document.createElement('div');
                        aminoAcidDiv.classList.add('amino-acid');

                        let displayText = '';
                        if (aminoAcidDisplayMode === 0) {
                            displayText = `${aminoAcidName}(${aminoAcidAbbr})`;
                        } else if (aminoAcidDisplayMode === 1) {
                            displayText = aminoAcidName;
                        } else {
                            displayText = aminoAcidAbbr;
                        }
                        aminoAcidDiv.textContent = displayText;
                        cell.appendChild(aminoAcidDiv);

                        if (!showCodons) {
                            cell.classList.add('hidden-codon');
                        } else {
                            cell.classList.remove('hidden-codon');
                        }

                        if (!showAminoAcids) {
                            cell.classList.add('hidden-amino-acid');
                        } else {
                            cell.classList.remove('hidden-amino-acid');
                        }
                        codonBlock.appendChild(cell);
                    });
                }
                codonTableContainer.appendChild(codonBlock);
            }
        }
        updateUI(currentMode); // UI 상태를 다시 적용하여 이벤트 리스너 등 업데이트
    }

    // 6. 게임 로직 함수 (이전과 동일)
    function startGame() {
        totalQuestions = 0;
        correctAnswersCount = 0;
        wrongAnswers = [];
        questionQueue = Array.from(selectedCodonGroupIndices);
        shuffleArray(questionQueue);

        if (questionQueue.length === 0) {
            alert('게임을 시작하려면 최소 하나 이상의 코돈 그룹을 선택해야 합니다.');
            currentMode = 'setup'; // 다시 설정 화면으로
            updateUI(currentMode);
            return;
        }
        
        // currentMode는 이미 'game1' 또는 'game2'로 설정되어 있음
        updateUI('game');
        nextQuestion();
    }

    function nextQuestion() {
        if (questionQueue.length === 0) {
            endGame();
            return;
        }

        totalQuestions++;
        currentCorrectCells = [];
        correctClicksCount = 0;

        const questionIndex = questionQueue.shift();
        currentQuestion = questionIndex;

        document.querySelectorAll('.codon-group-cell').forEach(cell => {
            cell.classList.remove('correct-answer', 'wrong-answer-flash');
        });

        if (currentMode === 'game1') {
            const randomCodon = codonData[questionIndex][0][Math.floor(Math.random() * codonData[questionIndex][0].length)];
            currentQuestionDisplay.textContent = `코돈: ${randomCodon}`;
            currentCorrectCells = [document.querySelector(`.codon-group-cell[data-index="${questionIndex}"]`)];
        } else if (currentMode === 'game2') {
            const aminoAcidName = codonData[questionIndex][1];
            currentQuestionDisplay.textContent = `아미노산: ${aminoAcidName}`;
            currentCorrectCells = Array.from(document.querySelectorAll('.codon-group-cell')).filter(cell => {
                return codonData[parseInt(cell.dataset.index)][1] === aminoAcidName;
            });
        }
    }

    function checkAnswer(clickedCell) {
        const clickedIndex = parseInt(clickedCell.dataset.index);
        let isCorrect = false;

        if (currentMode === 'game1') {
            if (currentCorrectCells[0] && parseInt(currentCorrectCells[0].dataset.index) === clickedIndex) {
                isCorrect = true;
            }
        } else if (currentMode === 'game2') {
            const isAnyCorrect = currentCorrectCells.some(cell => parseInt(cell.dataset.index) === clickedIndex);
            if (isAnyCorrect) {
                clickedCell.classList.add('correct-answer');
                correctClicksCount++;

                if (correctClicksCount === currentCorrectCells.length) {
                    isCorrect = true;
                } else {
                    return;
                }
            }
        }

        if (isCorrect) {
            correctAnswersCount++;
            if (currentMode === 'game1') {
                currentCorrectCells[0].classList.add('correct-answer');
            }
            setTimeout(nextQuestion, 500);
        } else {
            wrongAnswers.push(currentQuestion);
            currentCorrectCells.forEach(cell => {
                cell.classList.add('wrong-answer-flash');
                setTimeout(() => cell.classList.remove('wrong-answer-flash'), 1500);
            });
            setTimeout(nextQuestion, 1500);
        }
    }

    function endGame() {
        currentMode = 'end';
        updateUI('end');
        scoreDisplay.textContent = `총 ${totalQuestions}문제 중 ${correctAnswersCount}문제 정답!`;
        if (wrongAnswers.length > 0) {
            retryWrongBtn.style.display = 'block';
        } else {
            retryWrongBtn.style.display = 'none';
        }
    }

    // 7. 이벤트 핸들러
    // 모드 선택
    mode1Btn.addEventListener('click', () => {
        currentMode = 'game1';
        mode1Btn.classList.add('active');
        mode2Btn.classList.remove('active');
        updateUI('setup'); // 모드 변경 후 UI 업데이트 (버튼 활성화 상태 반영)
    });

    mode2Btn.addEventListener('click', () => {
        currentMode = 'game2';
        mode2Btn.classList.add('active');
        mode1Btn.classList.remove('active');
        updateUI('setup'); // 모드 변경 후 UI 업데이트 (버튼 활성화 상태 반영)
    });

    // 범위 선택 모드에서 셀 클릭 (선택/해제)
    function handleSelectionClick(event) {
        const cell = event.currentTarget;
        const index = parseInt(cell.dataset.index);
        if (selectedCodonGroupIndices.has(index)) {
            selectedCodonGroupIndices.delete(index);
            cell.classList.remove('selected-for-game');
        } else {
            selectedCodonGroupIndices.add(index);
            cell.classList.add('selected-for-game');
        }
        updateSelectAllButtonState(); // 셀 선택/해제 시 "모두 선택" 버튼 상태 업데이트
    }

    // "모두 선택" 버튼 상태를 업데이트하는 함수
    function updateSelectAllButtonState() {
        const totalCodonGroups = codonData.length;
        if (selectedCodonGroupIndices.size === totalCodonGroups) {
            selectAllBtn.textContent = '모두 선택 해제';
            selectAllBtn.dataset.toggleState = 'deselect-all';
        } else {
            selectAllBtn.textContent = '모두 선택';
            selectAllBtn.dataset.toggleState = 'select-all';
        }
    }

    // "모두 선택" 버튼 클릭 이벤트
    selectAllBtn.addEventListener('click', () => {
        if (selectAllBtn.dataset.toggleState === 'select-all') {
            // 모든 코돈 그룹 선택
            selectedCodonGroupIndices.clear();
            for (let i = 0; i < codonData.length; i++) {
                selectedCodonGroupIndices.add(i);
            }
            document.querySelectorAll('.codon-group-cell').forEach(cell => {
                cell.classList.add('selected-for-game');
            });
        } else {
            // 모든 코돈 그룹 선택 해제
            selectedCodonGroupIndices.clear();
            document.querySelectorAll('.codon-group-cell').forEach(cell => {
                cell.classList.remove('selected-for-game');
            });
        }
        updateSelectAllButtonState(); // 버튼 상태 업데이트
    });

    // 게임 중 셀 클릭 (정오답 확인)
    function handleCellClick(event) {
        const clickedCell = event.currentTarget;
        checkAnswer(clickedCell);
    }

    startGameBtn.addEventListener('click', startGame);

    retryWrongBtn.addEventListener('click', () => {
        selectedCodonGroupIndices = new Set(wrongAnswers);
        startGame();
    });

    startOverBtn.addEventListener('click', () => {
        selectedCodonGroupIndices.clear();
        currentMode = 'setup'; // 설정 화면으로 돌아가기
        updateCodonTable(); // 테이블 다시 그리기 (선택 초기화 반영)
        updateUI(currentMode); // UI 초기화
    });

    // 코돈/아미노산 가시성 토글 버튼 (이전과 동일)
    toggleCodonsBtn.addEventListener('click', () => {
        showCodons = !showCodons;
        toggleCodonsBtn.textContent = showCodons ? '코돈 숨기기' : '코돈 보이기';
        toggleCodonsBtn.classList.toggle('active', !showCodons);
        updateCodonTable();
    });

    toggleAminoAcidsBtn.addEventListener('click', () => {
        showAminoAcids = !showAminoAcids;
        toggleAminoAcidsBtn.textContent = showAminoAcids ? '아미노산 숨기기' : '아미노산 보이기';
        toggleAminoAcidsBtn.classList.toggle('active', !showAminoAcids);
        updateCodonTable();
    });

    // 아미노산 표시 모드 토글 버튼 (이전과 동일)
    toggleAminoAcidDisplayModeBtn.addEventListener('click', () => {
        aminoAcidDisplayMode = (aminoAcidDisplayMode + 1) % 3;
        let buttonText = '';
        if (aminoAcidDisplayMode === 0) {
            buttonText = '표시 모드: 세린(S)';
        } else if (aminoAcidDisplayMode === 1) {
            buttonText = '표시 모드: 세린';
        } else {
            buttonText = '표시 모드: S';
        }
        toggleAminoAcidDisplayModeBtn.textContent = buttonText;
        updateCodonTable();
    });

    // 배열 섞기 유틸리티 함수
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 초기화: 페이지 로드 시 코돈표 생성 및 UI 설정
    currentMode = 'setup'; // 시작 모드를 명시적으로 'setup'으로 설정
    updateCodonTable(); // 코돈표 먼저 생성
    updateUI(currentMode); // 초기 UI 상태 설정
});
