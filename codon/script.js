document.addEventListener('DOMContentLoaded', () => {
    // 1. 코돈 데이터 정의
    const codonData = [
        [['UUU', 'UUC'], '페닐알라닌', 'F'],
        [['UUA', 'UUG'], '류신', 'L'],
        [['UCU', 'UCC', 'UCA', 'UCG'], '세린', 'S'],
        [['UAU', 'UAC'], '타이로신', 'Y'],
        [['UAA', 'UAG'], '종결코돈', 'STOP'],
        [['UGU', 'UGC'], '시스테인', 'C'],
        [['UGA'], '종결코돈', 'STOP'],
        [['UGG'], '트립토판', 'W'],

        [['CUU', 'CUC', 'CUA', 'CUG'], '류신', 'L'],
        [['CCU', 'CCC', 'CCA', 'CCG'], '프롤린', 'P'],
        [['CAU', 'CAC'], '히스티딘', 'H'],
        [['CAA', 'CAG'], '글루타민', 'Q'],
        [['CGU', 'CGC', 'CGA', 'CGG'], '아르지닌', 'R'],

        [['AUU', 'AUC', 'AUA'], '아이소류신', 'I'],
        [['AUG'], '메싸이오닌', 'M'],
        [['ACU', 'ACC', 'ACA', 'ACG'], '트레오닌', 'T'],
        [['AAU', 'AAC'], '아스파라진', 'N'],
        [['AAA', 'AAG'], '라이신', 'K'], 
        [['AGU', 'AGC'], '세린', 'S'],
        [['AGA', 'AGG'], '아르지닌', 'R'],

        [['GUU', 'GUC', 'GUA', 'GUG'], '발린', 'V'],
        [['GCU', 'GCC', 'GCA', 'GCG'], '알라닌', 'A'],
        [['GAU', 'GAC'], '아스파트산', 'D'],
        [['GAA', 'GAG'], '글루탐산', 'E'],
        [['GGU', 'GGC', 'GGA', 'GGG'], '글리신', 'G']
    ];

    // 코돈 데이터를 앞 두 글자 기준으로 그룹화
    const groupedCodonBlocks = [
        ['U', 'U', [0, 1]], ['U', 'C', [2]], ['U', 'A', [3, 4]], ['U', 'G', [5, 6, 7]],
        ['C', 'U', [8]], ['C', 'C', [9]], ['C', 'A', [10, 11]], ['C', 'G', [12]],
        ['A', 'U', [13, 14]], ['A', 'C', [15]], ['A', 'A', [16, 17]], ['A', 'G', [18, 19]],
        ['G', 'U', [20]], ['G', 'C', [21]], ['G', 'A', [22, 23]], ['G', 'G', [24]]
    ];

    // 2. DOM 요소 참조 (일부만 가져옴, 전체 게임 로직은 포함하지 않음)
    const codonTableArea = document.getElementById('codon-table-area'); // 변경된 ID
    const quizMode1Btn = document.getElementById('quiz-mode1-btn');
    const quizMode2Btn = document.getElementById('quiz-mode2-btn');
    const quizSelectAllBtn = document.getElementById('quiz-select-all-btn');
    const quizStartBtn = document.getElementById('quiz-start-btn');
    const currentQuestionDisplay = document.getElementById('current-question');
    const nextBtn = document.getElementById('next-btn');
    const hideCodonBtn = document.getElementById('hide-codon-btn');
    const hideAminoBtn = document.getElementById('hide-amino-btn');
    const aminoModeBtn = document.getElementById('amino-mode-btn');

    // #quiz-report-area 요소 참조
    const quizReportArea = document.getElementById('quiz-report-area');
    // control-area 내의 모든 .control-area-title 요소 참조
    const controlAreaTitles = document.querySelectorAll('#control-area .control-area-title');


    // 3. 게임 상태 변수 (코돈표 생성 및 가시성 관련만 포함)
    let showCodons = true;
    let showAminoAcids = true;
    let aminoAcidDisplayMode = 0; // 0: 풀네임(약어), 1: 풀네임, 2: 약어
    let currentPhase = 'setup'; // UI 업데이트를 위한 임시 변수

    // 4. UI 상태 관리 함수 (코돈표 관련 부분만 포함)
    function updateUI(phase) {
        // 실제 게임 로직의 updateUI 함수가 아니므로, 코돈표 생성에 필요한 부분만 임시로 구현
        // 여기서는 .codon-group-cell에 이벤트 리스너를 붙이지 않습니다.
        // 유저의 전체 게임 로직에 따라 추후 이 함수가 완성될 것입니다.
        currentPhase = phase; 
        // console.log(`UI Phase updated to: ${currentPhase}`);
    }

    // 5. 코돈표 동적 생성 및 업데이트 함수
    function updateCodonTable() {
        codonTableArea.innerHTML = ''; // 기존 테이블 내용 삭제
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
                codonTableArea.appendChild(codonBlock); // 먼저 DOM에 추가하여 offsetHeight를 얻을 수 있도록 함

                if (blockInfo) {
                    const actualCodonBlockHeight = codonBlock.offsetHeight; // 150px

                    // 해당 codonBlock에 속한 모든 아미노산 그룹의 총 코돈 개수를 계산
                    let totalCodonsInThisBlock = 0;
                    blockInfo[2].forEach(dataIndex => {
                        totalCodonsInThisBlock += codonData[dataIndex][0].length;
                    });

                    // 총 코돈 개수가 0인 경우는 예외 처리 (데이터 오류 방지)
                    if (totalCodonsInThisBlock === 0) {
                        console.warn(`Warning: totalCodonsInThisBlock is 0 for block ${currentFirstBase}${currentSecondBase}`);
                        continue; // 해당 블록은 건너뜀
                    }

                    blockInfo[2].forEach(dataIndex => {
                        const group = codonData[dataIndex];
                        const [codons, aminoAcidName, aminoAcidAbbr] = group;
                        const numCodonsInGroup = codons.length; // 현재 아미노산이 가지는 코돈 개수

                        const cell = document.createElement('div');
                        cell.classList.add('codon-group-cell');
                        cell.dataset.index = dataIndex;

                        // 코돈 개수에 비례하여 cell의 높이 설정
                        const proportionalHeight = (numCodonsInGroup / totalCodonsInThisBlock) * actualCodonBlockHeight;
                        cell.style.height = `${proportionalHeight}px`;


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
                        // 종결코돈 예외 처리
                        if (aminoAcidName === '종결코돈') {
                            displayText = '종결코돈'; // 항상 "종결코돈"으로 표기
                        } else {
                            if (aminoAcidDisplayMode === 0) { // 표시 모드 : 1
                                displayText = `${aminoAcidName}(${aminoAcidAbbr})`;
                            } else if (aminoAcidDisplayMode === 1) { // 표시 모드 : 2
                                displayText = aminoAcidName;
                            } else { // 표시 모드 : 3
                                displayText = aminoAcidAbbr;
                            }
                        }
                        aminoAcidDiv.textContent = displayText;
                        cell.appendChild(aminoAcidDiv);

                        // 숨기기 클래스 적용 (새로 생성할 때도 적용)
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
            }
        }
        // 코돈표 업데이트 후 UI 상태를 재부착 (이벤트 리스너 등)
        updateUI(currentPhase); 
        // 코돈표가 재생성된 후 현재 게임 상태의 시각적 피드백을 다시 적용 (지금은 빈 함수)
        reapplyCurrentQuestionState();
    }

    // 코돈/아미노산 셀의 가시성만 업데이트하는 함수
    function updateCodonCellVisibility() {
        document.querySelectorAll('.codon-group-cell').forEach(cell => {
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
        });
        reapplyCurrentQuestionState(); // 가시성 변경 후에도 현재 상태를 다시 적용 (지금은 빈 함수)
    }

    // 현재 게임 상태의 하이라이트 및 버튼 가시성을 다시 적용하는 함수 (지금은 빈 함수)
    function reapplyCurrentQuestionState() {
        // 이 함수는 게임 로직과 관련이 깊으므로, 현재는 비워둡니다.
        // 유저의 전체 게임 로직에 따라 추후 이 함수가 완성될 것입니다.
    }

    // 표시 모드 버튼 텍스트를 업데이트하는 함수
    function updateAminoAcidDisplayModeButtonText() {
        let buttonText = '';
        if (aminoAcidDisplayMode === 0) {
            buttonText = '메싸이오닌(M)'; // 기준 코드의 버튼 텍스트를 따름
        } else if (aminoAcidDisplayMode === 1) {
            buttonText = '메싸이오닌';
        } else { // aminoAcidDisplayMode === 2
            buttonText = 'M';
        }
        aminoModeBtn.textContent = buttonText;
    }

    // 7. 이벤트 핸들러 (코돈표 관련 버튼만 연결)
    hideCodonBtn.addEventListener('click', () => {
        showCodons = !showCodons;
        hideCodonBtn.classList.toggle('active', !showCodons); // active 클래스 토글
        updateCodonCellVisibility();
    });

    hideAminoBtn.addEventListener('click', () => {
        showAminoAcids = !showAminoAcids;
        hideAminoBtn.classList.toggle('active', !showAminoAcids); // active 클래스 토글
        updateCodonCellVisibility();
    });

    aminoModeBtn.addEventListener('click', () => {
        aminoAcidDisplayMode = (aminoAcidDisplayMode + 1) % 3;
        updateAminoAcidDisplayModeButtonText();
        updateCodonTable(); // 표시 모드 변경 시 코돈표 재생성
    });

    // 초기화: 페이지 로드 시 코돈표 생성 및 UI 설정
    // #quiz-report-area를 초기 숨김 처리 (CSS로 이미 처리되었지만 JS에서도 명시적으로 제어 가능)
    // quizReportArea.style.display = 'none'; // CSS에서 처리했으므로 주석 처리

    // 표기모드 버튼에 .btn-active 클래스 추가
    aminoModeBtn.classList.add('btn-active');

    // control-area 내의 모든 .control-area-title에 .control-area-title-active 클래스 추가하여 효과 활성화
    controlAreaTitles.forEach(title => {
        title.classList.add('control-area-title-active');
    });

    updateAminoAcidDisplayModeButtonText();
    updateCodonTable();
    updateUI('setup'); // 초기 UI를 'setup' 상태로 설정
});
