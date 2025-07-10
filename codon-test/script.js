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

    // 2. 코돈표 동적 생성 및 업데이트 함수
    function updateCodonTable() {
        codonTableContainer.innerHTML = ''; // 기존 내용 지우기

        codonData.forEach(group => {
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

            codonTableContainer.appendChild(cell);
        });
    }

    // 3. 토글 버튼 기능 구현

    // 3-1. 코돈 가시성 토글 버튼
    toggleCodonsBtn.addEventListener('click', () => {
        showCodons = !showCodons;
        toggleCodonsBtn.textContent = showCodons ? '코돈 숨기기' : '코돈 보이기';
        toggleCodonsBtn.classList.toggle('active', !showCodons); // 숨김 상태일 때 활성화 색상
        updateCodonTable();
    });

    // 3-2. 아미노산 가시성 토글 버튼
    toggleAminoAcidsBtn.addEventListener('click', () => {
        showAminoAcids = !showAminoAcids;
        toggleAminoAcidsBtn.textContent = showAminoAcids ? '아미노산 숨기기' : '아미노산 보이기';
        toggleAminoAcidsBtn.classList.toggle('active', !showAminoAcids); // 숨김 상태일 때 활성화 색상
        updateCodonTable();
    });

    // 3-3. 아미노산 표시 모드 토글 버튼
    toggleAminoAcidDisplayModeBtn.addEventListener('click', () => {
        aminoAcidDisplayMode = (aminoAcidDisplayMode + 1) % 3; // 0 -> 1 -> 2 -> 0 순환
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
