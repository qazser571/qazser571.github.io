document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const addBoxButton = document.getElementById('add-box-button');
    const allClearButton = document.getElementById('all-clear-button');
    const exportJsonButton = document.getElementById('export-json-button');
    const importJsonButton = document.getElementById('import-json-button');
    const importFileInput = document.getElementById('import-file-input');
    const downloadTxtButton = document.getElementById('download-txt-button');
    const divCountDisplay = document.getElementById('div-count-display');

    const STORAGE_KEY = 'englishWords';

    let wordsData = [];

    function updateDivCountDisplay() {
        const count = inputArea.children.length;
        divCountDisplay.textContent = `${count}개`;
    }

    // 로컬 스토리지 단어 목록 저장 함수
    function saveWordsToLocalStorage() {
        wordsData = [];
        const inputBoxes = inputArea.querySelectorAll('.input-box');
        inputBoxes.forEach(box => {
            const id = box.dataset.id;
            const word = box.querySelector('.word-input').value.trim();
            const meaning = box.querySelector('.meaning-input').value.trim();
            
            if (id && (word || meaning)) {
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
        updateDivCountDisplay();
    }

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
        
        
        loadedWords.forEach(data => createInputBox(data.id, data.word, data.meaning, false));
        
        
        const currentInputBoxCount = inputArea.children.length;
        if (currentInputBoxCount < 5) {
            for (let i = 0; i < (5 - currentInputBoxCount); i++) {
                createInputBox(Date.now().toString() + `-${currentInputBoxCount + i}`, '', '', false);
            }
        }
        
        saveWordsToLocalStorage();
        updateDivCountDisplay();
    }


    function createInputBox(id = Date.now().toString(), initialWord = '', initialMeaning = '', autoUpdateCount = true) {
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
        inputArea.appendChild(inputBox);

        wordInput.addEventListener('input', saveWordsToLocalStorage);
        meaningInput.addEventListener('input', saveWordsDataOnly);

        deleteButton.addEventListener('click', (e) => {
            if (e.target.textContent === 'x') {
                e.target.textContent = '삭제';
                e.target.classList.add('confirm-delete');
            } else if (e.target.textContent === '삭제') {
                inputArea.removeChild(inputBox);
                saveWordsToLocalStorage();
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

        if (autoUpdateCount) {
             updateDivCountDisplay();
        }

        return { inputBox, wordInput, meaningInput };
    }
    
    function saveWordsDataOnly() {
        wordsData = [];
        const inputBoxes = inputArea.querySelectorAll('.input-box');
        inputBoxes.forEach(box => {
            const id = box.dataset.id;
            const word = box.querySelector('.word-input').value.trim();
            const meaning = box.querySelector('.meaning-input').value.trim();
            if (id && (word || meaning)) {
                 wordsData.push({ id: id, word: word, meaning: meaning });
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsData));
    }

    loadWordsFromLocalStorage();

    const firstWordInput = inputArea.querySelector('.input-box .word-input');
    if (firstWordInput) {
        firstWordInput.focus();
    }

    addBoxButton.addEventListener('click', () => {
        const { wordInput } = createInputBox();
        wordInput.focus();
        saveWordsToLocalStorage();
    });

    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        
        const isMeaningInput = activeElement && activeElement.tagName === 'INPUT' && activeElement.classList.contains('meaning-input');

        if (isMeaningInput) {
            const currentInputBox = activeElement.closest('.input-box');
            const allInputBoxes = Array.from(inputArea.querySelectorAll('.input-box'));
            const currentIndex = allInputBoxes.indexOf(currentInputBox);
            const isLastInputBox = currentIndex === allInputBoxes.length - 1;

            if (event.key === 'Enter') {
                if (isLastInputBox) {
                    event.preventDefault();
                    const { wordInput } = createInputBox();
                    wordInput.focus();
                    saveWordsToLocalStorage();
                }
            } else if (event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault();

                if (isLastInputBox) {
                    const { wordInput } = createInputBox();
                    wordInput.focus();
                    saveWordsToLocalStorage();
                } else {
                    const nextInputBox = allInputBoxes[currentIndex + 1];
                    if (nextInputBox) {
                        const nextWordInput = nextInputBox.querySelector('.word-input');
                        if (nextWordInput) {
                            nextWordInput.focus();
                        }
                    }
                }
            }
        }
    });
    
    allClearButton.addEventListener('click', () => {
        const confirmClear = confirm('정말 모든 단어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
        if (confirmClear) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });

    exportJsonButton.addEventListener('click', () => {
        saveWordsToLocalStorage();
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

    importJsonButton.addEventListener('click', () => {
        importFileInput.click();
    });

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

                wordsData.forEach(data => createInputBox(data.id, data.word, data.meaning, false));

                const currentInputBoxCount = inputArea.children.length;
                if (currentInputBoxCount < 5) {
                    for (let i = 0; i < (5 - currentInputBoxCount); i++) {
                        createInputBox(Date.now().toString() + `-${currentInputBoxCount + i}`, '', '', false);
                    }
                }
                
                const newFirstInput = inputArea.querySelector('.input-box .word-input');
                if (newFirstInput) {
                    newFirstInput.focus();
                }

                alert('데이터를 성공적으로 가져왔습니다!');
                updateDivCountDisplay();

            } catch (error) {
                alert('파일을 읽거나 파싱하는 중 오류가 발생했습니다: ' + error.message);
                console.error("Import error:", error);
            }
            event.target.value = ''; 
        };
        reader.readAsText(file);
    });

    downloadTxtButton.addEventListener('click', () => {
        let content = '';
        saveWordsToLocalStorage(); 
        const currentWords = JSON.parse(localStorage.getItem(STORAGE_KEY));

        currentWords.forEach(data => {
            if (data.word && data.meaning) {
                content += `${data.word} ${data.meaning}\n`;
            }
        });

        if (content === '') {
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
