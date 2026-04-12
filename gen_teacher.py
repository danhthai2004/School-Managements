import pandas as pd
import random

# Hàm xóa dấu để tạo Email
def remove_accents(s):
    accents = {
        'a': 'áàảãạăắằẳẵặâấầẩẫậ', 'd': 'đ', 'e': 'éèẻẽẹêếềểễệ',
        'i': 'íìỉĩị', 'o': 'óòỏõọôốồổỗộơớờởỡợ', 'u': 'úùủũụưứừửữự', 'y': 'ýỳỷỹỵ',
        'A': 'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ', 'D': 'Đ', 'E': 'ÉÈẺẼẸÊẾỀỂỄỆ',
        'I': 'ÍÌỈĨỊ', 'O': 'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ', 'U': 'ÚÙỦŨỤƯỨỪỬỮỰ', 'Y': 'ÝỲỶỸỴ'
    }
    for r, chars in accents.items():
        for char in chars:
            s = s.replace(char, r)
    return s

# Danh sách môn học
subjects = [
    "Toán", "Ngữ văn", "Ngoại ngữ 1 (Tiếng Anh)", "Vật lý", "Hóa học", 
    "Sinh học", "Lịch sử", "Địa lý", "Tin học", "Giáo dục kinh tế và pháp luật",
    "Giáo dục thể chất", "Âm nhạc", "Mỹ thuật", "Công nghệ (Công nghiệp)", 
    "Công nghệ (Nông nghiệp)", "Giáo dục quốc phòng và an ninh", "Hoạt động trải nghiệm, hướng nghiệp"
]

degrees = ["Cử nhân", "Thạc sĩ", "Tiến sĩ"]
vietnam_map = {
    "Hà Nội": ["Quận Cầu Giấy", "Quận Ba Đình", "Quận Đống Đa"],
    "TP. Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận Bình Thạnh"],
    "Đà Nẵng": ["Quận Hải Châu", "Quận Sơn Trà"]
}

ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi"]
dem_nam = ["Văn", "Minh", "Quốc", "Đình", "Thành"]
ten_nam = ["Hùng", "Tuấn", "Dũng", "Sơn", "Trung", "Kiên", "Hoàng"]
dem_nu = ["Thị", "Ngọc", "Thùy", "Hồng", "Mai"]
ten_nu = ["Lan", "Hoa", "Linh", "Hà", "Phương", "Mai", "Trang"]

def generate_name(gender):
    h = random.choice(ho)
    d = random.choice(dem_nam if gender == "Nam" else dem_nu)
    t = random.choice(ten_nam if gender == "Nam" else ten_nu)
    return f"{h} {d} {t}"

data = []
print("--- Đang sinh dữ liệu 40 Giáo viên ---")

for i in range(40):
    gender = random.choice(["Nam", "Nữ"])
    name = generate_name(gender)
    
    # Giáo viên thường từ 25 - 55 tuổi
    birth_year = random.randint(1970, 2000)
    birthday = f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/{birth_year}"
    
    email = f"{remove_accents(name).lower().replace(' ', '')}{random.randint(10, 99)}@gmail.com"
    phone = random.choice(['090', '091', '098', '035']) + ''.join([str(random.randint(0, 9)) for _ in range(7)])
    
    # Phân bổ môn học xoay vòng để môn nào cũng có giáo viên
    subject = subjects[i % len(subjects)]
    
    province = random.choice(list(vietnam_map.keys()))
    district = random.choice(vietnam_map[province])

    data.append({
        "Họ tên": name,
        "Ngày sinh": birthday,
        "Giới tính": gender,
        "Email": email,
        "Số điện thoại": phone,
        "Chuyên môn": subject,
        "Bằng cấp": random.choice(degrees),
        "Địa chỉ": f"{district}, {province}"
    })

df = pd.DataFrame(data)
df.to_excel("danh_sach_40_giao_vien.xlsx", index=False)
print("--- THÀNH CÔNG! Đã tạo file danh_sach_40_giao_vien.xlsx ---")