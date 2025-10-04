document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const addBoxButton = document.getElementById('add-box-button');
    const completeButton = document.getElementById('complete-button');

    // #input-box를 생성하는 함수
    function createInputBox() {
        const inputBox = document.createElement('div');
        inputBox.className = 'input-box';

        const wordInput = document.createElement('input');
        wordInput.type = 'text';
        wordInput.className = 'word-input';
        wordInput.placeholder = '영단어를 입력하세요';

        const meaningInput = document.createElement('input');
        meaningInput.type = 'text';
        meaningInput.className = 'meaning-input';
        meaningInput.placeholder = '의미를 입력하세요';

        inputBox.appendChild(wordInput);
        inputBox.appendChild(meaningInput);
        inputArea.appendChild(inputBox);

        // 이전: 새롭게 추가된 input-box의 첫 번째 입력 필드에 포커스 (Enter 키, + 버튼으로 추가될 때)
        // wordInput.focus(); // 이 부분은 이제 Enter 키와 + 버튼으로 생성될 때만 유용하도록 직접 호출합니다.

        return { inputBox, wordInput, meaningInput }; // 생성된 요소들을 객체 형태로 반환
    }

    // 1. 웹 페이지 로드 시 초기 5개의 input-box 생성 및 첫 번째 박스 포커스 설정
    const initialInputBoxes = []; // 초기 생성된 박스들을 저장할 배열
    for (let i = 0; i < 5; i++) {
        const { inputBox, wordInput, meaningInput } = createInputBox();
        initialInputBoxes.push({ inputBox, wordInput, meaningInput });
    }

    // 페이지 로드 후, 가장 첫 번째 input-box의 단어 입력 필드에 포커스
    if (initialInputBoxes.length > 0) {
        initialInputBoxes[0].wordInput.focus();
    }


    // 2. '+' 버튼 클릭 시 input-box 추가
    addBoxButton.addEventListener('click', () => {
        const { wordInput } = createInputBox(); // 새로운 박스 생성 및 wordInput 반환받음
        wordInput.focus(); // 새로 생성된 박스의 단어 입력 필드에 포커스
    });

    // 3. 'Enter' 키 입력 시 input-box 추가 조건 수정
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const activeElement = document.activeElement; // 현재 포커스된 요소

            // 현재 포커스된 요소가 'INPUT' 태그이고, 'meaning-input' 클래스를 가지는지 확인
            if (activeElement && activeElement.tagName === 'INPUT' && activeElement.classList.contains('meaning-input')) {
                const currentInputBox = activeElement.closest('.input-box'); // 현재 input이 속한 input-box
                const allInputBoxes = inputArea.querySelectorAll('.input-box'); // 모든 input-box 요소들

                // 현재 input-box가 전체 input-box 중 가장 마지막 요소인지 확인
                if (currentInputBox === allInputBoxes[allInputBoxes.length - 1]) {
                    event.preventDefault(); // 기본 Enter 동작 (예: 줄바꿈, 폼 제출) 방지
                    const { wordInput } = createInputBox(); // 새로운 박스 생성 및 wordInput 반환받음
                    wordInput.focus(); // 새로 생성된 박스의 단어 입력 필드에 포커스
                }
            }
        }
    });

    // 4. '완료' 버튼 클릭 시 영단어들을 TXT 파일로 다운로드
    completeButton.addEventListener('click', () => {
        let content = '';
        const inputBoxes = inputArea.querySelectorAll('.input-box');

        inputBoxes.forEach(box => {
            const word = box.querySelector('.word-input').value.trim();
            const meaning = box.querySelector('.meaning-input').value.trim();

            if (word && meaning) { // 영단어와 의미가 모두 입력된 경우에만 추가
                content += `${word} ${meaning}\n`;
            }
        });

        if (content === '') {
            alert('다운로드할 영단어가 없습니다. 단어를 입력해 주세요.');
            return;
        }

        // Blob 객체 생성 및 다운로드
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'english_words.txt'; // 파일명
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // 메모리 해제
    });
});
