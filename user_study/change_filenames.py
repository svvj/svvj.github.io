import os
import sys

T_out = 100
objects = ["chair", "drums", "ficus", "hotdog", "lego", "materials", "mic", "ship"]
file_path = "images\\3dgs"
for obj in objects:
    obj_path = os.path.join(file_path, obj)
    if not os.path.exists(obj_path):
        print(obj_path, "does not exist")
        continue
    else:
        print("Processing", obj)
    # N{num}M{T_out}
    for num in range(1, 101):
        img_path = os.path.join(obj_path, f"N{num}M{T_out}")
        if not os.path.exists(img_path):
            print(img_path, "does not exist")
            continue
        else:
            print("Processing", img_path)
        for img in os.listdir(img_path):
            if img.endswith(".png"):
                if img.startswith("r_"):
                    continue
                img_num = int(img.split(".")[0])
                new_name = f"r_{img_num}.png"
                os.rename(os.path.join(img_path, img), os.path.join(img_path, new_name))
