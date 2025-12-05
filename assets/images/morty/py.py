from PIL import Image
import os

# Папки
input_dir = "./"
output_dir = "./"

# Создаем зеркальные right текстуры
for i in range(1, 5):
    input_path = f"{input_dir}side_{i}.png"
    output_path = f"{output_dir}right_{i}.png"
    
    if os.path.exists(input_path):
        # Открываем и зеркалим
        img = Image.open(input_path)
        mirrored = img.transpose(Image.FLIP_LEFT_RIGHT)
        mirrored.save(output_path)
    else:

