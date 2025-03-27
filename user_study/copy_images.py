import os
import shutil

SOURCE_DIR = 'C:/Users/wjdtm/Desktop/workspace/svvj.github.io/user_study/gs_results'
DEST_DIR = 'C:/Users/wjdtm/Desktop/workspace/svvj.github.io/user_study/images'

categories = ['bias', 'bias_com', 'even']
objects = ['chair', 'drums', 'tape', 'toy']
directions = ['back', 'front', 'side', 'top']

for category in categories:
    for object in objects:
        src = os.path.join(SOURCE_DIR, category, object)
        # category에 bias가 포함되어 있지 않으면
        if category == 'even':
            # SOURCE_DIR + category + object 에 있는 폴더들에서 test/ours_30000/renders 에 있는 이미지들을 DEST_DIR + category + object + 폴더이름으로 복사
            # direction은 여기서 고려하지 않음
            dest = os.path.join(DEST_DIR, category, object)
            if not os.path.exists(dest):
                os.makedirs(dest)
            
            folder_list = os.listdir(src)
            for folder in folder_list:
                src_path = os.path.join(src, folder, 'test/ours_30000/renders')
                dest_path = os.path.join(dest, folder)
                if not os.path.exists(dest_path):
                    os.makedirs(dest_path)
                for img in os.listdir(src_path):
                    shutil.copy(os.path.join(src_path, img), os.path.join(dest_path, img))
        else:
            for direction in directions:
                dir_path = os.path.join(src, direction)
                folder_list = os.listdir(dir_path)
                for folder in folder_list:
                    if folder == 'cfg_args':
                        continue
                    src_path = os.path.join(dir_path, folder, 'test/ours_30000/renders')
                    dest_path = os.path.join(DEST_DIR, category, object, direction, folder)
                    if not os.path.exists(dest_path):
                        os.makedirs(dest_path)
                    for img in os.listdir(src_path):
                        shutil.copy(os.path.join(src_path, img), os.path.join(dest_path, img))
