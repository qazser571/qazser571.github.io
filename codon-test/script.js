document.addEventListener('DOMContentLoaded', () => {
    // 1. 코돈 데이터 정의 (아미노산 이름 수정 및 코돈 개수 추가)
    // 각 배열 요소는 [코돈 배열, 아미노산 한글명, 아미노산 1글자 약어] 형태입니다.
    const codonData = [
        [['UUU', 'UUC'], '페닐알라닌', 'F'],
        [['UUA', 'UUG'], '류신', 'L'],
        [['UCU', 'UCC', 'UCA', 'UCG'], '세린', 'S'],
        [['UAU', 'UAC'], '타이로신', 'Y'], // 티로신 -> 타이로신
        [['UAA', 'UAG'], '종결코돈', 'STOP'], // 종결 -> 종결코돈
        [['UGU', 'UGC'], '시스테인', 'C'],
        [['UGA'], '종결코돈', 'STOP'], // 종결 -> 종결코돈
        [['UGG'], '트립토판', 'W'],

        [['CUU', 'CUC', 'CUA', 'CUG'], '류신', 'L'],
        [['CCU', 'CCC', 'CCA', 'CCG'], '프롤린', 'P'],
        [['CAU', 'CAC'], '히스티딘', 'H'],
        [['CAA', 'CAG'], '글루타민', 'Q'],
        [['CGU', 'CGC', 'CGA', 'CGG'], '아르지닌', 'R'], // 아르기닌 -> 아르지닌

        [['AUU', 'AUC', 'AUA'], '이소류신', 'I'],
        [['AUG'], '메싸이오닌', 'M'], // 메티오닌 -> 메싸이오닌
        [['ACU', 'ACC', 'ACA', 'ACG'], '트레오닌', 'T'],
        [['AAU', 'AAC'], '아스파라진', 'N'],
        [['AAA', 'AAG'], '류신', 'K'], // 리신 -> 류신 (주의: 류신이 중복됨)
        [['AGU', 'AGC'], '세린', 'S'],
        [['AGA', 'AGG'], '아르지닌', 'R'], // 아르기닌 -> 아르지닌

        [['GUU', 'GUC', 'GUA', 'GUG'], '발린', 'V'],
        [['GCU', 'GCC', 'GCA', 'GCG'], '알라닌', 'A'],
        [['GAU', 'GAC'], '아스파트산', 'D'], // 아스파르트산 -> 아스파트산
        [['GAA', 'GAG'], '글루탐산', 'E'],
        [['GGU', 'GGC', 'GGA', 'GGG'], '글리신', 'G'] // 글라이신 -> 글리신
    ];

    // 코돈 데이터를 앞 두 글자 기준으로 그룹화 (이전과 동일)
    const groupedCodonBlocks = [
        ['U', 'U', [0, 1]], ['U', 'C', [2]], ['U', 'A', [3, 4]], ['U', 'G', [5, 6, 7]],
        ['C', 'U', [8]], ['C', 'C', [9]], ['C', 'A', [10, 11]], ['C', 'G', [12]],
        ['A', 'U', [13, 14]], ['A', 'C', [15]], ['A', 'A', [16, 17]], ['A', 'G', [18, 19]],
        ['G', 'U', [20]], ['G', 'C', [21]], ['G', 'A', [22, 23]], ['G', 'G', [24]]
    ];

    // 2. DOM 요소 참조 (이전과 동일)
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

    // 3. 게임 상태 변수 (이전과 동일)
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

    // 4. UI 상태 관리 함수 (이전과 동일)
    function updateUI(state) {
        modeSelectionButtons.classList.add('hidden');
        selectionArea.classList.add('hidden');
        gameInfoArea.classList.add('hidden');
        gameEndArea.classList.add('hidden');

        mode1Btn.classList.remove('active');
        mode2Btn.classList.remove('active');

        document.querySelectorAll('.codon-group-cell').forEach(cell => {
            cell.removeEventListener('click', handleSelectionClick);
            cell.removeEventListener('click', handleCellClick);
            cell.classList.remove('selected-for-game', 'correct-answer', 'wrong-answer-flash');
        });

        switch (state) {
            case 'setup':
                modeSelectionButtons.classList.remove('hidden');
                selectionArea.classList.remove('hidden');
                if (currentMode === 'game1') mode1Btn.classList.add('active');
                if (currentMode === 'game2') mode2Btn.classList.add('active');

                document.querySelectorAll('.codon-group-cell').forEach(cell => {
                    cell.addEventListener('click', handleSelectionClick);
                    if (selectedCodonGroupIndices.has(parseInt(cell.dataset.index))) {
                        cell.classList.add('selected-for-game');
                    }
                });
                updateSelectAllButtonState();
                break;
            case 'game':
                gameInfoArea.classList.remove('hidden');
                document.querySelectorAll('.codon-group-cell').forEach(cell => {
                    cell.addEventListener('click', handleCellClick);
                    cell.classList.remove('selected-for-game');
                });
                break;
            case 'end':
                gameEndArea.classList.remove('hidden');
                break;
        }
    }

    // 5. 코돈표 동적 생성 및 업데이트 함수 (수정)
    function updateCodonTable() {
        codonTableContainer.innerHTML = '';
        const firstBases = ['U', 'C', 'A', 'G'];
        const secondBases = ['U', 'C', 'A', 'G'];

        // 각 codon-block의 기본 높이 (600px / 4 = 150px)
        const baseBlockHeight = 600 / 4;

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
                    // 이 블록에 포함될 codon-group-cell들의 총 코돈 개수를 계산
                    let totalCodonsInBlock = 0;
                    blockInfo[2].forEach(dataIndex => {
                        totalCodonsInBlock += codonData[dataIndex][0].length;
                    });

                    // 각 codon-group-cell의 높이를 설정
                    blockInfo[2].forEach(dataIndex => {
                        const group = codonData[dataIndex];
                        const [codons, aminoAcidName, aminoAcidAbbr] = group;
                        const numCodonsInGroup = codons.length; // 현재 그룹의 코돈 개수

                        const cell = document.createElement('div');
                        cell.classList.add('codon-group-cell');
                        cell.dataset.index = dataIndex;

                        // 높이 계산: (현재 그룹의 코돈 개수 / 4) * baseBlockHeight
                        // 4는 한 칸에 들어갈 수 있는 최대 코돈 개수 (예: UCU, UCC, UCA, UCG)
                        // baseBlockHeight는 codon-block의 총 높이 (150px)
                        // 예를 들어, 1개 코돈은 (1/4) * 150px = 37.5px
                        // 2개 코돈은 (2/4) * 150px = 75px
                        // 3개 코돈은 (3/4) * 150px = 112.5px
                        // 4개 코돈은 (4/4) * 150px = 150px
                        // 하지만, 한 블록에 여러 그룹이 들어갈 수 있으므로, 해당 블록의 총 높이(150px)를
                        // 각 그룹의 코돈 개수 비율로 나누어 할당해야 합니다.
                        // 이전에 'min-height'를 사용했으나, 이제는 정확한 비율로 할당합니다.
                        // 각 블록 내에서 각 셀의 높이는 (해당 셀의 코돈 개수 / 해당 블록 내 총 코돈 개수) * baseBlockHeight 로 계산하는 것이 더 정확합니다.
                        // 하지만 요청은 "한칸 높이의 25%에 해당하는 만큼의 높이를 가지고" 이므로,
                        // '한칸'을 4코돈짜리 셀로 보고, 1코돈=1/4, 2코돈=2/4 등으로 계산합니다.
                        // 이 경우, 한 codon-block의 총 높이 150px를 넘을 수 있으므로,
                        // 각 codon-group-cell의 높이를 유동적으로 설정하기 보다는,
                        // codon-block 내에서 flex-grow를 사용하거나,
                        // 각 codon-group-cell의 min-height를 설정하고,
                        // codon-block의 height를 flex-basis로 설정하는 방법이 있습니다.
                        // 여기서는 요청에 따라 각 codon-group-cell의 높이를 직접 계산하여 적용합니다.
                        // 이 방식은 한 codon-block의 총 높이 150px를 초과할 수 있습니다.
                        // 만약 정확히 150px에 맞춰야 한다면, 각 블록에 들어가는 그룹들의 코돈 개수 합계를 기준으로 비율을 재조정해야 합니다.
                        // 현재 요청은 "한칸 높이의 25%에 해당하는 만큼의 높이를 가질 수 있도록" 이므로,
                        // '한칸'을 150px (4코돈 기준)으로 보고, 1코돈=37.5px, 2코돈=75px 등으로 설정하겠습니다.
                        const heightPerCodon = baseBlockHeight / 4; // 1코돈 당 37.5px
                        cell.style.height = `${numCodonsInGroup * heightPerCodon}px`;


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
        updateUI(currentMode);
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
            currentMode = 'setup';
            updateUI(currentMode);
            return;
        }
        
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

    // 7. 이벤트 핸들러 (이전과 동일)
    mode1Btn.addEventListener('click', () => {
        currentMode = 'game1';
        mode1Btn.classList.add('active');
        mode2Btn.classList.remove('active');
        updateUI('setup');
    });

    mode2Btn.addEventListener('click', () => {
        currentMode = 'game2';
        mode2Btn.classList.add('active');
        mode1Btn.classList.remove('active');
        updateUI('setup');
    });

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
        updateSelectAllButtonState();
    }

    function updateSelectAllButtonState() {
        const totalCodonGroups = codonData.length;
        const selectedCount = selectedCodonGroupIndices.size;

        if (selectedCount === totalCodonGroups) {
            selectAllBtn.textContent = '전체 선택됨';
            selectAllBtn.dataset.toggleAction = 'deselect-all';
        } else if (selectedCount === 0) {
            selectAllBtn.textContent = '전체 선택 해제됨';
            selectAllBtn.dataset.toggleAction = 'select-all';
        } else {
            selectAllBtn.textContent = '전체 선택 해제하기';
            selectAllBtn.dataset.toggleAction = 'deselect-all';
        }
    }

    selectAllBtn.addEventListener('click', () => {
        const action = selectAllBtn.dataset.toggleAction;

        if (action === 'select-all') {
            selectedCodonGroupIndices.clear();
            for (let i = 0; i < codonData.length; i++) {
                selectedCodonGroupIndices.add(i);
            }
        } else {
            selectedCodonGroupIndices.clear();
        }
        
        document.querySelectorAll('.codon-group-cell').forEach(cell => {
            const index = parseInt(cell.dataset.index);
            if (selectedCodonGroupIndices.has(index)) {
                cell.classList.add('selected-for-game');
            } else {
                cell.classList.remove('selected-for-game');
            }
        });
        updateSelectAllButtonState();
    });

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
        currentMode = 'setup';
        updateCodonTable();
        updateUI(currentMode);
    });

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

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 초기화: 페이지 로드 시 코돈표 생성 및 UI 설정
    currentMode = 'setup';
    updateCodonTable();
    updateUI(currentMode);
});
