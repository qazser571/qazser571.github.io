document.addEventListener('DOMContentLoaded', () => {
    let words = [];
    let isEditMode = false;
    let activeViewMode = 'all';
    let currentPopupTargetKnownLevel = null;
    let currentlyConfirmingDeleteButton = null; // 현재 삭제 확인 상태인 버튼을 추적

    const wordsContainer = document.getElementById('words-container');
    const editModeToggleButton = document.getElementById('edit-mode-toggle-btn');
    const deleteAllButton = document.getElementById('delete-all-btn');
    const knownLevelPopup = document.getElementById('known-level-popup');
    const popupContent = knownLevelPopup.querySelector('.popup-content');
    const viewModeButtons = document.querySelectorAll('#view-mode button');
    const rightComponent = document.getElementById('right-component');
    const dataLoadButton = document.getElementById('data-load-btn');
    const dataSaveButton = document = document.getElementById('data-save-btn');
    const fileInput = document.getElementById('file-input');
    const searchInput = document.getElementById('search-input');
    const body = document.body;

    /**
     * 현재 활성화된 삭제 확인 상태를 초기화합니다.
     */
    const clearDeleteConfirmationState = () => {
        if (currentlyConfirmingDeleteButton) {
            currentlyConfirmingDeleteButton.classList.remove('confirm-delete');
            currentlyConfirmingDeleteButton = null;
        }
    };

    /**
     * 로컬 스토리지에서 단어 데이터를 로드합니다.
     */
    const loadWordsFromLocalStorage = () => {
        const storedWords = localStorage.getItem('wordList');
        if (storedWords) {
            words = JSON.parse(storedWords);
            words.forEach(word => {
                if (word.knownLevel === undefined || word.knownLevel === null || isNaN(word.knownLevel)) {
                    word.knownLevel = 0;
                }
            });
        } else {
            words = [];
        }
        ensureMinUnits();
        renderWords();
        updateViewModeCounts();
    };

    /**
     * 로컬 스토리지에 단어 데이터를 저장합니다.
     */
    const saveWordsToLocalStorage = () => {
        localStorage.setItem('wordList', JSON.stringify(words));
    };

    /**
     * HTML 특수 문자를 이스케이프 처리하여 보안 및 렌더링 문제를 방지합니다.
     * @param {string} unsafe - 이스케이프 처리할 문자열
     * @returns {string} 이스케이프 처리된 문자열
     */
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    /**
     * knownLevel 값에 따라 해당 CSS 변수 이름을 반환합니다.
     * @param {number} level - Known Level (0-3)
     * @returns {string} CSS 변수 이름
     */
    const getKnownLevelColorName = (level) => {
        switch(parseInt(level)) {
            case 0: return 'level0-color';
            case 1: return 'level1-color';
            case 2: return 'level2-color';
            case 3: return 'level3-color';
            default: return 'level0-color';
        }
    };
    
    /**
     * 모든 '.known-level' 요소의 배경색을 해당 data-level 값에 맞춰 업데이트합니다.
     */
    const updateKnownLevelBackgrounds = () => {
        document.querySelectorAll('.known-level').forEach(elem => {
            const level = parseInt(elem.dataset.level);
            elem.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue(`--${getKnownLevelColorName(level)}`).trim();
        });
    };

    /**
     * 편집 모드일 때 중복되는 단어들을 강조 표시합니다.
     */
    const highlightDuplicateWords = () => {
        if (!isEditMode) {
            document.querySelectorAll('.word-unit.duplicate-word').forEach(el => el.classList.remove('duplicate-word'));
            return;
        }

        const wordCounts = {};
        words.forEach(wordData => {
            const trimmedWord = wordData.word.trim().toLowerCase();
            if (trimmedWord) {
                wordCounts[trimmedWord] = (wordCounts[trimmedWord] || 0) + 1;
            }
        });

        document.querySelectorAll('.unit-wrapper').forEach(unitWrapper => {
            const originalIndex = parseInt(unitWrapper.dataset.originalIndex);
            const wordData = words[originalIndex];
            const wordUnitElem = unitWrapper.querySelector('.word-unit');

            if (wordData && wordUnitElem) {
                const trimmedWord = wordData.word.trim().toLowerCase();
                if (trimmedWord && wordCounts[trimmedWord] > 1) {
                    wordUnitElem.classList.add('duplicate-word');
                } else {
                    wordUnitElem.classList.remove('duplicate-word');
                }
            }
        });
    };

    /**
     * 단어 유닛들을 렌더링하고 필터링합니다.
     * @param {string} filterLevel - 보기 모드 (all, 0, 1, 2, 3)
     * @param {string} searchTerm - 검색어
     * @param {object|null} focusAfterRender - 렌더링 후 포커스할 요소 정보
     */
    const renderWords = (filterLevel = activeViewMode, searchTerm = '', focusAfterRender = null) => {
        wordsContainer.innerHTML = '';
        
        let filteredWords = words.map((word, index) => ({ ...word, originalIndex: index }));

        // 검색어 필터링
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredWords = filteredWords.filter(wordData =>
                (wordData.word && String(wordData.word).toLowerCase().includes(lowerSearchTerm)) ||
                (wordData.mean && String(wordData.mean).toLowerCase().includes(lowerSearchTerm))
            );
        }

        // 보기 모드 필터링
        if (filterLevel !== 'all') {
            filteredWords = filteredWords.filter(wordData => String(wordData.knownLevel) === String(filterLevel));
        }
        
        // 필터링 결과 메시지 표시
        if (filteredWords.length === 0) {
            const message = searchTerm ? '관련 단어가 없습니다.' :
                            (filterLevel !== 'all' ? '해당 모드의 단어가 없습니다.' : '단어가 없습니다.');
            wordsContainer.innerHTML = `<div class="no-results-message">${message}</div>`;
            return;
        }

        // 각 단어 데이터에 대해 UI 요소 생성 및 추가
        filteredWords.forEach((wordData, index) => {
            const unitWrapper = document.createElement('div');
            unitWrapper.className = `unit-wrapper ${isEditMode ? 'edit-mode' : ''}`;
            unitWrapper.dataset.originalIndex = wordData.originalIndex;

            // '단어 추가' 버튼 생성 및 추가
            const unitAddButton = document.createElement('button');
            unitAddButton.className = 'unit-add-btn';
            unitAddButton.textContent = '+';
            unitWrapper.appendChild(unitAddButton); // 항상 생성하여 CSS로 표시 제어

            const wordUnit = document.createElement('div');
            wordUnit.className = 'word-unit';

            const numDiv = document.createElement('div');
            numDiv.className = 'num';
            numDiv.textContent = String(index + 1).padStart(4, '0');

            const knownLevelDiv = document.createElement('div');
            knownLevelDiv.className = 'known-level';
            knownLevelDiv.dataset.level = wordData.knownLevel;

            const wordInput = document.createElement('input');
            wordInput.setAttribute('type', 'text');
            wordInput.className = `word ${isEditMode ? 'editable-input' : ''}`;
            wordInput.value = wordData.word || '';
            wordInput.readOnly = !isEditMode;

            const meanInput = document.createElement('input');
            meanInput.setAttribute('type', 'text');
            meanInput.className = `mean ${isEditMode ? 'editable-input' : ''}`;
            meanInput.value = wordData.mean || '';
            meanInput.readOnly = !isEditMode;

            wordUnit.appendChild(numDiv);
            wordUnit.appendChild(knownLevelDiv);
            wordUnit.appendChild(wordInput);
            wordUnit.appendChild(meanInput);
            
            unitWrapper.appendChild(wordUnit);

            // '단어 삭제' 버튼 생성 및 추가
            const unitDeleteButton = document.createElement('button');
            unitDeleteButton.className = 'unit-delete-btn';
            unitDeleteButton.textContent = '\u2716'; // 깔끔한 'X' 모양의 유니코드 문자
            unitWrapper.appendChild(unitDeleteButton); // 항상 생성하여 CSS로 표시 제어
            
            wordsContainer.appendChild(unitWrapper);
        });

        attachUnitEventListeners(filteredWords);
        updateKnownLevelBackgrounds();
        highlightDuplicateWords(); // 중복 단어 강조 호출
        
        if (focusAfterRender) {
            const targetUnitWrapper = wordsContainer.querySelector(`.unit-wrapper[data-original-index="${focusAfterRender.originalIndex}"]`);
            if (targetUnitWrapper) {
                let targetInput = null;
                if (focusAfterRender.element === 'word') {
                    targetInput = targetUnitWrapper.querySelector('.word-unit .word');
                } else if (focusAfterRender.element === 'mean') {
                    targetInput = targetUnitWrapper.querySelector('.word-unit .mean');
                }
                if (targetInput) {
                    targetInput.focus();
                    targetInput.select();
                }
            }
        }
    };

    /**
     * 최소 5개의 단어 유닛이 항상 존재하도록 보장합니다.
     */
    const ensureMinUnits = () => {
        while (words.length < 5) {
            words.push({ word: '', mean: '', knownLevel: 0 });
        }
    };

    /**
     * 특정 인덱스의 단어 데이터를 업데이트하고 로컬 스토리지에 저장합니다.
     * @param {number} index - words 배열의 실제 인덱스
     * @param {string} key - 업데이트할 속성 (e.g., 'word', 'mean', 'knownLevel')
     * @param {any} value - 업데이트할 값
     */
    const updateWordData = (index, key, value) => {
        if (words[index]) {
            words[index][key] = value;
            saveWordsToLocalStorage();
            updateViewModeCounts();
            if (isEditMode && key === 'word') {
                highlightDuplicateWords(); // renderWords 대신 직접 하이라이트 갱신
            }
        }
    };

    /**
     * 동적으로 생성된 단어 유닛들에 이벤트 리스너를 연결합니다.
     * @param {Array} renderedFilteredWords - 현재 렌더링된 (필터링된) 단어 목록
     */
    const attachUnitEventListeners = (renderedFilteredWords = []) => {
        const unitWrappers = document.querySelectorAll('.unit-wrapper');

        unitWrappers.forEach(unitWrapper => {
            const originalIndex = parseInt(unitWrapper.dataset.originalIndex);

            const wordInput = unitWrapper.querySelector('.word-unit .word');
            const meanInput = unitWrapper.querySelector('.word-unit .mean');
            const knownLevelElem = unitWrapper.querySelector('.word-unit .known-level');
            const unitAddBtn = unitWrapper.querySelector('.unit-add-btn');
            const unitDeleteBtn = unitWrapper.querySelector('.unit-delete-btn'); // 삭제 버튼 참조

            // input 필드 blur 이벤트 시 삭제 확인 상태 초기화
            wordInput.onblur = (e) => {
                updateWordData(originalIndex, 'word', e.target.value);
                clearDeleteConfirmationState();
            };
            meanInput.onblur = (e) => {
                updateWordData(originalIndex, 'mean', e.target.value);
                clearDeleteConfirmationState();
            };

            // input 값 변경 이벤트 (입력 중 데이터 저장 및 실시간 중복 체크)
            if (isEditMode) { // 편집 모드에서만 input 이벤트 활성화
                wordInput.oninput = (e) => updateWordData(originalIndex, 'word', e.target.value);
            }

            // Tab 키를 이용한 네비게이션 및 새 유닛 추가 로직
            [wordInput, meanInput].forEach(input => {
                input.onkeydown = (e) => {
                    if (e.key === 'Tab' && isEditMode) {
                        e.preventDefault();
                        clearDeleteConfirmationState(); // Tab 이동 시 삭제 확인 상태 초기화

                        const currentInputIsWord = (e.target === wordInput);
                        const currentItemInFilteredListIndex = renderedFilteredWords.findIndex(item => item.originalIndex === originalIndex);

                        if (e.shiftKey) { // Shift + Tab (역방향 이동)
                            if (currentInputIsWord) { // 현재 word input
                                if (currentItemInFilteredListIndex > 0) { // 맨 첫 유닛의 word가 아니면
                                    const prevRenderedOriginalIndex = renderedFilteredWords[currentItemInFilteredListIndex - 1].originalIndex;
                                    const prevUnitWrapper = wordsContainer.querySelector(`.unit-wrapper[data-original-index="${prevRenderedOriginalIndex}"]`);
                                    if (prevUnitWrapper) {
                                        const prevMeanInput = prevUnitWrapper.querySelector('.word-unit .mean');
                                        if (prevMeanInput) {
                                            prevMeanInput.focus();
                                            prevMeanInput.select();
                                        }
                                    }
                                }
                            } else { // 현재 mean input -> 현재 유닛의 word로 이동
                                wordInput.focus();
                                wordInput.select();
                            }
                        } else { // Tab 단독 (정방향 이동)
                            if (currentInputIsWord) { // 현재 word input -> mean input으로 이동
                                meanInput.focus();
                                meanInput.select();
                            } else { // 현재 mean input -> 다음 유닛의 word로 이동 또는 새 유닛 추가
                                if (currentItemInFilteredListIndex !== -1 && currentItemInFilteredListIndex < renderedFilteredWords.length - 1) {
                                    const nextRenderedOriginalIndex = renderedFilteredWords[currentItemInFilteredListIndex + 1].originalIndex;
                                    const nextUnitWrapper = wordsContainer.querySelector(`.unit-wrapper[data-original-index="${nextRenderedOriginalIndex}"]`);
                                    if (nextUnitWrapper) {
                                        const nextWordInput = nextUnitWrapper.querySelector('.word-unit .word');
                                        if (nextWordInput) {
                                            nextWordInput.focus();
                                            nextWordInput.select();
                                        }
                                    }
                                } else { // 현재가 마지막 항목인 경우 -> 새 유닛 추가
                                    const newWord = { word: '', mean: '', knownLevel: 0 };
                                    words.splice(originalIndex + 1, 0, newWord); 
                                    saveWordsToLocalStorage();
                                    renderWords('all', '', { originalIndex: originalIndex + 1, element: 'word' });
                                }
                            }
                        }
                    }
                };
            });
            
            // .known-level 클릭 이벤트 (편집/암기 모드 모두 활성화)
            knownLevelElem.classList.remove('disabled-interactivity');
            knownLevelElem.style.pointerEvents = 'auto';
            knownLevelElem.onclick = (e) => {
                e.stopPropagation();
                clearDeleteConfirmationState(); // Known Level 클릭 시 삭제 확인 상태 초기화
                showKnownLevelPopup(knownLevelElem);
            };

            // .unit-add-btn 클릭 이벤트 (편집 모드에서만 활성화)
            if (unitAddBtn) {
                unitAddBtn.onclick = (e) => {
                    if (!isEditMode) return;
                    e.stopPropagation(); // 이벤트 전파 방지
                    clearDeleteConfirmationState(); // 추가 버튼 클릭 시 삭제 확인 상태 초기화
                    
                    const newWord = { word: '', mean: '', knownLevel: 0 };
                    words.splice(originalIndex + 1, 0, newWord); 
                    saveWordsToLocalStorage();
                    renderWords(activeViewMode, searchInput.value, { originalIndex: originalIndex + 1, element: 'word' });
                };
            }

            // 'x' (삭제) 버튼 클릭 이벤트
            if (unitDeleteBtn) {
                unitDeleteBtn.onclick = (e) => {
                    if (!isEditMode) return;
                    e.stopPropagation(); // 이벤트 전파 방지 (document 클릭 리스너가 발동하지 않도록)

                    if (unitDeleteBtn === currentlyConfirmingDeleteButton) {
                        // 두 번째 클릭: 단어 삭제 확인
                        const originalIndexToDelete = parseInt(unitWrapper.dataset.originalIndex);
                        words.splice(originalIndexToDelete, 1); // words 배열에서 삭제
                        saveWordsToLocalStorage();
                        ensureMinUnits(); // 최소 유닛 수 보장
                        clearDeleteConfirmationState(); // 삭제 후 확인 상태 초기화
                        renderWords(activeViewMode, searchInput.value); // 목록 다시 렌더링

                    } else {
                        // 첫 번째 클릭: 삭제 확인 상태로 전환
                        clearDeleteConfirmationState(); // 다른 버튼이 확인 상태라면 초기화
                        unitDeleteBtn.classList.add('confirm-delete'); // 현재 버튼을 빨간색으로 변경
                        currentlyConfirmingDeleteButton = unitDeleteBtn; // 현재 버튼을 확인 상태로 설정
                    }
                };
            }
        });
    };

    /**
     * Known Level 선택 팝업을 표시합니다.
     * @param {HTMLElement} targetElem - 클릭된 .known-level 요소
     */
    const showKnownLevelPopup = (targetElem) => {
        currentPopupTargetKnownLevel = targetElem;
        knownLevelPopup.classList.remove('hidden');

        // 팝업 내용물(.popup-content)의 위치 계산 및 설정
        const rect = targetElem.getBoundingClientRect();
        popupContent.style.left = `${rect.left + rect.width / 2}px`;
        popupContent.style.top = `${rect.top + rect.height + 5}px`;

        // 현재 knownLevel에 따라 팝업 내 옵션 하이라이트
        const currentLevel = parseInt(targetElem.dataset.level);
        knownLevelPopup.querySelectorAll('.level-option').forEach(option => {
            option.classList.remove('selected');
            if (parseInt(option.dataset.level) === currentLevel) {
                option.classList.add('selected');
            }
        });
    };

    // Known Level 팝업 내에서 레벨 옵션 클릭 시 처리
    knownLevelPopup.addEventListener('click', (e) => {
        if (e.target.classList.contains('level-option')) {
            const newLevel = parseInt(e.target.dataset.level);
            if (currentPopupTargetKnownLevel) {
                const originalIndex = parseInt(currentPopupTargetKnownLevel.closest('.unit-wrapper').dataset.originalIndex);
                updateWordData(originalIndex, 'knownLevel', newLevel);
                currentPopupTargetKnownLevel.dataset.level = newLevel;
                updateKnownLevelBackgrounds();
                highlightDuplicateWords(); // 레벨 변경 시에도 중복 강조 갱신
                
                if (activeViewMode !== 'all' && String(newLevel) !== activeViewMode) {
                    renderWords(activeViewMode, searchInput.value);
                }
            }
            knownLevelPopup.classList.add('hidden');
            popupContent.style.left = '-9999px'; // 팝업 숨김 처리와 함께 위치 초기화
            popupContent.style.top = '-9999px';
            currentPopupTargetKnownLevel = null;
            clearDeleteConfirmationState(); // 팝업 닫힘 시 삭제 확인 상태 초기화
        }
    });

    // 팝업 외부 클릭 시 팝업 닫기
    document.addEventListener('click', (e) => {
        // 현재 열린 팝업이 있고, 클릭된 대상이 팝업 내부도 아니고 팝업을 연 버튼도 아닌 경우
        if (currentPopupTargetKnownLevel && !knownLevelPopup.contains(e.target) && !currentPopupTargetKnownLevel.contains(e.target)) {
            knownLevelPopup.classList.add('hidden');
            popupContent.style.left = '-9999px'; // 팝업 숨김 처리와 함께 위치 초기화
            popupContent.style.top = '-9999px';
            currentPopupTargetKnownLevel = null;
        }

        // 삭제 확인 상태인 버튼이 있고, 클릭된 대상이 그 버튼이 아닐 경우
        if (currentlyConfirmingDeleteButton && e.target !== currentlyConfirmingDeleteButton) {
            clearDeleteConfirmationState();
        }
    });

    /**
     * 보기 모드별 단어 개수를 계산하고 UI를 업데이트합니다.
     */
    const updateViewModeCounts = () => {
        const counts = { all: words.length, 0: 0, 1: 0, 2: 0, 3: 0 };
        words.forEach(wordData => {
            if (wordData.knownLevel !== undefined && counts[wordData.knownLevel] !== undefined) {
                counts[wordData.knownLevel]++;
            }
        });

        document.getElementById('view-mode-all').querySelector('.count').textContent = counts.all;
        document.getElementById('view-mode-level0').querySelector('.count').textContent = counts[0];
        document.getElementById('view-mode-level1').querySelector('.count').textContent = counts[1];
        document.getElementById('view-mode-level2').querySelector('.count').textContent = counts[2];
        document.getElementById('view-mode-level3').querySelector('.count').textContent = counts[3];
    };

    // 검색 입력 이벤트 핸들러
    searchInput.oninput = () => {
        clearDeleteConfirmationState(); // 검색 시 삭제 확인 상태 초기화
        renderWords(activeViewMode, searchInput.value);
    };

    // 보기 모드 버튼 클릭 이벤트 핸들러
    viewModeButtons.forEach(button => {
        button.onclick = () => {
            if (isEditMode && button.dataset.level !== 'all') {
                return;
            }
            clearDeleteConfirmationState(); // 보기 모드 변경 시 삭제 확인 상태 초기화

            viewModeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeViewMode = button.dataset.level;
            renderWords(activeViewMode, searchInput.value);
        };
    });

    /**
     * 편집 모드를 토글하고 UI 상태를 업데이트합니다.
     */
    const toggleEditMode = () => {
        clearDeleteConfirmationState(); // 모드 토글 시 삭제 확인 상태 초기화

        let topMostVisibleUnitOriginalIndex = null;
        const currentUnitWrappers = wordsContainer.querySelectorAll('.unit-wrapper');
        const containerRect = wordsContainer.getBoundingClientRect();

        // 현재 뷰포트 상단에 가장 가깝게 보이는 유닛의 originalIndex를 찾음
        for (let i = 0; i < currentUnitWrappers.length; i++) {
            const unit = currentUnitWrappers[i];
            const unitRect = unit.getBoundingClientRect();
            // 유닛의 상단이 컨테이너 뷰포트 상단에 있거나, 약간 위로 벗어났더라도 거의 붙어 있는 경우
            // -10은 오차범위를 두어 유닛이 조금 벗어나도 인식하도록 함
            if (unitRect.top <= containerRect.top + 10 && unitRect.bottom > containerRect.top) {
                topMostVisibleUnitOriginalIndex = parseInt(unit.dataset.originalIndex);
                break;
            }
        }
        
        // 만약 어떤 유닛도 찾지 못했고, 유닛이 하나라도 있다면 가장 첫 번째 유닛을 기준으로 함
        if (topMostVisibleUnitOriginalIndex === null && currentUnitWrappers.length > 0) {
             topMostVisibleUnitOriginalIndex = parseInt(currentUnitWrappers[0].dataset.originalIndex);
        }

        isEditMode = !isEditMode;
        editModeToggleButton.textContent = isEditMode ? '완료' : '편집';
        deleteAllButton.classList.toggle('hidden', !isEditMode);

        body.classList.toggle('edit-mode-active', isEditMode);

        if (isEditMode) {
            const allWordsButton = document.getElementById('view-mode-all');
            if (allWordsButton) {
                viewModeButtons.forEach(btn => btn.classList.remove('active'));
                allWordsButton.classList.add('active');
                activeViewMode = allWordsButton.dataset.level;
            }
            viewModeButtons.forEach(btn => {
                if (btn.dataset.level !== 'all') {
                    btn.disabled = true;
                }
            });

        } else {
            viewModeButtons.forEach(btn => {
                btn.disabled = false;
            });
        }

        renderWords(activeViewMode, searchInput.value);
        updateRightComponentButtonOrder(); 

        // 모드 전환 후 스크롤 위치 복원
        if (topMostVisibleUnitOriginalIndex !== null) {
            requestAnimationFrame(() => {
                const targetUnitWrapper = wordsContainer.querySelector(`.unit-wrapper[data-original-index="${topMostVisibleUnitOriginalIndex}"]`);
                if (targetUnitWrapper) {
                    targetUnitWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    };

    /**
     * right-component 내 버튼들의 순서와 가시성을 업데이트합니다.
     */
    const updateRightComponentButtonOrder = () => {
        const rightInner = document.getElementById('right-inner'); 

        rightInner.appendChild(dataLoadButton);
        rightInner.appendChild(fileInput);
        rightInner.appendChild(dataSaveButton);

        if (isEditMode) {
            rightInner.appendChild(deleteAllButton);
        } else {
            if (rightInner.contains(deleteAllButton)) {
                rightInner.removeChild(deleteAllButton);
            }
        }
    };

    /**
     * 모든 단어를 삭제하는 핸들러입니다.
     */
    deleteAllButton.onclick = () => {
        clearDeleteConfirmationState(); // 전체 삭제 버튼 클릭 시 삭제 확인 상태 초기화
        if (confirm('정말로 모든 단어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            words = [];
            localStorage.removeItem('wordList');
            ensureMinUnits();
            renderWords(activeViewMode, searchInput.value);
            updateViewModeCounts();
            alert('모든 단어가 삭제되었습니다.');
        }
    };
    
    // 데이터 로드 버튼 클릭 시 파일 선택창 트리거
    dataLoadButton.onclick = () => {
        clearDeleteConfirmationState(); // 데이터 로드 버튼 클릭 시 삭제 확인 상태 초기화
        fileInput.click();
    };

    // 파일 입력 변경 시 (파일 선택 완료)
    fileInput.onchange = (e) => {
        clearDeleteConfirmationState(); // 파일 입력 변경 시 삭제 확인 상태 초기화
        const file = e.target.files[0];
        if (!file) return;

        // 파일 확장자 검사 (txt 파일만 허용)
        if (!file.name.endsWith('.txt')) {
            alert('텍스트(.txt) 파일만 로드할 수 있습니다.');
            fileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const lines = event.target.result.split('\n');
                const loadedWords = [];
                const pattern = /^(.*?)<\$#\?(\d)!#\$>(.*)$/;

                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        const match = trimmedLine.match(pattern);
                        if (match) {
                            const wordText = match[1].trim();
                            const knownLevel = parseInt(match[2]);
                            const meanText = match[3].trim();
                            loadedWords.push({ word: wordText, mean: meanText, knownLevel: knownLevel });
                        } else {
                            console.warn(`Skipping malformed line: ${trimmedLine}`);
                        }
                    }
                });
                
                words = loadedWords;
                saveWordsToLocalStorage();
                ensureMinUnits();
                renderWords();
                updateViewModeCounts();
                alert('데이터 로드가 완료되었습니다!');
            } catch (error) {
                alert('파일을 처리하는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
                console.error('File load error:', error);
            }
            fileInput.value = '';
        };
        reader.readAsText(file);
    };

    // 데이터 저장 버튼 클릭 핸들러
    dataSaveButton.onclick = () => {
        clearDeleteConfirmationState(); // 데이터 저장 버튼 클릭 시 삭제 확인 상태 초기화
        const dataToSave = words;
        
        const textData = dataToSave.map(word => {
            const wordPart = word.word.trim();
            const meanPart = word.mean.trim();
            const levelPart = `<$#?${word.knownLevel || 0}!#$>`;
            return `${wordPart}${levelPart}${meanPart}`;
        }).join('\n');

        const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wordList.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('데이터 저장이 완료되었습니다!');
    };

    // 초기화 로직
    editModeToggleButton.onclick = toggleEditMode;
    dataLoadButton.disabled = false;
    dataSaveButton.disabled = false;
    loadWordsFromLocalStorage();
    updateRightComponentButtonOrder();
});