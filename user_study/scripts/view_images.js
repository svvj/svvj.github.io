let renderMethod = "nerf";
let objectName = "chair";
let num = "1";
let tOut = "100";

let imageData = [];
let renders = [];
let objects = {};
let numbers = {};
let currentRender = '';
let currentObject = '';
let currentNum = '';
let imageCache = {};
let lastCacheCleanTime = Date.now();
let cacheTTL = 1 * 60 * 1000; // 캐시 유효 시간 5분

// 이미지 데이터 로드
document.addEventListener('DOMContentLoaded', function() {
    const renderSelect = document.getElementById('render-select');
    const objectSelect = document.getElementById('object-select');
    const numSelect = document.getElementById('num-select');
    const frameSlider = document.getElementById('frame-slider');
    const currentFrameSpan = document.getElementById('current-frame');
    const imageFrame = document.getElementById('image-frame');
    const loadingOverlay = document.getElementById('loading-overlay');

    // 정보 패널 요소
    const infoRender = document.getElementById('info-render');
    const infoObject = document.getElementById('info-object');
    const infoNum = document.getElementById('info-num');
    const infoPath = document.getElementById('info-path');

    // 현재 선택된 값들을 저장
    let currentRender = '';
    let currentObject = '';
    let currentNum = '';

    let imageData = [];

    // JSON 데이터 로드
    fetch('image_lists.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            imageData = data;
            
            // 중복 제거하여 렌더링 방법 옵션 추출
            const renders = [...new Set(imageData.map(item => item.render))];
            
            // Rendering Method 옵션 로드
            renderSelect.innerHTML = ''; // 기존 옵션 제거
            renders.forEach(render => {
                const option = document.createElement('option');
                option.value = render;
                option.textContent = render;
                renderSelect.appendChild(option);
            });

            // 첫 번째 렌더링 방법 선택
            currentRender = renders[0];
            renderSelect.value = currentRender;
            
            // 객체 옵션 업데이트 (초기 로드이므로 선택값 유지 필요 없음)
            updateObjectOptions(false);
            
            // 초기 이미지 로드
            loadImage();
            
            // 로딩 오버레이 숨기기
            loadingOverlay.style.display = 'none';
        })
        .catch(error => {
            console.error('Error loading image data:', error);
            loadingOverlay.innerHTML = `<div>Error loading data: ${error.message}</div>`;
        });

    // 렌더링 방법 변경 시 객체 옵션 업데이트 (선택값 유지)
    renderSelect.addEventListener('change', function() {
        currentRender = this.value;
        // true를 전달하여 선택값 유지
        updateObjectOptions(true);
    });
    
    // 객체 변경 시 Number 옵션 업데이트 (선택값 유지)
    objectSelect.addEventListener('change', function() {
        currentObject = this.value;
        // true를 전달하여 선택값 유지
        updateNumberOptions(true);
    });
    
    // 프레임 슬라이더 변경 시
    frameSlider.addEventListener('input', function() {
        currentFrameSpan.textContent = this.value;
        loadImage();
    });
    
    // Number 선택 변경 시
    numSelect.addEventListener('change', function() {
        currentNum = this.value;
        loadImage();
    });
    
    // 객체 옵션 업데이트 함수
    function updateObjectOptions(keepSelection) {
        const render = renderSelect.value;
        
        // 선택된 렌더링 방법에 해당하는 객체만 필터링
        const filteredData = imageData.filter(item => item.render === render);
        
        // 중복 제거하여 객체 옵션 추출
        const objects = [...new Set(filteredData.map(item => item.object))];
        
        // 현재 선택된 객체 저장 (있을 경우)
        const previousObjectSelection = keepSelection ? currentObject : null;
        
        // 객체 옵션 로드
        objectSelect.innerHTML = ''; // 기존 옵션 제거
        objects.forEach(object => {
            const option = document.createElement('option');
            option.value = object;
            option.textContent = object;
            objectSelect.appendChild(option);
        });
        
        // 이전에 선택된 객체가 있고 새 목록에도 있으면 유지
        if (previousObjectSelection && objects.includes(previousObjectSelection)) {
            objectSelect.value = previousObjectSelection;
            currentObject = previousObjectSelection;
        } else {
            // 아니면 첫 번째 객체 선택
            currentObject = objects[0];
            objectSelect.value = currentObject;
        }
        
        // Number 옵션 업데이트
        updateNumberOptions(keepSelection);
    }
    
    // Number 옵션 업데이트 함수
    function updateNumberOptions(keepSelection) {
        const render = renderSelect.value;
        const object = objectSelect.value;
        
        // 선택된 렌더링 방법과 객체에 해당하는 Number만 필터링
        const filteredData = imageData.filter(
            item => item.render === render && item.object === object
        );
        
        // Number 값 추출
        const numbers = filteredData.map(item => item.num);
        
        // Number를 숫자로 변환하여 정렬 후 다시 문자열로 변환
        const sortedNumbers = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
        
        // 현재 선택된 Number 저장 (있을 경우)
        const previousNumSelection = keepSelection ? currentNum : null;
        
        // Number 옵션 로드
        numSelect.innerHTML = ''; // 기존 옵션 제거
        sortedNumbers.forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = num;
            numSelect.appendChild(option);
        });
        
        // 이전에 선택된 Number가 있고 새 목록에도 있으면 유지
        if (previousNumSelection && sortedNumbers.includes(previousNumSelection)) {
            numSelect.value = previousNumSelection;
            currentNum = previousNumSelection;
        } else {
            // 아니면 첫 번째 Number 선택
            currentNum = sortedNumbers[0];
            numSelect.value = currentNum;
        }
        
        // 이미지 다시 로드
        loadImage();
    }
    
    // 이미지 로드 함수
    function loadImage() {
        const render = renderSelect.value;
        const object = objectSelect.value;
        const num = numSelect.value;
        const frame = frameSlider.value;
        
        // 정보 패널 업데이트
        infoRender.textContent = render || '-';
        infoObject.textContent = object || '-';
        infoNum.textContent = num || '-';
        
        if (render && object && num) {
            const path = `images/${render}/${object}/N${num}M100/r_${frame}.png`;
            infoPath.textContent = path;
            imageFrame.src = path;
            
            // 이미지 로드 오류 처리
            imageFrame.onerror = function() {
                console.error(`Failed to load image: ${path}`);
                imageFrame.src = 'images/error.png'; // 에러 이미지로 대체
            };
        } else {
            infoPath.textContent = '-';
            imageFrame.src = '';
        }
    }
});

// 캐시 관리 함수
function cleanOldCache() {
    const now = Date.now();
    
    // 5분에 한 번만 캐시 정리 (너무 자주 실행하지 않도록)
    if (now - lastCacheCleanTime < cacheTTL) {
        return;
    }
    
    lastCacheCleanTime = now;
    console.log("Cleaning old cache entries...");
    
    // 현재 시퀀스와 관련 없는 이미지만 캐시에서 제거
    const currentSequence = `${currentRender}/${currentObject}/N${currentNum}M100`;
    
    for (const path in imageCache) {
        if (!path.includes(currentSequence)) {
            delete imageCache[path];
        }
    }
}

// 새로고침 버튼 추가
function addRefreshButton() {
    if (!document.getElementById('refresh-button')) {
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refresh-button';
        refreshButton.textContent = 'Refresh';
        refreshButton.style.position = 'fixed';
        refreshButton.style.top = '10px';
        refreshButton.style.left = '10px';
        refreshButton.style.zIndex = '1000';
        refreshButton.style.padding = '5px 10px';
        refreshButton.style.backgroundColor = '#4CAF50';
        refreshButton.style.color = 'white';
        refreshButton.style.border = 'none';
        refreshButton.style.borderRadius = '4px';
        refreshButton.style.cursor = 'pointer';
        
        refreshButton.addEventListener('click', function() {
            // 캐시를 완전히 비우고 페이지 새로고침
            localStorage.setItem('forceCacheRefresh', 'true');
            location.reload();
        });
        
        document.body.appendChild(refreshButton);
    }
    
    // 강제 새로고침 플래그가 있으면 캐시를 지우고 플래그 제거
    if (localStorage.getItem('forceCacheRefresh') === 'true') {
        clearImageCache();
        localStorage.removeItem('forceCacheRefresh');
    }
}

// 캐시 초기화
function clearImageCache() {
    console.log("Clearing image cache");
    imageCache = {};
}

// 이미지 데이터 처리
function processImageData() {
    // 렌더링 방법 목록 생성
    renders = [...new Set(imageData.map(img => img.render))];
    
    // 오브젝트 목록 생성
    renders.forEach(render => {
        objects[render] = [...new Set(
            imageData.filter(img => img.render === render)
                     .map(img => img.object)
        )];
    });
    
    // 번호 목록 생성
    imageData.forEach(img => {
        const key = `${img.render}-${img.object}`;
        if (!numbers[key]) {
            numbers[key] = [];
        }
        if (!numbers[key].includes(img.num)) {
            numbers[key].push(img.num);
        }
    });
    
    // 초기값 설정 (여기서 설정!)
    if (renders.length > 0) {
        currentRender = renders[0];
        console.log("Initial render set to:", currentRender);
    }
    
    console.log("Processed image data:", { renders, objects, numbers });
}

// 선택기 채우기
function populateSelectors() {
    const renderSelect = document.getElementById('render-select');
    const objectSelect = document.getElementById('object-select');
    const numSelect = document.getElementById('num-select');
    
    console.log("Populating selectors with renders:", renders);
    
    // 렌더링 방법 선택기 채우기
    renderSelect.innerHTML = '';
    renders.forEach(render => {
        const option = document.createElement('option');
        option.value = render;
        option.textContent = render;
        renderSelect.appendChild(option);
    });
    
    // 렌더링 방법 선택기 초기값 설정
    if (currentRender && renders.includes(currentRender)) {
        renderSelect.value = currentRender;
        console.log("Setting initial render select value:", currentRender);
    } else if (renders.length > 0) {
        currentRender = renders[0];
        renderSelect.value = currentRender;
        console.log("Setting default render select value:", currentRender);
    }
    
    // 렌더링 방법 변경 시 오브젝트 선택기 업데이트 - 프레임 유지하도록 수정
    renderSelect.addEventListener('change', () => {
        console.log("Render changed to:", renderSelect.value);
        currentRender = renderSelect.value;
        updateObjectSelector();
        updateNumberSelector();
        
        // 오래된 캐시 정리
        cleanOldCache();
        
        // 현재 프레임 값을 유지하며 이미지 로드
        loadCurrentImage(false);
    });
    
    // 오브젝트 변경 시 번호 선택기 업데이트 - 프레임 유지하도록 수정
    objectSelect.addEventListener('change', () => {
        console.log("Object changed to:", objectSelect.value);
        currentObject = objectSelect.value;
        updateNumberSelector();
        
        // 오래된 캐시 정리
        cleanOldCache();
        
        // 현재 프레임 값을 유지하며 이미지 로드
        loadCurrentImage(false); 
    });
    
    // 번호 변경 시 이미지 로드 - 프레임 유지하도록 수정
    numSelect.addEventListener('change', () => {
        console.log("Number changed to:", numSelect.value);
        currentNum = numSelect.value;
        
        // 오래된 캐시 정리
        cleanOldCache();
        
        // 현재 프레임 값을 유지하며 이미지 로드
        loadCurrentImage(false);
    });
}

// 오브젝트 선택기 업데이트
function updateObjectSelector() {
    const objectSelect = document.getElementById('object-select');
    objectSelect.innerHTML = '';
    
    console.log("Updating object selector for render:", currentRender);
    
    if (currentRender && objects[currentRender]) {
        objects[currentRender].forEach(object => {
            const option = document.createElement('option');
            option.value = object;
            option.textContent = object;
            objectSelect.appendChild(option);
        });
        
        // 가능하면 이전에 선택된 오브젝트를 유지
        const previousObject = currentObject;
        if (previousObject && objects[currentRender].includes(previousObject)) {
            objectSelect.value = previousObject;
            currentObject = previousObject;
            console.log("Keeping previous object:", previousObject);
        } else {
            currentObject = objects[currentRender][0];
            objectSelect.value = currentObject;
            console.log("Setting new object:", currentObject);
        }
    }
}

// 번호 선택기 업데이트
function updateNumberSelector() {
    const numSelect = document.getElementById('num-select');
    numSelect.innerHTML = '';
    
    const key = `${currentRender}-${currentObject}`;
    console.log("Updating number selector for key:", key);
    
    if (numbers[key]) {
        numbers[key].forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = num;
            numSelect.appendChild(option);
        });
        
        // 가능하면 이전에 선택된 번호를 유지
        const previousNum = currentNum;
        if (previousNum && numbers[key].includes(previousNum)) {
            numSelect.value = previousNum;
            currentNum = previousNum;
            console.log("Keeping previous number:", previousNum);
        } else {
            currentNum = numbers[key][0];
            numSelect.value = currentNum;
            console.log("Setting new number:", currentNum);
        }
    } else {
        console.warn("No numbers found for key:", key);
    }
}

// 현재 이미지 로드
function loadCurrentImage(resetFrame = true) {
    if (!currentRender || !currentObject || !currentNum) {
        console.error("Cannot load image: missing selection", { currentRender, currentObject, currentNum });
        return;
    }
    
    console.log("Loading image with:", { currentRender, currentObject, currentNum, resetFrame });
    
    const frameSlider = document.getElementById('frame-slider');
    // 필요한 경우에만 프레임을 리셋
    if (resetFrame) {
        frameSlider.value = 0;
        document.getElementById('current-frame').textContent = "0";
    }
    
    updateFrame();
    
    // 제한된 프리로딩
    preloadFrames();
}

// 이미지 프레임 업데이트
function updateFrame() {
    const frameSlider = document.getElementById('frame-slider');
    const imageFrame = document.getElementById('image-frame');
    
    if (!frameSlider || !imageFrame || !currentRender || !currentObject || !currentNum) {
        console.error("Cannot update frame: missing elements or selections");
        return;
    }
    
    const frame = frameSlider.value;
    document.getElementById('current-frame').textContent = frame;
    
    // 이미지 경로 (캐시 buster 없음)
    const imagePath = `images/${currentRender}/${currentObject}/N${currentNum}M100/r_${frame}.png`;
    
    // 이미지 로드시 에러 핸들링 추가
    imageFrame.onerror = function() {
        console.warn(`Failed to load image: ${imagePath}`);
        
        // 캐시된 이미지가 실패하면 새로운 타임스탬프로 다시 시도
        if (imageCache[imagePath]) {
            delete imageCache[imagePath];
            
            // 캐시 우회 로드 시도
            const retryPath = `${imagePath}?retry=${Date.now()}`;
            console.log("Retrying with cache buster:", retryPath);
            imageFrame.src = retryPath;
        } else {
            imageFrame.src = 'images/not_found.png';
        }
    };
    
    // 이미지 캐시 사용
    if (imageCache[imagePath]) {
        imageFrame.src = imageCache[imagePath].src;
    } else {
        // 브라우저의 기본 캐싱을 활용하기 위해 타임스탬프 없이 로드
        imageFrame.src = imagePath;
        
        // 이미지 캐싱
        const img = new Image();
        img.src = imagePath;
        imageCache[imagePath] = img;
    }
    
    // 정보 패널 업데이트
    updateInfoPanel();
}

// 이미지 프리로딩 (제한적)
function preloadFrames() {
    const currentFrame = parseInt(document.getElementById('frame-slider').value);
    const totalFrames = 200;
    const maxPreload = 10; // 최대 10개 프레임만 프리로드
    
    // 앞으로 5개, 뒤로 5개 프레임만 프리로드
    const framesToPreload = [];
    for (let i = 1; i <= maxPreload/2; i++) {
        // 앞으로 이동
        framesToPreload.push((currentFrame + i) % totalFrames);
        // 뒤로 이동
        framesToPreload.push((currentFrame - i + totalFrames) % totalFrames);
    }
    
    // 실제 프리로드
    framesToPreload.forEach(frame => {
        const imagePath = `images/${currentRender}/${currentObject}/N${currentNum}M100/r_${frame}.png`;
        
        if (!imageCache[imagePath]) {
            const img = new Image();
            img.src = imagePath;
            imageCache[imagePath] = img;
        }
    });
}

// 정보 패널 업데이트
function updateInfoPanel() {
    if (document.getElementById('info-render')) {
        document.getElementById('info-render').textContent = currentRender || '-';
    }
    if (document.getElementById('info-object')) {
        document.getElementById('info-object').textContent = currentObject || '-';
    }
    if (document.getElementById('info-num')) {
        document.getElementById('info-num').textContent = currentNum || '-';
    }
    if (document.getElementById('info-path')) {
        const frame = document.getElementById('frame-slider').value;
        document.getElementById('info-path').textContent = 
            `images/${currentRender}/${currentObject}/N${currentNum}M100/r_${frame}.png`;
    }
}
