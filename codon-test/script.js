document.addEventListener('DOMContentLoaded', () => {
    // 1. 코돈 데이터 정의
    // 각 배열 요소는 [코돈 배열, 아미노산 한글명, 아미노산 1글자 약어] 형태입니다.
    const codonData = [
        // UXX
        [['UUU', 'UUC'], '페닐알라닌', 'F'],
        [['UUA', 'UUG'], '류신', 'L'],
        [['UCU', 'UCC', 'UCA', 'UCG'], '세린', 'S'],
        [['UAU', 'UAC'], '티로신', 'Y'],
        [['UAA', 'UAG'], '종결', 'STOP'], // 종결 코돈
        [['UGU', 'UGC'], '시스테인', 'C'],
        [['UGA'], '종결', 'STOP'], // 종결 코돈
        [['UGG'], '트립토판', 'W'],

        // CXX
        [['CUU', 'CUC', 'CUA', 'CUG'], '류신', 'L'],
        [['CCU', 'CCC', 'CCA', 'CCG'], '프롤린', 'P'],
        [['CAU', 'CAC'], '히스티딘', 'H'],
        [['CAA', 'CAG'], '글루타민', 'Q'],
        [['CGU', 'CGC', 'CGA', 'CGG'], '아르기닌', 'R'],

        // AXX
        [['AUU', 'AUC', 'AUA'], '이소류신', 'I'],
        [['AUG'], '메티오닌', 'M'], // 시작 코돈
        [['ACU', 'ACC', 'ACA', 'ACG'], '트레오닌', 'T'],
        [['AAU', 'AAC'], '아스파라진', 'N'],
        [['AAA', 'AAG'], '리신', 'K'],
        [['AGU', 'AGC'], '세린', 'S'],
        [['AGA', 'AGG'], '아르기닌', 'R'],

        // GXX
        [['GUU', 'GUC', 'GUA', 'GUG'], '발린', 'V'],
        [['GCU', 'GCC', 'GCA', 'GCG'], '알라닌', 'A'],
        [['GAU', 'GAC'], '아스파르트산', 'D'],
        [['GAA', 'GAG'], '글루탐산', 'E'],
        [['GGU', 'GGC', 'GGA', 'GGG'], '글라이신', 'G']
    ];

    const codonTableContainer = document.getElementById('codon-table-container');
    const toggleCodonsBtn = document.getElementById('toggle-codons');
    const toggleAminoAcidsBtn = document.getElementById('toggle-amino-acids');
    const toggleAminoAcidDisplayModeBtn = document.getElementById('toggle-amino-acid-display-mode');

    let showCodons = true;
    let showAminoAcids = true;
    let aminoAcidDisplayMode = 0; // 0: 세린(S), 1: 세린, 2: S

    // 2. 코돈 데이터를 앞 두 글자 기준으로 그룹화
    // 이 부분은 실제 코돈표의 구조 (U, C, A, G 행/열)에 맞춰 수동으로 구성하는 것이 더 명확합니다.
    // 각 배열 요소는 [첫 번째 염기, 두 번째 염기, [해당 블록에 들어갈 codonData의 인덱스 배열]]
    const groupedCodonBlocks = [
        // U-행
        ['U', 'U', [0, 1]], // UUU/UUC(페닐알라닌), UUA/UUG(류신)
        ['U', 'C', [2]],    // UCU/UCC/UCA/UCG(세린)
        ['U', 'A', [3, 4]], // UAU/UAC(티로신), UAA/UAG(종결)
        ['U', 'G', [5, 6, 7]], // UGU/UGC(시스테인), UGA(종결), UGG(트립토판)

        // C-행
        ['C', 'U', [8]],    // CUU/CUC/CUA/CUG(류신)
        ['C', 'C', [9]],    // CCU/CCC/CCA/CCG(프롤린)
        ['C', 'A', [10, 11]], // CAU/CAC(히스티딘), CAA/CAG(글루타민)
        ['C', 'G', [12]],   // CGU/CGC/CGA/CGG(아르기닌)

        // A-행
        ['A', 'U', [13, 14]], // AUU/AUC/AUA(이소류신), AUG(메티오닌)
        ['A', 'C', [15]],   // ACU/ACC/ACA/ACG(트레오닌)
        ['A', 'A', [16, 17]], // AAU/AAC(아스파라진), AAA/AAG(리신)
        ['A', 'G', [18, 19]], // AGU/AGC(세린), AGA/AGG(아르기닌)

        // G-행
        ['G', 'U', [20]],   // GUU/GUC/GUA/GUG(발린)
        ['G', 'C', [21]],   // GCU/GCC/GCA/GCG(알라닌)
        ['G', 'A', [22, 23]], // GAU/GAC(아스파르트산), GAA/GAG(글루탐산)
        ['G', 'G', [24]]    // GGU/GGC/GGA/GGG(글라이신)
    ];


    // 3. 코돈표 동적 생성 및 업데이트 함수
    function updateCodonTable() {
        codonTableContainer.innerHTML = ''; // 기존 내용 지우기

        // 4x4 그리드에 맞춰 블록들을 배치
        const firstBases = ['U', 'C', 'A', 'G'];
        const secondBases = ['U', 'C', 'A', 'G'];

        for (let i = 0; i < firstBases.length; i++) {
            for (let j = 0; j < secondBases.length; j++) {
                const currentFirstBase = firstBases[i];
                const currentSecondBase = secondBases[j];

                // 해당 (첫 번째, 두 번째) 염기 쌍에 해당하는 블록 찾기
                const blockInfo = groupedCodonBlocks.find(block =>
                    block[0] === currentFirstBase && block[1] === currentSecondBase
                );

                const codonBlock = document.createElement('div');
                codonBlock.classList.add('codon-block');

                if (blockInfo) {
                    blockInfo[2].forEach(dataIndex => { // 해당 블록에 속하는 codonData 인덱스 순회
                        const group = codonData[dataIndex];
                        const [codons, aminoAcidName, aminoAcidAbbr] = group;

                        const cell = document.createElement('div');
                        cell.classList.add('codon-group-cell');

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
                        if (aminoAcidDisplayMode === 0) { // 세린(S)
                            displayText = `${aminoAcidName}(${aminoAcidAbbr})`;
                        } else if (aminoAcidDisplayMode === 1) { // 세린
                            displayText = aminoAcidName;
                        } else { // S
                            displayText = aminoAcidAbbr;
                        }
                        aminoAcidDiv.textContent = displayText;
                        cell.appendChild(aminoAcidDiv);

                        // 가시성 클래스 적용
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
                } else {
                    // 해당 염기 쌍에 데이터가 없는 경우 빈 셀 처리 (필요에 따라)
                    // 예를 들어, 실제 코돈표에서는 모든 4x4 칸이 채워지므로 이 else 블록은 거의 실행되지 않습니다.
                    // 만약 특정 칸이 비어있다면, 여기에 빈 div 등을 추가할 수 있습니다.
                }
                codonTableContainer.appendChild(codonBlock);
            }
        }
    }

    // 5. 토글 버튼 기능 구현 (이전과 동일)

    // 5-1. 코돈 가시성 토글 버튼
    toggleCodonsBtn.addEventListener('click', () => {
        showCodons = !showCodons;
        toggleCodonsBtn.textContent = showCodons ? '코돈 숨기기' : '코돈 보이기';
        toggleCodonsBtn.classList.toggle('active', !showCodons);
        updateCodonTable();
    });

    // 5-2. 아미노산 가시성 토글 버튼
    toggleAminoAcidsBtn.addEventListener('click', () => {
        showAminoAcids = !showAminoAcids;
        toggleAminoAcidsBtn.textContent = showAminoAcids ? '아미노산 숨기기' : '아미노산 보이기';
        toggleAminoAcidsBtn.classList.toggle('active', !showAminoAcids);
        updateCodonTable();
    });

    // 5-3. 아미노산 표시 모드 토글 버튼
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

    // 페이지 로드 시 초기 코돈표 생성
    updateCodonTable();
});
