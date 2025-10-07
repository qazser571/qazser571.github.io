document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const intervalInput = document.getElementById('interval-input'); // 숫자 'a' 입력 필드
    const allClearButton = document.getElementById('all-clear-button');
    const exportJsonButton = document.getElementById('export-json-button');
    const importJsonButton = document.getElementById('import-json-button');
    const importFileInput = document.getElementById('import-file-input');
    const downloadTxtButton = document.getElementById('download-txt-button');
    const divCountDisplay = document.getElementById('div-count-display');

    const STORAGE_KEY = 'englishWords';

    let wordsData = []; // 전역으로 관리될 단어 데이터

    // 현재 생성된 div의 개수를 표시하는 함수
    function updateDivCountDisplay() {
        const count = inputArea.querySelectorAll('.entry-wrapper').length; // 실제 입력 가능한 박스만 카운트
        divCountDisplay.textContent = `총 ${count}개`;
    }

    // 로컬 스토리지 단어 목록 저장 함수 (DIV 개수 업데이트 포함)
    // 이제 내용이 비어있어도 모든 entry-wrapper를 저장합니다.
    function saveWordsToLocalStorage() {
        wordsData = [];
        const entryWrappers = inputArea.querySelectorAll('.entry-wrapper');
        entryWrappers.forEach(wrapper => {
            const inputBox = wrapper.querySelector('.input-box');
            if (!inputBox) return;

            const id = inputBox.dataset.id;
            const word = inputBox.querySelector('.word-input').value.trim();
            const meaning = inputBox.querySelector('.meaning-input').value.trim();
            
            // ID가 유효하면 단어 또는 의미가 비어있더라도 저장합니다.
            if (id) { 
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
        updateDivCountDisplay(); // 저장 후 개수 업데이트
    }

    // 로컬 스토리지 단어 목록 로드 함수
    function loadWordsFromLocalStorage() {
        const storedWords = localStorage.getItem(STORAGE_KEY);
        let loadedWords = [];

        if (storedWords) {
            try {
                const parsedWords = JSON.parse(storedWords);
                if (Array.isArray(parsedWords)) {
                    loadedWords = parsedWords;
                }
            } catch (e) {
                console.error("Error parsing stored data from local storage:", e);
                localStorage.removeItem(STORAGE_KEY); // 파싱 에러시 데이터 삭제
            }
        }
        
        // 최소 5개 보장 로직
        if (loadedWords.length < 5) {
            const numToAdd = 5 - loadedWords.length;
            for (let i = 0; i < numToAdd; i++) {
                // ID는 유니크하게 생성하고, 내용은 비어있는 상태로 추가
                loadedWords.push({ id: Date.now().toString() + `-init-${i}`, word: '', meaning: '' });
            }
        }
        
        renderAllItems(loadedWords); // 모든 아이템을 렌더링 (구분선 포함)
        saveWordsToLocalStorage(); // 최종적으로 표시된 내용으로 로컬 스토리지 업데이트
    }

    // .separator-div를 생성하는 함수 (a*n 값 계산하여 표시)
    function createSeparatorDiv(itemIndex, intervalValue) {
        const separator = document.createElement('div');
        separator.className = 'separator-div';
        const calculatedValue = intervalValue * Math.floor((itemIndex -1) / intervalValue + 1); // 1번째부터 시작해서 1a, 2a
        separator.textContent = `--- ${calculatedValue} ---`;
        return separator;
    }

    // 모든 input-box와 separator-div를 다시 그리는 함수 (a 값 변경, 로드 시 호출)
    // focusElementId를 인자로 받아 해당 요소에 focus를 줄 수 있도록 수정
    function renderAllItems(dataToRender, focusElementId = null) {
        inputArea.innerHTML = ''; // 기존 내용 모두 제거
        const interval = parseInt(intervalInput.value) || 1; // 'a' 값 가져오기, 기본값 1

        let focusedElement = null; // 포커스를 줄 요소 저장

        dataToRender.forEach((wordObj, index) => {
            const { entryWrapper, wordInput } = createInputBox(wordObj.id, wordObj.word, wordObj.meaning, false);
            inputArea.appendChild(entryWrapper);

            // focusElementId가 현재 wordObj의 id와 일치하면 포커스할 요소로 저장
            if (focusElementId && wordObj.id === focusElementId) {
                focusedElement = wordInput;
            }

            // a*n 번째 뒤에 구분선 삽입 (index는 0부터 시작하므로 index+1 사용)
            if ((index + 1) % interval === 0 && index !== dataToRender.length - 1) { // 마지막 항목 뒤에는 넣지 않음
                const separator = createSeparatorDiv(index + 1, interval);
                inputArea.appendChild(separator);
            }
        });
        updateDivCountDisplay(); // 모든 렌더링 완료 후 개수 업데이트

        if (focusedElement) {
            focusedElement.focus(); // 특정 요소에 포커스
        }
    }


    // Input Box를 포함하는 entry-wrapper를 생성하는 함수
    function createInputBox(id = Date.now().toString(), initialWord = '', initialMeaning = '', autoUpdateCount = true) {
        const entryWrapper = document.createElement('div');
        entryWrapper.className = 'entry-wrapper';

        const insertBoxButton = document.createElement('button');
        insertBoxButton.className = 'insert-box-button';
        insertBoxButton.textContent = '+';
        insertBoxButton.tabIndex = -1; // 탭 순서에서 제외
        insertBoxButton.style.width = '45px'; // CSS에서 고정된 height에 맞춰 width 설정
        insertBoxButton.style.height = '45px';
        
        const inputBox = document.createElement('div');
        inputBox.className = 'input-box';
        inputBox.dataset.id = id;

        const wordInput = document.createElement('input');
        wordInput.type = 'text';
        wordInput.className = 'word-input';
        wordInput.placeholder = '영단어를 입력하세요';
        wordInput.value = initialWord; // 비어있는 단어는 그대로 비어있게 표시

        const meaningInput = document.createElement('input');
        meaningInput.type = 'text';
        meaningInput.className = 'meaning-input';
        meaningInput.placeholder = '의미를 입력하세요';
        meaningInput.value = initialMeaning; // 비어있는 의미는 그대로 비어있게 표시

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'x';
        deleteButton.tabIndex = -1; // 삭제 버튼은 탭 순서에서 제외

        inputBox.appendChild(wordInput);
        inputBox.appendChild(meaningInput);
        inputBox.appendChild(deleteButton);
        
        entryWrapper.appendChild(insertBoxButton);
        entryWrapper.appendChild(inputBox);

        // input 필드 내용 변경 시 로컬 스토리지에 저장 (DOM 개수 변화 없음)
        wordInput.addEventListener('input', saveWordsDataOnly);
        meaningInput.addEventListener('input', saveWordsDataOnly);
        
        // --- 이벤트 리스너: 개별 '+' 버튼 ---
        insertBoxButton.addEventListener('click', () => {
            const newId = Date.now().toString();
            const currentEntryWrappers = Array.from(inputArea.querySelectorAll('.entry-wrapper'));
            const insertIndex = currentEntryWrappers.indexOf(entryWrapper) + 1; // 현재 박스 바로 다음

            // 현재 wordsData를 기반으로 새로운 데이터 배열 생성
            const tempWords = currentEntryWrappers.map(wrapper => ({
                id: wrapper.querySelector('.input-box').dataset.id,
                word: wrapper.querySelector('.input-box .word-input').value.trim(),
                meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
            }));
            tempWords.splice(insertIndex, 0, { id: newId, word: '', meaning: '' }); // 새 항목 삽입 (내용 비어있음)

            renderAllItems(tempWords, newId); // 새 항목에 포커스하도록 요청
            saveWordsToLocalStorage(); // 변경 사항 로컬 스토리지에 저장 (DOM 상태 반영)
        });


        // --- 이벤트 리스너: 개별 삭제 버튼 ---
        deleteButton.addEventListener('click', (e) => {
            if (e.target.textContent === 'x') {
                e.target.textContent = '삭제';
                e.target.classList.add('confirm-delete');
            } else if (e.target.textContent === '삭제') {
                const currentEntryWrappers = Array.from(inputArea.querySelectorAll('.entry-wrapper'));
                const removeIndex = currentEntryWrappers.indexOf(entryWrapper);
                
                let tempWords = currentEntryWrappers.map(wrapper => ({
                    id: wrapper.querySelector('.input-box').dataset.id,
                    word: wrapper.querySelector('.input-box .word-input').value.trim(),
                    meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
                }));
                tempWords.splice(removeIndex, 1); // 해당 항목 제거

                // 삭제 후에도 최소 5개의 input-box가 있도록 조정
                if (tempWords.length < 5) {
                     tempWords.push({ id: Date.now().toString(), word: '', meaning: '' }); // 빈 박스 추가
                }
                
                // 삭제 후 포커스될 대상 ID (삭제된 박스 이전 박스 또는 첫 번째 박스)
                const focusTargetId = tempWords.length > 0 ? tempWords[Math.max(0, removeIndex - 1)].id : null;
                renderAllItems(tempWords, focusTargetId);
                saveWordsToLocalStorage(); // 삭제 후 로컬 스토리지 업데이트
            }
        });
        
        // '삭제' 상태에서 다른 곳을 클릭하거나 포커스를 잃으면 다시 'x'로 돌아오도록
        const resetDeleteButtonState = () => {
            if (deleteButton.textContent === '삭제') {
                deleteButton.textContent = 'x';
                deleteButton.classList.remove('confirm-delete');
            }
        };
        document.addEventListener('click', (e) => {
            if (e.target !== deleteButton && !deleteButton.contains(e.target)) {
                resetDeleteButtonState();
            }
        });
        meaningInput.addEventListener('focusout', resetDeleteButtonState);
        wordInput.addEventListener('focusout', resetDeleteButtonState);
        deleteButton.addEventListener('focusout', resetDeleteButtonState);

        return { entryWrapper, wordInput, meaningInput }; // entryWrapper 반환
    }
    
    // 로컬 스토리지 단어 데이터만 저장하는 함수 (DOM 개수 변동 없을 때)
    // 이제 내용이 비어있어도 모든 entry-wrapper를 저장합니다.
    function saveWordsDataOnly() {
        wordsData = [];
        const entryWrappers = inputArea.querySelectorAll('.entry-wrapper');
        entryWrappers.forEach(wrapper => {
            const inputBox = wrapper.querySelector('.input-box');
            if (!inputBox) return;

            const id = inputBox.dataset.id;
            const word = inputBox.querySelector('.word-input').value.trim();
            const meaning = inputBox.querySelector('.meaning-input').value.trim();
            // ID가 유효하면 단어 또는 의미가 비어있더라도 저장합니다.
            if (id) { 
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
    }


    // --- 초기화 ---
    loadWordsFromLocalStorage(); // 초기 로드

    // 페이지 로드 후, 가장 첫 번째 input-box의 단어 입력 필드에 포커스
    const firstWordInput = inputArea.querySelector('.input-box .word-input');
    if (firstWordInput) {
        firstWordInput.focus();
    }

    // --- 이벤트 리스너: 'a' 값 변경 시 ---
    intervalInput.addEventListener('input', () => {
        const currentWordsInDom = Array.from(inputArea.querySelectorAll('.entry-wrapper')).map(wrapper => {
            const box = wrapper.querySelector('.input-box');
            return {
                id: box.dataset.id,
                word: box.querySelector('.input-box .word-input').value.trim(),
                meaning: box.querySelector('.input-box .meaning-input').value.trim()
            };
        });
        renderAllItems(currentWordsInDom);
    });


    // --- 이벤트 리스너: 'Enter' 또는 'Tab' 키 입력 시 ---
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        
        const isMeaningInput = activeElement && activeElement.tagName === 'INPUT' && activeElement.classList.contains('meaning-input');

        if (isMeaningInput) {
            const currentEntryWrapper = activeElement.closest('.entry-wrapper');
            const allEntryWrappers = Array.from(inputArea.querySelectorAll('.entry-wrapper'));
            const currentIndex = allEntryWrappers.indexOf(currentEntryWrapper);
            const isLastEntryWrapper = currentIndex === allEntryWrappers.length - 1;

            if (event.key === 'Enter') {
                if (isLastEntryWrapper) {
                    event.preventDefault();
                    const newId = Date.now().toString();
                    const tempWords = allEntryWrappers.map(wrapper => ({
                        id: wrapper.querySelector('.input-box').dataset.id,
                        word: wrapper.querySelector('.input-box .word-input').value.trim(),
                        meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
                    }));
                    tempWords.push({ id: newId, word: '', meaning: '' }); // 내용 비어있는 새 박스 추가
                    
                    renderAllItems(tempWords, newId); // 새 항목에 포커스하도록 요청
                    saveWordsToLocalStorage(); 
                }
            } else if (event.key === 'Tab' && !event.shiftKey) { // Tab (Shift+Tab은 반대 방향이므로 제외)
                event.preventDefault(); // Tab 키의 기본 동작 (다음 요소로 포커스 이동) 방지

                if (isLastEntryWrapper) {
                    const newId = Date.now().toString();
                    const tempWords = allEntryWrappers.map(wrapper => ({
                        id: wrapper.querySelector('.input-box').dataset.id,
                        word: wrapper.querySelector('.input-box .word-input').value.trim(),
                        meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
                    }));
                    tempWords.push({ id: newId, word: '', meaning: '' }); // 내용 비어있는 새 박스 추가

                    renderAllItems(tempWords, newId); // 새 항목에 포커스하도록 요청
                    saveWordsToLocalStorage(); 
                } else {
                    // 마지막이 아니면 다음 entry-wrapper의 word-input으로 포커스 이동
                    const nextEntryWrapper = allEntryWrappers[currentIndex + 1];
                    if (nextEntryWrapper) {
                        const nextWordInput = nextEntryWrapper.querySelector('.word-input');
                        if (nextWordInput) {
                            nextWordInput.focus();
                        }
                    }
                }
            }
        }
    });
    
    // --- 이벤트 리스너: '전부삭제' 버튼 ---
    allClearButton.addEventListener('click', () => {
        const confirmClear = confirm('정말 모든 단어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
        if (confirmClear) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });

    // --- 이벤트 리스너: '데이터 내보내기' 버튼 ---
    exportJsonButton.addEventListener('click', () => {
        saveWordsToLocalStorage(); // 최신 상태를 로컬 스토리지에 먼저 저장하여 최신 데이터로 내보내기
        const dataToExport = localStorage.getItem(STORAGE_KEY);

        if (!dataToExport || dataToExport === '[]') { // 데이터가 없거나 비어있는 배열인 경우
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const blob = new Blob([dataToExport], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `word_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- 이벤트 리스너: '데이터 가져오기' 버튼 ---
    importJsonButton.addEventListener('click', () => {
        importFileInput.click();
    });

    // --- 이벤트 리스너: 파일 선택 시 데이터 불러오기 ---
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        if (file.type !== 'application/json') {
            alert('JSON 파일만 가져올 수 있습니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                const isValidData = Array.isArray(importedData) && importedData.every(item => 
                    typeof item === 'object' && 'id' in item && 'word' in item && 'meaning' in item
                );

                if (!isValidData) {
                    alert('가져온 파일의 형식이 올바르지 않습니다.');
                    return;
                }

                inputArea.innerHTML = ''; // 현재 화면의 모든 input-box 제거 
                wordsData = importedData; // 전역 wordsData 업데이트
                localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData)); // 로컬 스토리지 업데이트

                // 가져온 데이터가 5개 미만이면, 5개가 될 때까지 빈 div를 추가 생성
                if (wordsData.length < 5) {
                    const numToAdd = 5 - wordsData.length;
                    for (let i = 0; i < numToAdd; i++) {
                        // 내용은 비어있는 상태로 추가
                        wordsData.push({ id: Date.now().toString() + `-import-init-${i}`, word: '', meaning: '' });
                    }
                }

                renderAllItems(wordsData); // 모든 아이템을 다시 렌더링 (구분선 포함)
                
                // 첫 번째 입력 필드에 포커스
                const newFirstInput = inputArea.querySelector('.input-box .word-input');
                if (newFirstInput) {
                    newFirstInput.focus();
                }

                alert('데이터를 성공적으로 가져왔습니다!');
                updateDivCountDisplay(); // 모든 Import 및 추가 작업이 끝난 후 한 번만 개수 업데이트

            } catch (error) {
                alert('파일을 읽거나 파싱하는 중 오류가 발생했습니다: ' + error.message);
                console.error("Import error:", error);
            }
            event.target.value = ''; 
        };
        reader.readAsText(file);
    });

    // --- 이벤트 리스너: 'TXT로 다운로드' 버튼 ---
    downloadTxtButton.addEventListener('click', () => {
        let content = '';
        saveWordsToLocalStorage(); // 최신 상태를 로컬 스토리지에 저장 후 content 생성
        const currentWords = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const interval = parseInt(intervalInput.value) || 1; // 'a' 값 가져오기

        currentWords.forEach((data, index) => {
            // 영단어 또는 의미가 없으면 공백으로 처리
            const word = data.word || '';
            const meaning = data.meaning || '';
            content += `${word} ${meaning}\n`; // 항상 한 줄 추가 (공백이더라도)
            
            // a*n 번째 뒤에 구분선 추가 (마지막 줄은 제외)
            if ((index + 1) % interval === 0 && index !== currentWords.length - 1) {
                content += '------------------------------\n'; // 구분선
            }
        });

        // 다운로드할 내용이 완전히 없는 경우에만 경고
        if (currentWords.length === 0 || (currentWords.length === 1 && !currentWords[0].word && !currentWords[0].meaning && content.trim() === '')) {
             alert('다운로드할 영단어가 없습니다. 단어를 입력해 주세요.');
             return;
        }


        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `english_words_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
