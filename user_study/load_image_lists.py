import os
import json

def generate_image_list(images_dir):
    image_list = []
    for root, dirs, files in os.walk(images_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                relative_path = os.path.relpath(os.path.join(root, file), images_dir)
                parts = relative_path.split(os.sep)
                if len(parts) >= 3:
                    render = parts[0]
                    obj = parts[1]
                    num = parts[2].split('N')[1].split('M')[0]
                    # 중복 항목 방지
                    if not any(d['render'] == render and d['object'] == obj and d['num'] == num for d in image_list):
                        image_list.append({
                            "render": render,
                            "object": obj,
                            "num": num
                        })
    return image_list

def save_image_list(image_list, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(image_list, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    images_dir = 'images'  # 이미지 폴더 경로
    output_file = 'image_lists.json'  # 출력 JSON 파일 경로

    image_list = generate_image_list(images_dir)
    save_image_list(image_list, output_file)
    print(f"Image list generated and saved to {output_file}")