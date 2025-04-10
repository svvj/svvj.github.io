if (typeof window.isTestMode === 'undefined') {
    window.isTestMode = false;
}
if (typeof window.imagesJsonPath === 'undefined') {
    window.imagesJsonPath = "images.json";
}
if (typeof window.questionsJsonPath === 'undefined') {
    window.questionsJsonPath = "questions.json";
}

let currentQuestionIndex = 0;
let answers = {};
let startTime;
let questionList = [];
let imageSequence = [];



const imageCache = {
    renderingImages: new Map(), // 렌더링 이미지 캐시
    referenceImages: new Map(), // 레퍼런스 이미지 캐시
    
    // 캐시 초기화
    clearCache: function() {
        this.renderingImages.clear();
        this.referenceImages.clear();
        console.log("Image cache cleared");
    },
    
    // 이미지를 캐시에 추가
    addToCache: function(key, imageUrl, type) {
        if (type === 'rendering') {
            this.renderingImages.set(key, imageUrl);
        } else if (type === 'reference') {
            this.referenceImages.set(key, imageUrl);
        }
    },
    
    // 캐시에서 이미지 가져오기
    getFromCache: function(key, type) {
        if (type === 'rendering') {
            return this.renderingImages.get(key);
        } else if (type === 'reference') {
            return this.referenceImages.get(key);
        }
        return null;
    }
};

// **참가자 정보 불러오기**
const participantInfo = JSON.parse(localStorage.getItem("participantInfo")) || {};
const backgroundInfo = JSON.parse(localStorage.getItem("backgroundInfo")) || {};

// **초기화 함수**
document.addEventListener("DOMContentLoaded", function() {
    console.log("Test mode:", window.isTestMode ? "Enabled" : "Disabled");
    console.log("Loading images from:", window.imagesJsonPath);
    console.log("Loading questions from:", window.questionsJsonPath);

    // Show test mode indicator if in test mode
    if (window.isTestMode) {
        const sessionIndicator = document.querySelector(".session-indicator");
        if (sessionIndicator) {
            sessionIndicator.textContent = "Practice Session";
            sessionIndicator.style.backgroundColor = "#ff9800";
        }
    }
    
    // JSON 파일에서 이미지 목록 로드
    fetch(window.imagesJsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.length === 0) {
                throw new Error("Images data is empty or invalid");
            }
            console.log("Successfully loaded images:", data);
            imageSequence = data;
            generateQuestions();
            initializeExperiment();
        })
        .catch(error => {
            console.error("Error loading images:", error);
            alert(`Failed to load experiment data: ${error.message}. Please refresh the page and try again.`);
        });
});

// **질문 리스트 생성 함수**
function generateQuestions() {
    if (!imageSequence || imageSequence.length === 0) {
        console.error("Image sequence is empty or undefined");
        return;
    }

    const questionContainer = document.querySelector(".question-container");
    if (!questionContainer) {
        console.error("Question container not found");
        return;
    }

    // 이미지 순서 랜덤화
    const randomizedImages = randomizeImageSequence(imageSequence);
    console.log("Images randomized for participant:", participantInfo.name);
    
    // 각 이미지에 대해 2개의 질문 생성
    randomizedImages.forEach((img, imgIndex) => {
        const question1 = {
            render: img.render,
            object: img.object,
            num: img.num,
            question: "Does the reconstructed 3D object look like something that could exist in the real world?",
            required: true,
            type: "likert",
            scale: 7,
            labels: ["Definitely not", "Definitely yes"],
            imageIndex: imgIndex
        };
        
        // 질문 2: 일관성 (라이커트 스케일)
        const question2 = {
            render: img.render,
            object: img.object,
            num: img.num,
            question: "How good and clear does the reconstructed 3D object look compared to the reference images?",
            required: true,
            type: "likert",
            scale: 7,
            labels: ["Not good", "Very good"],
            imageIndex: imgIndex
        };
        
        // 두 개의 질문을 모두 추가
        [question1, question2].forEach(q => {
            questionList.push(q);
        });
    });

    console.log(`Generated ${questionList.length} questions from ${randomizedImages.length} images`);
    
    // 랜덤화된 이미지 순서를 localStorage에 저장 (분석용)
    saveRandomizedSequence(randomizedImages);
}

/**
 * 이미지 시퀀스를 랜덤화합니다.
 * @param {Array} images - 원본 이미지 배열
 * @returns {Array} 랜덤화된 이미지 배열
 */
function randomizeImageSequence(images) {
    // 원본 배열 복사 (참조 변경 방지)
    const imagesToRandomize = [...images];
    
    // Fisher-Yates (Knuth) 셔플 알고리즘
    for (let i = imagesToRandomize.length - 1; i > 0; i--) {
        // 0부터 i까지의 랜덤한 인덱스 생성
        const j = Math.floor(Math.random() * (i + 1));
        // i번째와 j번째 요소 교환
        [imagesToRandomize[i], imagesToRandomize[j]] = [imagesToRandomize[j], imagesToRandomize[i]];
    }
    
    return imagesToRandomize;
}

/**
 * 랜덤화된 이미지 순서를 저장합니다 (나중에 분석할 때 유용함).
 * @param {Array} randomizedSequence - 랜덤화된 이미지 시퀀스
 */
function saveRandomizedSequence(randomizedSequence) {
    // 이미지 정보만 추출 (객체, 렌더링 타입, 번호)
    const sequenceInfo = randomizedSequence.map((img, index) => ({
        index: index,
        render: img.render,
        object: img.object,
        num: img.num
    }));
    
    // 참가자 ID와 함께 저장
    const sequenceData = {
        participantId: participantInfo.name || 'anonymous',
        timestamp: new Date().toISOString(),
        sequence: sequenceInfo
    };
    
    // localStorage에 저장
    try {
        localStorage.setItem("randomizedSequence", JSON.stringify(sequenceData));
        console.log("Randomized sequence saved successfully");
    } catch (error) {
        console.error("Error saving randomized sequence:", error);
    }
    
    // 결과 데이터에도 이 정보 추가 (제출 시 포함되도록)
    answers.randomizedSequence = sequenceInfo;
}

// **실험 초기화 함수**
function initializeExperiment() {
    if (questionList.length === 0) {
        console.error("No questions generated");
        return;
    }
    
    // 객체별 프레임 뷰 초기화
    viewedObjectFrames = new Map();
    
    // 저장된 진행 상황이 있는지 확인
    const hasSavedProgress = restoreSavedProgress();
    
    if (hasSavedProgress) {
        const confirmRestore = confirm("We found a saved progress. Would you like to continue from where you left off?");
        
        if (confirmRestore) {
            // 저장된 상태로 계속 진행
            updateQuestion(); // 현재 질문 업데이트
            updateFrame(); // 이미지 업데이트
        } else {
            // 새로 시작 (저장된 상태 삭제)
            localStorage.removeItem("surveyProgress");
            currentQuestionIndex = 0;
            answers = {};
            updateQuestion();
            updateFrame();
        }
    } else {
        // 새로 시작
        updateFrame(); // 첫 번째 이미지 로드
        updateQuestion(); // 첫 번째 질문 로드
    }
    
    startTime = Date.now(); // 시간 측정 시작
    preloadImagesForCurrentQuestion(); // 현재 질문 이미지 프리로드
    
    // 자동 저장 시작 (10초 간격)
    startAutoSave(10);
}

// **현재 질문 업데이트 함수** - 이전 답변 복원 로직 추가
function updateQuestion() {
    const questionContainer = document.querySelector(".question-container");
    
    if (!questionContainer) {
        console.error("Question container not found");
        return;
    }

    // 질문 컨테이너 초기화
    questionContainer.innerHTML = "";

    if (currentQuestionIndex >= questionList.length) {
        showSubmitButton();
        return;
    }

    // 현재 질문 데이터
    const questionData = questionList[currentQuestionIndex];
    let questionElement;
    
    // 질문 유형에 따라 적절한 UI 생성
    switch(questionData.type) {
        case "likert":
            questionElement = createLikertQuestion(questionData, currentQuestionIndex);
            break;
        case "multiplechoice":
            questionElement = createMultipleChoiceQuestion(questionData, currentQuestionIndex);
            break;
        case "checkbox":
            questionElement = createCheckboxQuestion(questionData, currentQuestionIndex);
            break;
        default:
            console.warn(`Unknown question type: ${questionData.type}`);
            return;
    }
    
    // 질문 요소 추가
    if (questionElement) {
        questionContainer.appendChild(questionElement);
    }
    
    // 이미지 관련 처리
    updateImageForQuestion(questionData);
    
    // 저장된 답변 복원
    restoreSavedAnswer();
    
    // 진행률 표시 업데이트
    updateProgressBar();
    
    // 다음 버튼 상태 초기화
    updateNextButtonState();
    
    // 라디오 버튼과 체크박스에 이벤트 리스너 추가하여 선택 시 버튼 상태 업데이트
    addAnswerChangeListeners();
}

// 질문에 맞는 이미지 및 레퍼런스 업데이트
function updateImageForQuestion(questionData) {
    // 이미지 관련 요소 업데이트 로직
    // 필요시 구현
}


// **progress bar 업데이트**
function updateProgressBar() {
    const progressBar = document.getElementById("progress-bar");
    if (!progressBar) {
        console.error("Progress bar element not found!");
        return;
    }

    const progress = ((currentQuestionIndex + 1) / questionList.length) * 100;
    progressBar.style.width = progress + "%";
    console.log(`Progress: ${progress.toFixed(1)}% (Question ${currentQuestionIndex + 1}/${questionList.length})`);
}

// **현재 이미지 업데이트** - 레퍼런스 이미지 로드 추가
// Modify the updateFrame function to shift frame numbers
// 이미 본 객체 추적을 위한 맵
let viewedObjectFrames = new Map(); // object -> Set of frames

// 프레임 확인을 추적하는 변수 추가 (기존 변수 대체)
const MIN_FRAMES_TO_VIEW = 100; // 최소 확인해야 할 프레임 수

// updateFrame 함수 수정 - 객체별 추적 기능으로 변경
function updateFrame() {
    const frameSlider = document.getElementById("frame-slider");
    const imageFrame = document.getElementById("image-frame");
    
    // Apply frame shifting to start from front (50) instead of back (0)
    const sliderValue = parseInt(frameSlider.value);
    const shiftedFrame = (sliderValue + 50) % 200;  // Shift by 50 frames and wrap around at 200
    
    // 현재 객체 정보 가져오기
    const questionData = questionList[currentQuestionIndex];
    const currentObject = questionData.object;
    
    // 현재 객체에 대한 프레임 추적 세트 가져오거나 생성
    if (!viewedObjectFrames.has(currentObject)) {
        viewedObjectFrames.set(currentObject, new Set());
    }
    
    // 현재 프레임을 해당 객체의 뷰 세트에 추가
    viewedObjectFrames.get(currentObject).add(sliderValue);
    
    // 다음 버튼 상태 업데이트
    updateNextButtonState();
    
    // Update current frame display with the slider value (not the shifted value)
    const currentFrameDisplay = document.getElementById("current-frame");
    if (currentFrameDisplay) {
        currentFrameDisplay.textContent = `${sliderValue + 1}`;
    }

    if (!frameSlider || !imageFrame) {
        console.error("Frame slider or image frame element not found");
        return;
    }

    // Current question image info
    const { render, object, num } = questionData;

    // Format SHIFTED frame number with leading zeros (00000, 00001, etc.)
    const frameString = String(shiftedFrame).padStart(5, '0');
    
    // Create cache key and image path using the shifted frame
    const cacheKey = `${render}_${object}_${num}_${shiftedFrame}`;
    const cachedImagePath = imageCache.getFromCache(cacheKey, 'rendering');

    if (cachedImagePath) {
        // Use cached image if available
        imageFrame.src = cachedImagePath;
    } else {
        // Otherwise load and cache
        const imagePath = `images/${render}/${object}/${num}/${frameString}.png`;
        imageFrame.src = imagePath;

        // Add to cache
        imageCache.addToCache(cacheKey, imagePath, 'rendering');
    }

    console.log(`Displaying frame: ${sliderValue} (shifted to ${shiftedFrame} - ${frameString}.png)`);
}

// 각 질문을 위한 확인된 프레임 초기화 함수
// function resetViewedFrames() {
//     viewedFrames = new Set();
//     updateNextButtonState();
// }

// 다음 버튼 상태 업데이트 함수
function updateNextButtonState() {
    const nextButtons = document.querySelectorAll(".btn-primary");
    
    // 현재 객체와 객체의 프레임 확인 횟수
    const currentObject = questionList[currentQuestionIndex].object;
    const framesViewed = viewedObjectFrames.has(currentObject) ? 
                        viewedObjectFrames.get(currentObject).size : 0;
    
    // 테스트 모드와 실제 모드 모두 동일한 조건 적용
    const hasViewedEnoughFrames = framesViewed >= MIN_FRAMES_TO_VIEW;
    
    // 현재 질문에 답변했는지 확인
    const hasAnswered = hasAnsweredQuestion();
    
    // 디버깅 로그 추가
    console.log(`Mode: ${window.isTestMode ? "Test" : "Real"}, Object: ${currentObject}, 
                Frames: ${framesViewed}/${MIN_FRAMES_TO_VIEW}, Answered: ${hasAnswered}`);
    
    nextButtons.forEach(button => {
        if (button.textContent === "Next") {
            // 두 조건을 모두 확인하도록 로직 수정
            // 충분한 프레임을 확인했고 답변했을 때만 활성화
            if (hasViewedEnoughFrames && hasAnswered) {
                button.disabled = false;
                button.title = "";
                button.style.opacity = "1";
                button.style.cursor = "pointer";
                console.log("Next button ENABLED");
            } else {
                button.disabled = true;
                
                if (!hasViewedEnoughFrames && !hasAnswered) {
                    button.title = `Please view at least ${MIN_FRAMES_TO_VIEW} frames and answer the question before proceeding`;
                } else if (!hasViewedEnoughFrames) {
                    button.title = `Please view at least ${MIN_FRAMES_TO_VIEW} frames before proceeding`;
                } else {
                    button.title = `Please answer the question before proceeding`;
                }
                
                button.style.opacity = "0.5";
                button.style.cursor = "not-allowed";
                console.log("Next button DISABLED");
            }
        }
    });
}

// 답변 변경 감지를 위한 이벤트 리스너 추가
function addAnswerChangeListeners() {
    const activeQuestion = document.querySelector(".question.active");
    if (!activeQuestion) return;
    
    const questionData = questionList[currentQuestionIndex];
    
    switch(questionData.type) {
        case "likert":
        case "multiplechoice":
            // 기존 이벤트 리스너 제거 (중복 방지)
            const radioButtons = activeQuestion.querySelectorAll(`input[type="radio"]`);
            radioButtons.forEach(radio => {
                // 기존 이벤트 리스너 모두 제거
                radio.removeEventListener("change", updateNextButtonState);
                
                // 새 이벤트 리스너 추가 - 모든 모드에서 동일하게 동작
                radio.addEventListener("change", function() {
                    // 답변이 변경되었을 때 버튼 상태만 업데이트 (프레임 카운트 유지)
                    console.log("Radio button changed, checking answer condition");
                    // 프레임 조건과 함께 평가하기 위해 updateNextButtonState만 호출
                    updateNextButtonState(); 
                });
            });
            break;
            
        case "checkbox":
            // 체크박스에 변경 이벤트 추가
            const checkboxes = activeQuestion.querySelectorAll(`input[type="checkbox"]`);
            checkboxes.forEach(checkbox => {
                // 기존 이벤트 리스너 제거
                checkbox.removeEventListener("change", updateNextButtonState);
                
                // 새 이벤트 리스너 추가 - 모든 모드에서 동일하게 동작
                checkbox.addEventListener("change", function() {
                    // 답변이 변경되었을 때 버튼 상태만 업데이트
                    console.log("Checkbox changed, checking answer condition");
                    updateNextButtonState(); 
                });
            });
            break;
    }
}
// 현재 질문에 답변했는지 확인하는 함수
function hasAnsweredQuestion() {
    if (currentQuestionIndex >= questionList.length) {
        return true;
    }
    
    const questionData = questionList[currentQuestionIndex];
    const activeQuestion = document.querySelector(".question.active");
    
    if (!activeQuestion) return false;
    
    switch(questionData.type) {
        case "likert":
        case "multiplechoice":
            // 라디오 버튼 확인
            const checked = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            return !!checked;
            
        case "checkbox":
            // 체크박스 확인 - 하나라도 선택되어 있으면 됨
            let anyChecked = false;
            questionData.options.forEach((_, optIndex) => {
                const checkbox = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}_opt${optIndex}"]`);
                if (checkbox && checkbox.checked) {
                    anyChecked = true;
                }
            });
            return anyChecked;
            
        default:
            return true;
    }
}

// 레퍼런스 이미지 로드 함수
function loadReferenceImages(render, object, num) {
    const referenceContainer = document.getElementById("reference-container");
    if (!referenceContainer) {
        console.error("Reference container not found");
        return;
    }

    // 컨테이너 초기화
    referenceContainer.innerHTML = "";

    // 레퍼런스 폴더 경로
    const objectBase = object && typeof object === 'string' ? object.split("/")[0] : object;
    
    const referencePath = `images/references/${objectBase}`;
    const referenceFileListPath = `${referencePath}/file.json`;

    console.log(`Loading reference images from: ${referencePath}`);

    // file.json 로드 시도
    fetch(referenceFileListPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`File not found: ${referenceFileListPath}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.files && Array.isArray(data.files)) {
                const referencePaths = data.files.map(filename => `${referencePath}/${filename}`);
                loadReferenceImagesWithPreview(referencePaths);
            } else {
                console.warn("Invalid file.json format:", data);
                fallbackLoadReferenceImages(referencePath, referenceContainer);
            }
        })
        .catch(error => {
            console.warn(`Error loading file.json: ${error.message}`);
            fallbackLoadReferenceImages(referencePath, referenceContainer);
        });
}

// 파일 목록을 찾지 못했을 때 대체 로드 방법
function fallbackLoadReferenceImages(referencePath, container) {
    console.log(`Trying fallback method to load reference images from: ${referencePath}`);
    
    // 가능한 파일 패턴 배열
    const patterns = [
        { prefix: "r_", suffix: ".png" },
        { prefix: "", suffix: ".png" },
        { prefix: "ref_", suffix: ".png" }
    ];
    
    let loadedImagesCount = 0;
    
    // 각 패턴으로 시도
    patterns.forEach(pattern => {
        for (let i = 0; i < 20; i++) {
            const imagePath = `${referencePath}/${pattern.prefix}${i}${pattern.suffix}`;
            const thumbnail = document.createElement("img");
            thumbnail.src = imagePath;
            thumbnail.alt = `Reference ${i + 1}`;
            thumbnail.className = "reference-thumbnail";
            thumbnail.setAttribute("data-index", i);
            
            // 이미지 로드 성공 시
            thumbnail.onload = function() {
                loadedImagesCount++;
                
                // 첫 번째 로드된 이미지에 active 클래스 추가
                if (loadedImagesCount === 1) {
                    this.classList.add("active");
                }
                
                // 클릭 이벤트 추가
                this.addEventListener("click", function() {
                    // 모든 썸네일에서 active 클래스 제거
                    document.querySelectorAll(".reference-thumbnail").forEach(thumb => {
                        thumb.classList.remove("active");
                    });
                    
                    // 현재 썸네일에 active 클래스 추가
                    this.classList.add("active");
                    
                    // 전체 크기 이미지 표시
                    showFullSizeReference(imagePath);
                });
            };
            
            // 이미지 로드 실패 시
            thumbnail.onerror = function() {
                this.remove(); // 요소 제거
            };
            
            // 컨테이너에 추가
            container.appendChild(thumbnail);
        }
    });
    
    // 아무 이미지도 로드되지 않았는지 확인
    setTimeout(() => {
        if (container.children.length === 0) {
            container.innerHTML = "<p style='text-align:center;color:#666;'>No reference images found</p>";
        }
    }, 1000);
}

// 레퍼런스 썸네일 추가 함수
function addReferenceThumbnail(imagePath, index, container) {
    const thumbnail = document.createElement("img");
    thumbnail.src = imagePath;
    thumbnail.alt = `Reference ${index + 1}`;
    thumbnail.className = "reference-thumbnail";

    // 첫 번째 이미지에 active 클래스 추가
    if (index === 0) {
        thumbnail.classList.add("active");
    }

    // 클릭 이벤트 추가
    thumbnail.addEventListener("click", function () {
        // 모든 썸네일에서 active 클래스 제거
        document.querySelectorAll(".reference-thumbnail").forEach(thumb => {
            thumb.classList.remove("active");
        });

        // 현재 썸네일에 active 클래스 추가

        this.classList.add("active");

        // 전체 크기 이미지 표시
        showFullSizeReference(imagePath);
    });

    // 이미지 로드 실패 시
    thumbnail.onerror = function () {
        console.error(`Failed to load reference image: ${imagePath}`);
        this.remove();
    };

    container.appendChild(thumbnail);
}

// 전체 크기 레퍼런스 이미지 보기 함수
function showFullSizeReference(imagePath) {
    let modal = document.getElementById("reference-modal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "reference-modal";
        modal.className = "reference-modal";

        const modalImg = document.createElement("img");
        modalImg.id = "reference-modal-img";
        modalImg.className = "reference-modal-content";

        const closeBtn = document.createElement("span");
        closeBtn.className = "reference-modal-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = function () {
            modal.style.display = "none";
        };

        modal.appendChild(closeBtn);
        modal.appendChild(modalImg);
        document.body.appendChild(modal);

        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    const modalImg = document.getElementById("reference-modal-img");
    modalImg.src = imagePath;
    modal.style.display = "flex";
}

// DOM 로드 시 모달 요소 생성
document.addEventListener("DOMContentLoaded", function() {
    // 기존 이벤트 리스너에 영향을 주지 않도록 별도 함수 호출
    initReferenceModal();
});

// 레퍼런스 모달 초기화 함수
function initReferenceModal() {
    // 미리 모달 요소 생성
    const modal = document.createElement("div");
    modal.id = "reference-modal";
    modal.className = "reference-modal";
    
    const modalImg = document.createElement("img");
    modalImg.id = "reference-modal-img";
    modalImg.className = "reference-modal-content";
    
    const closeBtn = document.createElement("span");
    closeBtn.className = "reference-modal-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = function() {
        modal.style.display = "none";
    };
    
    modal.appendChild(closeBtn);
    modal.appendChild(modalImg);
    document.body.appendChild(modal);
    
    modal.addEventListener("click", function(e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// **이미지 프리로딩 함수**
function preloadAdjacentFrames(render, object, num, currentFrame) {
    const framesToPreload = [1, 5, 10, 15, 20]; // 미리 로드할 프레임
    
    framesToPreload.forEach(offset => {
        const nextFrame = currentFrame + offset;
        if (nextFrame <= 100) { // 최대 100 프레임까지만
            const imagePath = `images/${render}/${object}/N${num}M100/r_${nextFrame}.png`;
            const cacheKey = `${render}_${object}_${num}_${nextFrame}`;
            
            // 새로운 imageCache 객체 사용
            if (!imageCache.getFromCache(cacheKey, 'rendering')) {
                preloadImage(imagePath, cacheKey, 'rendering');
            }
        }
    });
}

// 필수 항목 검증
function validateRequiredQuestions() {
    if (currentQuestionIndex >= questionList.length) {
        return true;
    }
    
    const questionData = questionList[currentQuestionIndex];
    
    if (questionData.required) {
        const activeQuestion = document.querySelector(".question.active");
        if (!activeQuestion) return false;
        
        switch(questionData.type) {
            case "likert":
            case "multiplechoice":
                // 라디오 버튼 검증
                const checked = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
                if (!checked) {
                    alert("Please select an option for the required question before continuing.");
                    return false;
                }
                break;
            
            case "checkbox":
                // 체크박스 검증 - 적어도 하나는 선택되어 있어야 함
                if (questionData.required) {
                    let anyChecked = false;
                    questionData.options.forEach((_, optIndex) => {
                        const checkbox = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}_opt${optIndex}"]`);
                        if (checkbox && checkbox.checked) {
                            anyChecked = true;
                        }
                    });
                    
                    if (!anyChecked) {
                        alert("Please select at least one option for the required question before continuing.");
                        return false;
                    }
                }
                break;
        }
    }
    
    return true;
}

// **이전 질문으로 이동** - 이전 답변 복원 기능 추가
function prevQuestion() {
    if (currentQuestionIndex <= 0) return;
    
    // 현재 질문 답변 저장 (뒤로 갔다가 다시 돌아올 때를 위해)
    saveCurrentAnswer();
    
    // 현재 오브젝트 정보 저장
    const currentObject = questionList[currentQuestionIndex].object;
    const currentImageIndex = questionList[currentQuestionIndex].imageIndex;
    
    // 이전 질문으로 이동
    currentQuestionIndex--;
    startTime = Date.now();
    
    // 이전 질문 표시
    updateQuestion();
    
    // 이미지가 변경되었는지 확인하고 업데이트
    const prevImageIndex = questionList[currentQuestionIndex].imageIndex;
    const prevObject = questionList[currentQuestionIndex].object;
    
    if (prevImageIndex !== currentImageIndex) {
        // 이미지 캐시 초기화
        imageCache.clearCache(); // 캐시 완전 초기화
        console.log("Image cache cleared for previous question");
        
        // 새 이미지 업데이트
        updateFrame();
        
        // 레퍼런스 이미지 로드
        const { render, object, num } = questionList[currentQuestionIndex];
        
        // 레퍼런스 이미지 폴더 경로 - object에서 첫 부분만 사용
        const objectBase = object && typeof object === 'string' ? object.split("/")[0] : object;
        const referencePath = `images/references/${objectBase}`;
        
        // 레퍼런스 이미지 로드 함수 호출
        console.log(`Loading reference images for object: ${objectBase}`);
        loadReferenceImages(render, object, num);
    }
    
    // 이전에 저장된 답변 복원
    restoreSavedAnswer();
}

// **다음 질문으로 이동**
function nextQuestion() {
    if (!validateRequiredQuestions()) return;
    
    // 현재 질문 응답 저장
    saveCurrentAnswer();
    
    // 현재 오브젝트 정보 저장
    const currentImageIndex = questionList[currentQuestionIndex].imageIndex;
    const currentObject = questionList[currentQuestionIndex].object;
    
    // 다음 질문으로 이동
    currentQuestionIndex++;
    startTime = Date.now();
    
    // 실험이 끝났는지 확인
    if (currentQuestionIndex >= questionList.length) {
        showSubmitButton();
        return;
    }
    
    // 새로운 질문 표시
    updateQuestion();
    
    // 이미지가 변경되었는지 확인하고 업데이트
    const newImageIndex = questionList[currentQuestionIndex].imageIndex;
    const newObject = questionList[currentQuestionIndex].object;
    
    if (newImageIndex !== currentImageIndex) {
        // 이미지 캐시 초기화
        imageCache.clearCache(); // 캐시 완전 초기화
        console.log("Image cache cleared for new question");
        
        // 프레임 슬라이더 초기화
        const frameSlider = document.getElementById("frame-slider");
        if (frameSlider) {
            frameSlider.value = 0;
        }
        
        // 새 이미지 업데이트
        updateFrame();
        
        // 레퍼런스 이미지 로드
        const { render, object, num } = questionList[currentQuestionIndex];
        
        // 레퍼런스 이미지 폴더 경로 - object에서 첫 부분만 사용
        const objectBase = object && typeof object === 'string' ? object.split("/")[0] : object;
        const referencePath = `images/references/${objectBase}`;
        
        // 레퍼런스 이미지 로드 함수 호출
        console.log(`Loading reference images for object: ${objectBase}`);
        loadReferenceImages(render, object, num);
    }
}

// 답변 저장 함수 수정
function saveCurrentAnswer() {
    const timeSpent = Date.now() - startTime;
    const activeQuestion = document.querySelector(".question.active");
    
    if (!activeQuestion) return;
    
    const questionData = questionList[currentQuestionIndex];
    let value;
    let explanationText = null;
    
    switch(questionData.type) {
        case "likert":
        case "multiplechoice":
            // 라디오 버튼 처리
            const checked = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            value = checked ? checked.value : "";
            break;
        
        case "checkbox":
            // 체크박스 처리 - 선택된 모든 값을 배열로 저장
            value = [];
            questionData.options.forEach((option, optIndex) => {
                const checkbox = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}_opt${optIndex}"]`);
                if (checkbox && checkbox.checked) {
                    value.push(checkbox.value);
                    
                    // "None of the above" 인 경우 설명 텍스트도 저장
                    if (option === "None of the above") {
                        const textarea = activeQuestion.querySelector(`#q${currentQuestionIndex}_none_explanation`);
                        if (textarea) {
                            explanationText = textarea.value;
                        }
                    }
                }
            });
            break;
    }
    
    // 답변 저장
    answers[`q${currentQuestionIndex}`] = {
        render: questionData.render,
        object: questionData.object,
        num: questionData.num,
        question: questionData.question,
        value: value,
        timeSpent: timeSpent,
        explanation: explanationText // 추가 설명 저장
    };
}

// 저장된 답변 복원
function restoreSavedAnswer() {
    const questionKey = `q${currentQuestionIndex}`;
    const savedAnswer = answers[questionKey];
    
    if (!savedAnswer) return;
    
    const activeQuestion = document.querySelector(".question.active");
    if (!activeQuestion) return;
    
    const questionData = questionList[currentQuestionIndex];
    
    switch(questionData.type) {
        case "likert":
        case "multiplechoice":
            // 라디오 버튼 복원
            if (savedAnswer.value) {
                const radioButtons = activeQuestion.querySelectorAll(`input[name="q${currentQuestionIndex}"]`);
                radioButtons.forEach(radio => {
                    if (radio.value === savedAnswer.value) {
                        radio.checked = true;
                    }
                });
            }
            break;
        
        case "checkbox":
            // 체크박스 복원
            if (Array.isArray(savedAnswer.value)) {
                let hasNoneOfAbove = false;
                
                questionData.options.forEach((option, optIndex) => {
                    const checkbox = activeQuestion.querySelector(`input[name="q${currentQuestionIndex}_opt${optIndex}"]`);
                    if (checkbox) {
                        const isChecked = savedAnswer.value.includes(checkbox.value);
                        checkbox.checked = isChecked;
                        
                        // "None of the above" 처리
                        if (option === "None of the above" && isChecked) {
                            hasNoneOfAbove = true;
                            
                            // 텍스트 영역 표시
                            const textareaContainer = activeQuestion.querySelector(`.none-explanation-container`);
                            if (textareaContainer) {
                                textareaContainer.style.display = "block";
                            }
                            
                            // 저장된 텍스트 복원
                            const textarea = activeQuestion.querySelector(`#q${currentQuestionIndex}_none_explanation`);
                            if (textarea && savedAnswer.explanation) {
                                textarea.value = savedAnswer.explanation;
                            }
                        }
                    }
                });
            }
            break;
            
        case "text":
            // 텍스트 복원
            const textarea = activeQuestion.querySelector("textarea");
            if (textarea && savedAnswer.value) {
                textarea.value = savedAnswer.value;
            }
            break;
    }
}

// **제출 버튼 표시**
function showSubmitButton() {
    const experimentContainer = document.querySelector(".experiment-container");
    const submitContainer = document.querySelector(".submit-container");
    
    if (experimentContainer) {
        experimentContainer.style.display = "none";
    }
    
    if (submitContainer) {
        submitContainer.style.display = "block";
    } else {
        // 제출 컨테이너가 없는 경우, 동적으로 생성
        const container = document.createElement("div");
        container.className = "submit-container";
        container.innerHTML = `
            <h2>Experiment Completed</h2>
            <p>Thank you for your participation!</p>
            <button onclick="submitAnswers()">Submit</button>
        `;
        document.body.appendChild(container);
    }
    
    updateProgressBar(); // 100% 진행률 표시
}

// **답변 제출 및 저장**
function submitAnswers() {
    const finalData = {
        participantInfo: participantInfo,
        backgroundInfo: backgroundInfo,
        responses: answers,
        completedAt: new Date().toISOString()
    };
    
    try {
        // 테스트 모드가 아닌 경우에만 데이터 저장
        if (!window.isTestMode) {
            localStorage.setItem("surveyAnswers", JSON.stringify(finalData));
            console.log("Answers saved successfully:", finalData);
        } else {
            console.log("Test mode: Answers not saved", finalData);
        }
        
        // 테스트 모드인지 확인하고 적절한 페이지로 리디렉션
        if (window.isTestMode === true) {
            console.log("Redirecting to test post-survey page");
            window.location.href = "post_survey_test.html";
        } else {
            console.log("Redirecting to real post-survey page");
            window.location.href = "post_survey.html";
        }
    } catch (error) {
        console.error("Error in submitAnswers:", error);
        alert("There was a problem with your submission. Please try again.");
    }
}

// 현재 질문에 필요한 모든 이미지를 프리로드
function preloadImagesForCurrentQuestion() {
    if (currentQuestionIndex >= questionList.length) return;
    
    // 로딩 표시 보여주기
    showLoadingIndicator();
    
    const questionData = questionList[currentQuestionIndex];
    const { render, object, num } = questionData;
    
    // 렌더링 이미지 경로 기본 구성
    const basePath = `images/${render}/${object}/${num}`;
    
    // 모든 슬라이더 프레임 이미지 로드
    const renderingPromises = [];
    for (let frame = 0; frame < 200; frame++) {
        const frameString = String(frame).padStart(5, '0');
        const imagePath = `${basePath}/${frameString}.png`;
        renderingPromises.push(preloadImage(imagePath, `${render}_${object}_${num}_${frame}`, 'rendering'));
    }
    
    // 레퍼런스 이미지 경로
    const referencePath = `images/references/${object.split("/")[0]}`;
    const referenceFileListPath = `${referencePath}/file.json`;
    
    // file.json 로드 시도
    fetch(referenceFileListPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Reference file list not found');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.files && Array.isArray(data.files)) {
                // 레퍼런스 이미지 프리로드
                const referencePromises = data.files.map((filename, index) => {
                    const imagePath = `${referencePath}/${filename}`;
                    return preloadImage(imagePath, `${render}_${object}_${num}_ref_${index}`, 'reference');
                });
                
                // 모든 이미지 로드 완료 대기
                Promise.all([...renderingPromises, ...referencePromises])
                    .then(() => {
                        console.log("All images for the current question preloaded");
                        hideLoadingIndicator();
                        updateUIWithLoadedImages();
                    })
                    .catch(error => {
                        console.error("Error preloading images:", error);
                        hideLoadingIndicator();
                        updateUIWithLoadedImages(); // 오류가 있어도 UI 업데이트
                    });
            } else {
                // file.json 형식 오류, 대체 방법 사용
                fallbackPreloadReferenceImages(referencePath, renderingPromises);
            }
        })
        .catch(error => {
            // file.json을 찾을 수 없음, 대체 방법 사용
            console.warn("Error loading file.json:", error);
            fallbackPreloadReferenceImages(referencePath, renderingPromises);
        });
}

// 대체 방법을 사용한 레퍼런스 이미지 프리로드
function fallbackPreloadReferenceImages(referencePath, renderingPromises) {
    const referencePromises = [];
    const patterns = [
        { prefix: "r_", suffix: ".png" },
        { prefix: "", suffix: ".png" }
    ];
    
    // 각 패턴으로 시도
    patterns.forEach(pattern => {
        for (let i = 0; i < 20; i++) {
            const imagePath = `${referencePath}/${pattern.prefix}${i}${pattern.suffix}`;
            referencePromises.push(preloadImage(imagePath, `${referencePath}_${pattern.prefix}${i}`, 'reference'));
        }
    });
    
    // 모든 이미지 로드 완료 대기
    Promise.all([...renderingPromises, ...referencePromises])
        .then(() => {
            console.log("All images preloaded with fallback method");
            hideLoadingIndicator();
            updateUIWithLoadedImages();
        })
        .catch(error => {
            console.error("Error preloading images:", error);
            hideLoadingIndicator();
            updateUIWithLoadedImages(); // 오류가 있어도 UI 업데이트
        });
}

// 단일 이미지 프리로드 헬퍼 함수
function preloadImage(src, key, type) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            imageCache.addToCache(key, src, type);
            resolve(src);
        };
        img.onerror = function() {
            // 이미지 로드 실패해도 Promise는 성공으로 처리 (UI에서 처리)
            resolve(null);
        };
        img.src = src;
    });
}

// 로딩 인디케이터 표시
function showLoadingIndicator() {
    // 기존 로딩 인디케이터가 있으면 재사용
    let loadingIndicator = document.getElementById("loading-indicator");
    
    // 없으면 새로 생성
    if (!loadingIndicator) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading-indicator";
        loadingIndicator.className = "loading-overlay";
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading images...</div>
        `;
        document.body.appendChild(loadingIndicator);
    }
    
    loadingIndicator.style.display = "flex";
}

// 로딩 인디케이터 숨기기
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById("loading-indicator");
    if (loadingIndicator) {
        loadingIndicator.style.display = "none";
    }
}

// 로드된 이미지로 UI 업데이트
function updateUIWithLoadedImages() {
    // 이미지를 로드한 후 UI 업데이트
    const frameSlider = document.getElementById("frame-slider");
    if (frameSlider) {
        // 슬라이더 초기값 설정
        frameSlider.value = 0;
        updateFrame(); // 첫 번째 프레임 표시
    }
    
    // 레퍼런스 이미지 로드
    loadReferenceImagesFromCache();
}

// 캐시된 레퍼런스 이미지 표시
function loadReferenceImagesFromCache() {
    const referenceContainer = document.getElementById("reference-container");
    if (!referenceContainer) return;
    
    // 컨테이너 초기화
    referenceContainer.innerHTML = "";
    
    // 캐시된 레퍼런스 이미지 가져오기
    imageCache.referenceImages.forEach((imagePath, key) => {
        // 현재 질문에 해당하는 이미지만 표시 (키 프리픽스 확인)
        if (key.startsWith(getCurrentQuestionPrefix())) {
            const img = document.createElement("img");
            img.src = imagePath;
            img.alt = "Reference image";
            img.className = "reference-thumbnail";
            
            // 첫 번째 이미지에 active 클래스 추가
            if (referenceContainer.children.length === 0) {
                img.classList.add("active");
            }
            
            // 클릭 이벤트
            img.addEventListener("click", function() {
                document.querySelectorAll(".reference-thumbnail").forEach(thumb => {
                    thumb.classList.remove("active");
                });
                this.classList.add("active");
                
                // 이미지 전체 크기로 보기
                showFullSizeReference(imagePath);
            });
            
            referenceContainer.appendChild(img);
        }
    });
    
    // 이미지가 없으면 메시지 표시
    if (referenceContainer.children.length === 0) {
        referenceContainer.innerHTML = `
            <p style="text-align:center; color:#666;">No reference images available</p>
        `;
    }
}

// 현재 질문의 프리픽스 가져오기 (캐시 키용)
function getCurrentQuestionPrefix() {
    if (currentQuestionIndex >= questionList.length) return "";
    
    const questionData = questionList[currentQuestionIndex];
    const { render, object, num } = questionData;
    return `${render}_${object}_${num}`;
}

// 다음 질문으로 이동하는 함수 수정 - 캐시 초기화 및 새 이미지 프리로드
function goToNextQuestion() {
    // 현재 질문 저장 및 유효성 검사
    saveCurrentAnswers();
    
    if (!validateCurrentAnswers()) {
        alert("Please answer all questions before proceeding.");
        return;
    }
    
    // 현재 질문 숨기기
    document.querySelector(`.question[data-index="${currentQuestionIndex}"]`).classList.remove('active');
    
    // 다음 질문으로 이동
    currentQuestionIndex++;
    
    // 모든 질문이 끝났는지 확인
    if (currentQuestionIndex >= questionList.length) {
        showSubmitScreen();
        return;
    }
    
    // 캐시 초기화 및 새 이미지 프리로드
    imageCache.clearCache();
    preloadImagesForCurrentQuestion();
    
    // 다음 질문 표시 및 UI 업데이트
    document.querySelector(`.question[data-index="${currentQuestionIndex}"]`).classList.add('active');
    updateQuestionTitle();
    updateProgressBar();
    
    // 슬라이더 초기화 (필요 시)
    const frameSlider = document.getElementById("frame-slider");
    if (frameSlider) {
        frameSlider.value = 0;
    }
}

// 이전 질문으로 이동 - 캐시 초기화 및 새 이미지 프리로드
function goToPreviousQuestion() {
    if (currentQuestionIndex <= 0) return;
    
    // 현재 질문 저장
    saveCurrentAnswers();
    
    // 현재 질문 숨기기
    document.querySelector(`.question[data-index="${currentQuestionIndex}"]`).classList.remove('active');
    
    // 이전 질문으로 이동
    currentQuestionIndex--;
    
    // 캐시 초기화 및 새 이미지 프리로드
    imageCache.clearCache();
    preloadImagesForCurrentQuestion();
    
    // 이전 질문 표시 및 UI 업데이트
    document.querySelector(`.question[data-index="${currentQuestionIndex}"]`).classList.add('active');
    updateQuestionTitle();
    updateProgressBar();
    
    // 슬라이더 초기화 (필요 시)
    const frameSlider = document.getElementById("frame-slider");
    if (frameSlider) {
        frameSlider.value = 0;
    }
}

// 레퍼런스 썸네일을 로드하고 미리보기 기능을 추가하는 함수
function loadReferenceImagesWithPreview(referencePaths) {
    const referenceContainer = document.getElementById("reference-container");
    if (!referenceContainer) return;
    
    // 컨테이너 초기화
    referenceContainer.innerHTML = "";
    
    // 레퍼런스 이미지 추가
    referencePaths.forEach((path, index) => {
        // 썸네일 컨테이너 생성
        const thumbnailContainer = document.createElement("div");
        thumbnailContainer.className = "thumbnail-container";

        // 썸네일 이미지 생성
        const thumbnail = document.createElement("img");
        thumbnail.src = path;
        thumbnail.alt = `Reference ${index + 1}`;
        thumbnail.className = "reference-thumbnail";
        if (index === 0) thumbnail.classList.add("active");
        
        // 미리보기 이미지 생성
        const preview = document.createElement("img");
        preview.src = path;
        preview.alt = `Preview ${index + 1}`;
        preview.className = "thumbnail-preview";
        
        // 클릭 이벤트 - 모달 표시 및 활성화 상태 변경
        thumbnail.addEventListener("click", function() {
            document.querySelectorAll(".reference-thumbnail").forEach(thumb => {
                thumb.classList.remove("active");
            });
            this.classList.add("active");
            showFullSizeReference(path);
        });
        
        // 썸네일 컨테이너에 요소 추가
        thumbnailContainer.appendChild(thumbnail);
        thumbnailContainer.appendChild(preview);
        referenceContainer.appendChild(thumbnailContainer);
    });
}

// Likert 질문 생성 함수에서 Previous 버튼 제거
function createLikertQuestion(question, index) {
    // 질문 컨테이너
    const questionElement = document.createElement("div");
    questionElement.className = "question active";
    questionElement.setAttribute("data-index", index);

    // 질문 제목
    const title = document.createElement("h2");
    title.innerHTML = `${question.question || question.text} 
                      ${question.required ? "<span style='color:red;'>*</span>" : ""}`;
    title.style.marginBottom = "15px"; // 타이틀 아래 마진 줄임
    questionElement.appendChild(title);

    // 라이커트 컨테이너
    const likertContainer = document.createElement("div");
    likertContainer.className = "likert-container";

    // 라디오 버튼 그룹 생성
    const radioGroup = document.createElement("div");
    radioGroup.className = "likert-radio-group";
    
    const scale = question.scale || 7;
    
    // 각 선택지 생성
    for (let i = 1; i <= scale; i++) {
        const option = document.createElement("div");
        option.className = "likert-option";
        
        // 실제 라디오 버튼
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q${index}`;
        radio.id = `q${index}_${i}`;
        radio.value = i;
        radio.className = "likert-radio";
        if (question.required) radio.required = true;
        
        // 커스텀 라벨 (버튼처럼 보이고 숫자 포함)
        const label = document.createElement("label");
        label.htmlFor = `q${index}_${i}`;
        label.className = "likert-label";
        label.textContent = i;
        
        option.appendChild(radio);
        option.appendChild(label);
        radioGroup.appendChild(option);
    }

    // 라벨 그룹 생성
    const labelGroup = document.createElement("div");
    labelGroup.className = "likert-label-group";
    
    const labels = question.labels || ["Not realistic at all", "Extremely realistic"];
    
    // 왼쪽 레이블
    const leftLabel = document.createElement("div");
    leftLabel.className = "likert-endpoint left";
    leftLabel.textContent = labels[0];
    
    // 오른쪽 레이블
    const rightLabel = document.createElement("div");
    rightLabel.className = "likert-endpoint right";
    rightLabel.textContent = labels[1];
    
    labelGroup.appendChild(leftLabel);
    labelGroup.appendChild(rightLabel);

    // 라이커트 컨테이너에 요소 추가
    likertContainer.appendChild(radioGroup);
    likertContainer.appendChild(labelGroup);
    questionElement.appendChild(likertContainer);

    // 버튼 컨테이너 - Next 버튼만 표시
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";
    
    // 버튼을 오른쪽에 배치하기 위한 빈 영역
    const leftButtonArea = document.createElement("div");
    leftButtonArea.className = "button-left-area";
    
    // 오른쪽 버튼 영역 (Next 버튼용)
    const rightButtonArea = document.createElement("div");
    rightButtonArea.className = "button-right-area";
    
    // Previous 버튼은 더 이상 추가하지 않음
    
    // 다음 버튼 (항상 오른쪽에만 배치)
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.className = "btn-primary";
    nextButton.onclick = function() { nextQuestion(); };
    rightButtonArea.appendChild(nextButton);
    
    buttonContainer.appendChild(leftButtonArea);
    buttonContainer.appendChild(rightButtonArea);
    questionElement.appendChild(buttonContainer);
    
    return questionElement;
}

function createMultipleChoiceQuestion(question, index) {
    // 질문 컨테이너
    const questionElement = document.createElement("div");
    questionElement.className = "question active";
    questionElement.setAttribute("data-index", index);

    // 질문 제목
    const title = document.createElement("h2");
    title.innerHTML = `${question.question} 
                      ${question.required ? "<span style='color:red;'>*</span>" : ""}`;
    questionElement.appendChild(title);

    // 옵션 컨테이너
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "options-container";
    
    // 옵션 추가
    question.options.forEach((option, optIndex) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "option";
        
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q${index}`;
        radio.value = option.value || option;
        radio.id = `q${index}_opt${optIndex}`;
        if (question.required) radio.required = true;
        
        const label = document.createElement("label");
        label.htmlFor = `q${index}_opt${optIndex}`;
        label.textContent = option.label || option;
        
        optionDiv.appendChild(radio);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
    });
    
    questionElement.appendChild(optionsContainer);
    
    // 버튼 컨테이너 생성 (flex 레이아웃 사용)
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";
    buttonContainer.style.marginTop = "20px";
    
    // 왼쪽 영역 (Previous 버튼용)
    const leftButtonArea = document.createElement("div");
    
    // 오른쪽 영역 (Next 버튼용)
    const rightButtonArea = document.createElement("div");
    
    // 이전 버튼 (첫 번째 질문이 아닐 경우에만)
    // if (index > 0) {
    //     const prevButton = document.createElement("button");
    //     prevButton.textContent = "Previous";
    //     prevButton.onclick = function() { prevQuestion(); };
    //     leftButtonArea.appendChild(prevButton);
    // }
    
    // 다음 버튼 (항상 오른쪽)
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.onclick = function() { nextQuestion(); };
    rightButtonArea.appendChild(nextButton);
    
    // 버튼 영역 추가
    buttonContainer.appendChild(leftButtonArea);
    buttonContainer.appendChild(rightButtonArea);
    questionElement.appendChild(buttonContainer);
    
    return questionElement;
}

// 체크박스 질문 생성 (여러 옵션 선택 가능)
function createCheckboxQuestion(question, index) {
    // 질문 컨테이너
    const questionElement = document.createElement("div");
    questionElement.className = "question active";
    questionElement.setAttribute("data-index", index);

    // 질문 제목
    const title = document.createElement("h2");
    title.innerHTML = `${question.question} 
                      ${question.required ? "<span style='color:red;'>*</span>" : ""}`;
    questionElement.appendChild(title);

    // 옵션 컨테이너
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "checkbox-container";
    optionsContainer.style.display = "flex";
    optionsContainer.style.flexDirection = "column";
    optionsContainer.style.gap = "10px";
    
    // 옵션 추가
    question.options.forEach((option, optIndex) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "checkbox-option";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = `q${index}_opt${optIndex}`;
        checkbox.value = option.value || option;
        checkbox.id = `q${index}_opt${optIndex}`;
        
        const label = document.createElement("label");
        label.htmlFor = `q${index}_opt${optIndex}`;
        label.textContent = option.label || option;
        
        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
        
        // "None of the above" 옵션에 이벤트 리스너 추가
        if (option === "None of the above") {
            // 텍스트 입력 영역 생성 (초기에는 숨김)
            const textareaContainer = document.createElement("div");
            textareaContainer.className = "none-explanation-container";
            textareaContainer.style.marginTop = "10px";
            textareaContainer.style.marginLeft = "25px";
            textareaContainer.style.display = "none";
            
            const textarea = document.createElement("textarea");
            textarea.id = `q${index}_none_explanation`;
            textarea.name = `q${index}_none_explanation`;
            textarea.placeholder = "Please explain why none of the aspects look realistic...";
            textarea.style.width = "100%";
            textarea.style.minHeight = "80px";
            textarea.style.padding = "8px";
            textarea.style.borderRadius = "4px";
            textarea.style.border = "1px solid #ccc";
            
            textareaContainer.appendChild(textarea);
            optionDiv.appendChild(textareaContainer);
            
            // 체크박스 이벤트 리스너
            checkbox.addEventListener("change", function() {
                textareaContainer.style.display = this.checked ? "block" : "none";
            });
        }
    });
    
    questionElement.appendChild(optionsContainer);
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";
    buttonContainer.style.marginTop = "20px";
    
    // 왼쪽 영역 (Previous 버튼용)
    const leftButtonArea = document.createElement("div");
    
    // 오른쪽 영역 (Next 버튼용)
    const rightButtonArea = document.createElement("div");
    
    // 이전 버튼 (첫 번째 질문이 아닐 경우에만)
    if (index > 0) {
        const prevButton = document.createElement("button");
        prevButton.textContent = "Previous";
        prevButton.onclick = function() { prevQuestion(); };
        leftButtonArea.appendChild(prevButton);
    }
    
    // 다음 버튼 (항상 오른쪽)
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.onclick = function() { nextQuestion(); };
    rightButtonArea.appendChild(nextButton);
    
    // 버튼 영역 추가
    buttonContainer.appendChild(leftButtonArea);
    buttonContainer.appendChild(rightButtonArea);
    questionElement.appendChild(buttonContainer);
    
    return questionElement;
}

/**
 * 라디오 버튼 그룹을 생성합니다.
 * @param {Object} question - 질문 데이터
 * @param {number} index - 질문 인덱스
 * @returns {HTMLElement} 라디오 버튼 그룹 요소
 */
function createRadioButtonGroup(question, index) {
    const radioGroup = document.createElement("div");
    radioGroup.className = "likert-radio-group";

    const scale = question.scale || 7;
    
    // 각 옵션 생성
    for (let i = 1; i <= scale; i++) {
        const option = document.createElement("div");
        option.className = "likert-option";
        
        // 라디오 버튼
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `q${index}`;
        radio.id = `q${index}_${i}`;
        radio.value = i;
        radio.className = "likert-radio";
        
        // 라디오 버튼 레이블 (숫자)
        const label = document.createElement("label");
        label.htmlFor = `q${index}_${i}`;
        label.className = "likert-number";
        label.textContent = i;
        
        option.appendChild(radio);
        option.appendChild(label);
        radioGroup.appendChild(option);
    }
    
    return radioGroup;
}

/**
 * 레이블 그룹을 생성합니다.
 * @param {Object} question - 질문 데이터
 * @returns {HTMLElement} 레이블 그룹 요소
 */
function createLabelGroup(question) {
    const labelGroup = document.createElement("div");
    labelGroup.className = "likert-label-group";
    
    const labels = question.labels || ["Not realistic at all", "Extremely realistic"];
    
    // 왼쪽 레이블
    const leftLabel = document.createElement("div");
    leftLabel.className = "likert-endpoint left";
    leftLabel.textContent = labels[0];
    
    // 오른쪽 레이블
    const rightLabel = document.createElement("div");
    rightLabel.className = "likert-endpoint right";
    rightLabel.textContent = labels[1];
    
    labelGroup.appendChild(leftLabel);
    labelGroup.appendChild(rightLabel);
    
    return labelGroup;
}

// 자동 저장 기능 추가
let autoSaveInterval;

// 자동 저장 함수
function autoSaveAnswers() {
    // 현재 질문 답변 저장
    saveCurrentAnswer();
    
    // Map과 Set을 JSON으로 저장 가능하게 변환
    const viewedObjectFramesObj = {};
    viewedObjectFrames.forEach((frameSet, objectKey) => {
        viewedObjectFramesObj[objectKey] = Array.from(frameSet);
    });
    
    // 현재 답변과 진행 상태 저장
    const currentState = {
        answers: answers,
        currentQuestionIndex: currentQuestionIndex,
        viewedObjectFrames: viewedObjectFramesObj, // 변환된 객체 저장
        timestamp: new Date().toISOString()
    };
    
    try {
        localStorage.setItem("surveyProgress", JSON.stringify(currentState));
        console.log("Progress auto-saved at:", currentState.timestamp);
    } catch (error) {
        console.error("Error auto-saving progress:", error);
    }
}

// 자동 저장 시작
function startAutoSave(intervalSeconds = 30) {
    // 이전에 설정된 인터벌이 있으면 중지
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // 새 인터벌 설정 (기본 30초)
    autoSaveInterval = setInterval(autoSaveAnswers, intervalSeconds * 1000);
    console.log(`Auto-save started, interval: ${intervalSeconds} seconds`);
}

// 자동 저장 중지
function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log("Auto-save stopped");
    }
}

// 저장된 진행 상황 복원
function restoreSavedProgress() {
    const savedProgress = localStorage.getItem("surveyProgress");
    
    if (!savedProgress) {
        console.log("No saved progress found");
        return false;
    }
    
    try {
        const progress = JSON.parse(savedProgress);
        
        // 유효한 저장 데이터인지 확인
        if (progress && progress.answers && typeof progress.currentQuestionIndex === 'number') {
            // 데이터 복원
            answers = progress.answers;
            currentQuestionIndex = progress.currentQuestionIndex;
            
            // 객체별 프레임 뷰 복원 (저장되어 있다면)
            if (progress.viewedObjectFrames) {
                viewedObjectFrames = new Map();
                
                // JSON에서 변환된 객체를 Map으로 다시 변환
                Object.entries(progress.viewedObjectFrames).forEach(([key, valueArray]) => {
                    viewedObjectFrames.set(key, new Set(valueArray));
                });
            }
            
            console.log(`Restored progress: Question ${currentQuestionIndex + 1} of ${questionList.length}`);
            return true;
        }
    } catch (error) {
        console.error("Error restoring saved progress:", error);
    }
    
    return false;
}

// 수동 저장 버튼 기능
function saveProgress() {
    saveCurrentAnswer(); // 현재 질문 답변 저장
    autoSaveAnswers(); // 자동 저장 함수 호출
    
    // 사용자에게 알림
    const timestamp = new Date().toLocaleTimeString();
    alert(`Progress saved at ${timestamp}`);
}

// **실험 초기화 함수** 수정
function initializeExperiment() {
    if (questionList.length === 0) {
        console.error("No questions generated");
        return;
    }
    
    // 객체별 프레임 뷰 초기화
    viewedObjectFrames = new Map();
    
    // 저장된 진행 상황이 있는지 확인
    const hasSavedProgress = restoreSavedProgress();
    
    if (hasSavedProgress) {
        const confirmRestore = confirm("We found a saved progress. Would you like to continue from where you left off?");
        
        if (confirmRestore) {
            // 저장된 상태로 계속 진행
            updateQuestion(); // 현재 질문 업데이트
            updateFrame(); // 이미지 업데이트
        } else {
            // 새로 시작 (저장된 상태 삭제)
            localStorage.removeItem("surveyProgress");
            currentQuestionIndex = 0;
            answers = {};
            updateQuestion();
            updateFrame();
        }
    } else {
        // 새로 시작
        updateFrame(); // 첫 번째 이미지 로드
        updateQuestion(); // 첫 번째 질문 로드
    }
    
    startTime = Date.now(); // 시간 측정 시작
    preloadImagesForCurrentQuestion(); // 현재 질문 이미지 프리로드
    
    // 자동 저장 시작 (30초 간격)
    startAutoSave(10);
}

// 문서 맨 아래에 추가하세요

// 개발자 모드 토글 상태
let devModeEnabled = false;

/**
 * 개발자 모드 키보드 단축키 설정
 */
document.addEventListener('keydown', function(event) {
    // Ctrl + Shift + D로 개발자 모드 토글
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        devModeEnabled = !devModeEnabled;
        console.log(`Developer mode ${devModeEnabled ? 'enabled' : 'disabled'}`);
        
        // 화면에 알림 표시
        const notification = document.createElement('div');
        notification.textContent = `Developer Mode: ${devModeEnabled ? 'ON' : 'OFF'}`;
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = devModeEnabled ? '#4caf50' : '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '8px 16px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        
        document.body.appendChild(notification);
        
        // 3초 후 알림 제거
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
        
        return;
    }
    
    // 개발자 모드가 활성화된 경우에만 아래 단축키 동작
    if (!devModeEnabled) return;
    
    // 스페이스바: 현재 질문 자동 완성
    if (event.code === 'Space') {
        event.preventDefault();
        autoCompleteCurrentQuestion();
    }
    
    // N 키: 다음 질문으로 강제 이동
    if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        forceNextQuestion();
    }
    
    // S 키: 실험 종료 화면으로 건너뛰기
    if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        skipToEnd();
    }
    
    // 숫자 키 1~5: 라이커트 척도 빠른 선택
    if (['1', '2', '3', '4', '5', '6', '7'].includes(event.key)) {
        const activeQuestion = document.querySelector('.question.active');
        if (activeQuestion) {
            const radioButton = activeQuestion.querySelector(`input[value="${event.key}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
        }
    }
});

/**
 * 현재 질문 자동 완성
 */
function autoCompleteCurrentQuestion() {
    const activeQuestion = document.querySelector('.question.active');
    if (!activeQuestion) return;
    
    const questionData = questionList[currentQuestionIndex];
    if (!questionData) return;
    
    console.log("Auto-completing question:", currentQuestionIndex);
    
    switch(questionData.type) {
        case "likert":
            // 중간 값 선택 (3)
            const radioButton = activeQuestion.querySelector('input[value="3"]');
            if (radioButton) radioButton.checked = true;
            break;
            
        case "multiplechoice":
            // 첫 번째 옵션 선택
            const firstOption = activeQuestion.querySelector('input[type="radio"]');
            if (firstOption) firstOption.checked = true;
            break;
            
        case "checkbox":
            // 첫 번째 옵션 선택
            const firstCheckbox = activeQuestion.querySelector('input[type="checkbox"]');
            if (firstCheckbox) firstCheckbox.checked = true;
            break;
            
        case "textarea":
            // 텍스트 입력
            const textarea = activeQuestion.querySelector('textarea');
            if (textarea) textarea.value = "Auto-generated response";
            break;
    }
}

/**
 * 유효성 검사 없이 다음 질문으로 강제 이동
 */
function forceNextQuestion() {
    // 현재 질문 응답 저장
    saveCurrentAnswer();
    
    // 다음 질문으로 이동
    currentQuestionIndex++;
    startTime = Date.now();
    
    // 실험이 끝났는지 확인
    if (currentQuestionIndex >= questionList.length) {
        showSubmitButton();
        return;
    }
    
    // 새로운 질문 업데이트
    updateQuestion();
    updateFrame();
    
    console.log("Forced to next question:", currentQuestionIndex);
}

/**
 * 모든 질문을 건너뛰고 종료 화면으로 이동
 */
function skipToEnd() {
    currentQuestionIndex = questionList.length - 1;
    showSubmitButton();
    console.log("Skipped to end");
}