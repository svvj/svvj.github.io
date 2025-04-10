import os
import glob
from PIL import Image
import concurrent.futures
import numpy as np

def create_optimized_gif(image_folder, output_path, duration=0.05, resize_factor=1.0, max_frames=100):
    """
    최적화된 GIF 생성 함수
    
    Parameters:
    - image_folder: 이미지가 있는 폴더 경로
    - output_path: 생성될 GIF 파일 경로
    - duration: 각 프레임 간 지연 시간(초)
    - resize_factor: 이미지 크기 축소 비율 (메모리 사용량 감소)
    - max_frames: 최대 프레임 수 (균등하게 샘플링)
    """
    # 폴더 내 이미지 파일 경로 가져오기
    image_files = sorted(glob.glob(os.path.join(image_folder, '*.png')))
    
    if not image_files:
        print(f"경고: {image_folder}에 이미지 파일이 없습니다.")
        return False
    
    # 출력 디렉토리 확인 및 생성
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 이미지 파일 샘플링 (균등 간격으로 max_frames개 선택)
    if len(image_files) > max_frames:
        sampled_indices = np.linspace(0, len(image_files) - 1, max_frames, dtype=int)
        image_files = [image_files[i] for i in sampled_indices]
    
    # PIL을 사용하여 이미지 로드 및 최적화
    frames = []
    for img_file in image_files:
        try:
            img = Image.open(img_file)
            
            # 이미지 크기 축소 (메모리 사용량 감소)
            width, height = img.size
            new_width = int(width * resize_factor)
            new_height = int(height * resize_factor)
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
            # 팔레트 최적화 (GIF 파일 크기 감소)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            
            frames.append(img)
        except Exception as e:
            print(f"이미지 로드 에러 ({img_file}): {e}")
    
    if not frames:
        print(f"경고: {image_folder}에서 로드된 이미지가 없습니다.")
        return False
    
    try:
        # GIF 파일 생성 (PIL 사용)
        frames[0].save(
            output_path,
            format='GIF',
            append_images=frames[1:],
            save_all=True,
            duration=int(duration * 1000),  # 밀리초 단위로 변환
            loop=0,
            optimize=True  # 최적화 옵션 추가
        )
        print(f"GIF 생성 완료: {output_path}")
        return True
    except Exception as e:
        print(f"GIF 생성 에러: {e}")
        return False

def process_folder(args):
    """병렬 처리를 위한 폴더 처리 함수"""
    folder_path, output_path = args
    return create_optimized_gif(folder_path, output_path)

def process_all_folders(base_dir="images", target_folders=["bias", "bias_com", "even"], 
                        output_dir="images/gifs", max_workers=4):
    """
    병렬 처리를 사용하여 모든 폴더 처리
    """
    # 출력 폴더 생성
    os.makedirs(output_dir, exist_ok=True)
    
    tasks = []
    
    # 처리할 모든 폴더와 출력 경로 쌍 준비
    for folder in target_folders:
        folder_path = os.path.join(base_dir, folder)
        
        # 폴더가 존재하는지 확인
        if not os.path.exists(folder_path):
            print(f"경고: 폴더를 찾을 수 없음: {folder_path}")
            continue
        
        # 모든 하위 디렉토리 찾기
        for root, dirs, files in os.walk(folder_path):
            # PNG 파일이 있는지 확인
            if any(f.endswith('.png') for f in files):
                # 상대 경로 계산 (images/bias/... 부분 제거)
                rel_path = os.path.relpath(root, base_dir)
                
                # 경로 구성요소를 밑줄로 연결하여 출력 파일명 생성
                output_filename = rel_path.replace("\\", "/").replace("/", "_") + ".gif"
                output_file_path = os.path.join(output_dir, output_filename)
                
                tasks.append((root, output_file_path))
    
    print(f"총 {len(tasks)}개 폴더 처리 예정")
    
    # 병렬 처리
    successful_gifs = 0
    failed_gifs = 0
    
    with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
        for i, result in enumerate(executor.map(process_folder, tasks)):
            if result:
                successful_gifs += 1
            else:
                failed_gifs += 1
            
            # 진행 상황 표시 (10% 단위)
            progress = (i + 1) / len(tasks) * 100
            if (i + 1) % max(1, len(tasks) // 10) == 0:
                print(f"진행률: {progress:.1f}% ({i + 1}/{len(tasks)})")
    
    print(f"\n처리 완료!")
    print(f"성공적으로 생성된 GIF: {successful_gifs}")
    print(f"실패한 GIF: {failed_gifs}")

if __name__ == "__main__":
    process_all_folders()