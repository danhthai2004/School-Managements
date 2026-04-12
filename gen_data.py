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

# Dữ liệu hành chính chuẩn (Tỉnh -> Danh sách Quận/Huyện)
vietnam_map = {
    "Hà Nội": ["Quận Cầu Giấy", "Quận Ba Đình", "Quận Đống Đa", "Quận Hai Bà Trưng", "Quận Nam Từ Liêm", "Quận Tây Hồ"],
    "TP. Hồ Chí Minh": ["Quận 1", "Quận 3", "Quận 7", "Quận Bình Thạnh", "Quận Gò Vấp", "Quận Tân Bình", "Thành phố Thủ Đức"],
    "Đà Nẵng": ["Quận Hải Châu", "Quận Thanh Khê", "Quận Liên Chiểu", "Quận Sơn Trà"],
    "Hải Phòng": ["Quận Hồng Bàng", "Quận Ngô Quyền", "Quận Lê Chân", "Quận Hải An"],
    "Cần Thơ": ["Quận Ninh Kiều", "Quận Cái Răng", "Quận Bình Thủy"],
    "Nghệ An": ["Thành phố Vinh", "Huyện Nghi Lộc", "Thị xã Cửa Lò"],
    "Nam Định": ["Thành phố Nam Định", "Huyện Giao Thủy", "Huyện Hải Hậu"],
    "Thanh Hóa": ["Thành phố Thanh Hóa", "Thị xã Sầm Sơn", "Huyện Tĩnh Gia"]
}

ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"]
dem_nam = ["Văn", "Hữu", "Đình", "Minh", "Quốc", "Bảo", "Thành", "Hoàng", "Đức", "Gia", "Xuân", "Công"]
ten_nam = ["Anh", "Bảo", "Cường", "Dương", "Đạt", "Hùng", "Huy", "Khoa", "Long", "Minh", "Nam", "Phong", "Quân", "Sơn", "Tùng", "Tuấn", "Việt"]
dem_nu = ["Thị", "Hồng", "Thùy", "Ngọc", "Mai", "Phương", "Khánh", "Minh", "Thu", "Ánh"]
ten_nu = ["Anh", "Chi", "Diệp", "Giang", "Hà", "Hương", "Linh", "Mai", "Nga", "Nhi", "Oanh", "Phương", "Quỳnh", "Thảo", "Trang", "Yến"]

def generate_name(gender):
    h = random.choice(ho)
    d = random.choice(dem_nam if gender == "Nam" else dem_nu)
    t = random.choice(ten_nam if gender == "Nam" else ten_nu)
    return f"{h} {d} {t}"

def create_gmail(name):
    clean = remove_accents(name).lower().replace(" ", "")
    return f"{clean}{random.randint(100, 9999)}@gmail.com"

def generate_phone():
    prefix = random.choice(['090', '091', '098', '032', '035', '038', '077', '085', '094'])
    return prefix + ''.join([str(random.randint(0, 9)) for _ in range(7)])

data = []
parent_emails = set()

print("Đang khởi tạo 1000 học sinh với địa chỉ chuẩn Việt Nam...")

while len(data) < 1000:
    s_gender = random.choice(["Nam", "Nữ"])
    s_name = generate_name(s_gender)
    p_name = generate_name(random.choice(["Nam", "Nữ"]))
    p_email = create_gmail(p_name)
    
    if p_email in parent_emails: continue
    parent_emails.add(p_email)

    # Chọn địa chỉ chuẩn: Quận phải thuộc Tỉnh đó
    province = random.choice(list(vietnam_map.keys()))
    district = random.choice(vietnam_map[province])
    full_address = f"{district}, {province}"

    # Phân khối và năm sinh chuẩn (năm hiện tại 2026)
    current_idx = len(data)
    if current_idx < 334:
        grade = 10
        birth_year = 2010
    elif current_idx < 667:
        grade = 11
        birth_year = 2009
    else:
        grade = 12
        birth_year = 2008

    data.append({
        "Họ tên": s_name,
        "Khối": grade,
        "Ngày sinh": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/{birth_year}",
        "Giới tính": s_gender,
        "Email": create_gmail(s_name),
        "Số điện thoại": generate_phone(),
        "Địa chỉ": full_address,
        "Nơi sinh": random.choice(list(vietnam_map.keys())),
        "Tổ hợp": random.choice(["Tự nhiên", "Xã hội"]),
        "Tên phụ huynh": p_name,
        "SĐT phụ huynh": generate_phone(),
        "Email phụ huynh": p_email
    })

df = pd.DataFrame(data)
# Lưu 3 file riêng biệt cho mỗi khối để dễ import
for g in [10, 11, 12]:
    df_grade = df[df["Khối"] == g]
    df_grade.to_excel(f"danh_sach_khoi_{g}.xlsx", index=False)

print("--- THÀNH CÔNG! Đã tạo 3 file: danh_sach_khoi_10.xlsx, 11.xlsx, 12.xlsx ---")