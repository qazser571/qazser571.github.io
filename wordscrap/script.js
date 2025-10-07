document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const intervalInput = document.getElementById('interval-input');
    const allClearButton = document.getElementById('all-clear-button');
    const exportJsonButton = document.getElementById('export-json-button');
    const importJsonButton = document.getElementById('import-json-button');
    const importFileInput = document.getElementById('import-file-input');
    const downloadTxtButton = document.getElementById('download-txt-button');
    const divCountDisplay = document.getElementById('div-count-display');

    const STORAGE_KEY = 'englishWords';

    let wordsData = [];

    function updateDivCountDisplay() {
        const count = inputArea.querySelectorAll('.entry-wrapper').length;
        divCountDisplay.textContent = `총 ${count}개`;
    }

    // 중복 단어 하이라이트 기능
    function highlightDuplicateWords() {
        const allWordInputs = inputArea.querySelectorAll('.word-input');
        const wordCounts = {}; // 각 단어의 출현 횟수를 저장
        const duplicateWords = new Set(); // 중복되는 단어들을 저장

        // 1단계: 모든 단어의 출현 횟수 계산
        allWordInputs.forEach(input => {
            const word = input.value.trim().toLowerCase(); // 대소문자 구분 없이 비교
            if (word) { // 빈 단어는 중복으로 처리하지 않음
                wordCounts[word] = (wordCounts[word] || 0) + 1;
                if (wordCounts[word] > 1) {
                    duplicateWords.add(word);
                }
            }
        });

        // 2단계: 중복되는 단어에 해당하는 .input-box에 클래스 추가/제거
        allWordInputs.forEach(input => {
            const word = input.value.trim().toLowerCase();
            const inputBox = input.closest('.input-box'); // .word-input의 부모인 .input-box를 찾음

            if (inputBox) {
                if (duplicateWords.has(word)) {
                    inputBox.classList.add('highlight-duplicate');
                } else {
                    inputBox.classList.remove('highlight-duplicate');
                }
            }
        });
    }

    // 로컬 스토리지 단어 목록 저장 함수 (DIV 개수 및 중복 하이라이트 업데이트 포함)
    function saveWordsToLocalStorage() {
        wordsData = [];
        const entryWrappers = inputArea.querySelectorAll('.entry-wrapper');
        entryWrappers.forEach(wrapper => {
            const inputBox = wrapper.querySelector('.input-box');
            if (!inputBox) return;

            const id = inputBox.dataset.id;
            const word = inputBox.querySelector('.word-input').value.trim();
            const meaning = inputBox.querySelector('.meaning-input').value.trim();
            
            if (id) {
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
        updateDivCountDisplay();
        highlightDuplicateWords(); // 로컬 스토리지 저장 후 중복 단어 하이라이트 업데이트
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
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        
        // 최소 5개 보장 로직
        if (loadedWords.length < 5) {
            const numToAdd = 5 - loadedWords.length;
            for (let i = 0; i < numToAdd; i++) {
                loadedWords.push({ id: Date.now().toString() + `-init-${i}`, word: '', meaning: '' });
            }
        }
        
        renderAllItems(loadedWords); // 모든 아이템을 렌더링 (구분선 포함)
        saveWordsToLocalStorage(); // 최종적으로 표시된 내용으로 로컬 스토리지 업데이트 및 하이라이트 트리거
    }

    // .separator-div를 생성하는 함수 (a*n 값 계산하여 표시)
    function createSeparatorDiv(itemIndex, intervalValue) {
        const separator = document.createElement('div');
        separator.className = 'separator-div';
        const calculatedValue = intervalValue * Math.floor(((itemIndex -1) / intervalValue) + 1);
        separator.textContent = `--- ${calculatedValue} ---`;
        return separator;
    }

    // 모든 input-box와 separator-div를 다시 그리는 함수 (a 값 변경, 로드 시 호출)
    function renderAllItems(dataToRender, focusElementId = null) {
        inputArea.innerHTML = ''; // 기존 내용 모두 제거
        const interval = parseInt(intervalInput.value) || 1; // 'a' 값 가져오기, 기본값 1

        let focusedElement = null; // 포커스를 줄 요소 저장

        dataToRender.forEach((wordObj, index) => {
            const { entryWrapper, wordInput } = createInputBox(wordObj.id, wordObj.word, wordObj.meaning, false);
            inputArea.appendChild(entryWrapper);

            if (focusElementId && wordObj.id === focusElementId) {
                focusedElement = wordInput;
            }

            if ((index + 1) % interval === 0 && index !== dataToRender.length - 1) {
                const separator = createSeparatorDiv(index + 1, interval);
                inputArea.appendChild(separator);
            }
        });
        updateDivCountDisplay();
        highlightDuplicateWords(); // 렌더링 후 중복 단어 하이라이트 업데이트

        if (focusedElement) {
            focusedElement.focus();
        }
    }

    // Input Box를 포함하는 entry-wrapper를 생성하는 함수
    function createInputBox(id = Date.now().toString(), initialWord = '', initialMeaning = '', autoUpdateCount = true) {
        const entryWrapper = document.createElement('div');
        entryWrapper.className = 'entry-wrapper';

        const insertBoxButton = document.createElement('button');
        insertBoxButton.className = 'insert-box-button';
        insertBoxButton.textContent = '+';
        insertBoxButton.tabIndex = -1;
        insertBoxButton.style.width = '45px';
        insertBoxButton.style.height = '45px';
        
        const inputBox = document.createElement('div');
        inputBox.className = 'input-box';
        inputBox.dataset.id = id;

        const wordInput = document.createElement('input');
        wordInput.type = 'text';
        wordInput.className = 'word-input';
        wordInput.placeholder = '영단어를 입력하세요';
        wordInput.value = initialWord;

        const meaningInput = document.createElement('input');
        meaningInput.type = 'text';
        meaningInput.className = 'meaning-input';
        meaningInput.placeholder = '의미를 입력하세요';
        meaningInput.value = initialMeaning;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'x';
        deleteButton.tabIndex = -1;

        inputBox.appendChild(wordInput);
        inputBox.appendChild(meaningInput);
        inputBox.appendChild(deleteButton);
        
        entryWrapper.appendChild(insertBoxButton);
        entryWrapper.appendChild(inputBox);

        // input 필드 내용 변경 시 로컬 스토리지에 저장 및 중복 하이라이트 업데이트
        wordInput.addEventListener('input', () => {
            saveWordsDataOnly(); // 데이터 저장
            highlightDuplicateWords(); // 중복 하이라이트 업데이트
        });
        meaningInput.addEventListener('input', saveWordsDataOnly); // 의미 변경은 중복에 영향 없으므로 데이터만 저장

        // --- 이벤트 리스너: 개별 '+' 버튼 ---
        insertBoxButton.addEventListener('click', () => {
            const newId = Date.now().toString();
            const currentEntryWrappers = Array.from(inputArea.querySelectorAll('.entry-wrapper'));
            const insertIndex = currentEntryWrappers.indexOf(entryWrapper) + 1;

            const tempWords = currentEntryWrappers.map(wrapper => ({
                id: wrapper.querySelector('.input-box').dataset.id,
                word: wrapper.querySelector('.input-box .word-input').value.trim(),
                meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
            }));
            tempWords.splice(insertIndex, 0, { id: newId, word: '', meaning: '' });

            renderAllItems(tempWords, newId);
            saveWordsToLocalStorage(); // 변경 사항 로컬 스토리지에 저장 및 하이라이트 트리거
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
                tempWords.splice(removeIndex, 1);

                if (tempWords.length < 5) {
                     tempWords.push({ id: Date.now().toString(), word: '', meaning: '' });
                }
                
                const focusTargetId = tempWords.length > 0 ? tempWords[Math.max(0, removeIndex - 1)].id : null;
                renderAllItems(tempWords, focusTargetId);
                saveWordsToLocalStorage(); // 삭제 후 로컬 스토리지 업데이트 및 하이라이트 트리거
            }
        });
        
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

        return { entryWrapper, wordInput, meaningInput };
    }
    
    // 로컬 스토리지 단어 데이터만 저장하는 함수 (DOM 개수 변동 없을 때)
    function saveWordsDataOnly() {
        wordsData = [];
        const entryWrappers = inputArea.querySelectorAll('.entry-wrapper');
        entryWrappers.forEach(wrapper => {
            const inputBox = wrapper.querySelector('.input-box');
            if (!inputBox) return;

            const id = inputBox.dataset.id;
            const word = inputBox.querySelector('.word-input').value.trim();
            const meaning = inputBox.querySelector('.meaning-input').value.trim();
            
            if (id) {
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
        // 이 함수에서는 updateDivCountDisplay 호출 안함 (개수 변동이 없을 때 호출되므로)
        // highlightDuplicateWords는 wordInput의 input 이벤트에서 직접 호출
    }


    // --- 초기화 ---
    loadWordsFromLocalStorage();

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
        renderAllItems(currentWordsInDom); // renderAllItems 내부에서 highlightDuplicateWords 호출
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
                    tempWords.push({ id: newId, word: '', meaning: '' });
                    
                    renderAllItems(tempWords, newId);
                    saveWordsToLocalStorage(); // 저장 및 하이라이트 트리거
                }
            } else if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault();

                if (isLastEntryWrapper) {
                    const newId = Date.now().toString();
                    const tempWords = allEntryWrappers.map(wrapper => ({
                        id: wrapper.querySelector('.input-box').dataset.id,
                        word: wrapper.querySelector('.input-box .word-input').value.trim(),
                        meaning: wrapper.querySelector('.input-box .meaning-input').value.trim()
                    }));
                    tempWords.push({ id: newId, word: '', meaning: '' });

                    renderAllItems(tempWords, newId);
                    saveWordsToLocalStorage(); // 저장 및 하이라이트 트리거
                } else {
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

        if (!dataToExport || dataToExport === '[]') {
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

                inputArea.innerHTML = ''; 
                wordsData = importedData;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));

                if (wordsData.length < 5) {
                    const numToAdd = 5 - wordsData.length;
                    for (let i = 0; i < numToAdd; i++) {
                        wordsData.push({ id: Date.now().toString() + `-import-init-${i}`, word: '', meaning: '' });
                    }
                }

                renderAllItems(wordsData); // 렌더링 및 하이라이트 트리거
                
                const newFirstInput = inputArea.querySelector('.input-box .word-input');
                if (newFirstInput) {
                    newFirstInput.focus();
                }

                alert('데이터를 성공적으로 가져왔습니다!');
                updateDivCountDisplay(); // 모든 Import 및 추가 작업이 끝난 후 한 번만 개수 업데이트
                // highlightDuplicateWords(); // renderAllItems 내에서 이미 호출됨
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
        saveWordsToLocalStorage(); // 최신 상태를 로컬 스토리지에 저장
        const currentWords = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const interval = parseInt(intervalInput.value) || 1;

        currentWords.forEach((data, index) => {
            const word = data.word || '';
            const meaning = data.meaning || '';
            content += `${word} ${meaning}\n`;
            
            if ((index + 1) % interval === 0 && index !== currentWords.length - 1) {
                content += '------------------------------\n';
            }
        });

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
