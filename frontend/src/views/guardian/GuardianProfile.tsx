import {useEffect} from "react";
import {guardianService} from "../../services/guardianService.ts";

export default function GuardianProfile() {
  useEffect(() => {
    guardianService.getUserProfileInfo()
      .then(data => console.log(data));
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-2xl text-gray-700 font-semibold">
          Chi tiết thông tin cá nhân
        </h1>
        <p className="text-gray-700 mt-4">
          Xem chi tiết thông tin tài khoản người dùng
        </p>
      </div>


      <div className="w-full mt-4 border border-gray-100 rounded-xl p-4 bg-white items-center">
        <div>
          <span className="text-[#3763DD]">Phụ huynh - Nguyễn Quang Minh's Profile</span>
        </div>

        <div className="mt-4 p-4 bg-[#EFF6FF] rounded-xl flex">
          <div className="w-[200px] border border-gray-100 rounded-full overflow-hidden">
            <img src="/images/Default_Male.jpg" alt="Default male avatar"/>
          </div>

          <div className="ml-8">
            <p className="font-semibold text-[1.25rem] mt-4">Phan Thanh C</p>
            <p className="mt-4 text-[1rem] text-gray-500">Phụ huynh em A Lưới</p>
          </div>

          <div className="grid grid-cols-3 gap-4 ml-auto pt-4 pb-4">
            <div>
              <p className="text-[#3763DD] font-medium">Email</p>
              <p className="text-gray-500">phanthanhchung8c8@gmail.com</p>
            </div>
            <div>
              <p className="text-[#3763DD] font-medium">Vai trò</p>
              <p className="text-gray-500">Phụ huynh</p>
            </div>
            <div>
              <p className="text-[#3763DD] font-medium">Quan hệ với học sinh</p>
              <p className="text-gray-500">Cha</p>
            </div>
            <div>
              <p className="text-[#3763DD] font-medium">SĐT</p>
              <p className="text-gray-500">0946314117</p>
            </div>
            <div>
              <p className="text-[#3763DD] font-medium">Giới tính</p>
              <p className="text-gray-500">Nam</p>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="mt-8">
          {/* Header */}
          <div className="flex items-center">
            <h2 className="text-[#3763DD] text-xl font-semibold">
              Thông tin cá nhân
            </h2>

            <button
              className="ml-auto border border-[#3763DD] text-[#3763DD] px-4 py-2 rounded-full flex items-center gap-2 hover:bg-[#3763DD] hover:text-white transition">
              ✏️ Chỉnh sửa
            </button>
          </div>

          {/* Form Grid */}
          <div className="mt-6 grid grid-cols-3 gap-6 w-[90%] ml-8">
            <div>
              <label className="text-[#3763DD] text-sm font-medium">
                Họ và tên
              </label>
              <div>
                <input
                  type="text"
                  value="Phan Thanh C"
                  disabled
                  className="mt-2 w-full max-w-[400px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-[#3763DD] text-sm font-medium">
                Giới tính
              </label>
              <div>
                <input
                  type="text"
                  value="Nam"
                  disabled
                  className="mt-2 w-full max-w-[400px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-[#3763DD] text-sm font-medium">
                Phụ huynh em
              </label>
              <div>
                <input
                  type="text"
                  value="Nguyễn Huyền Trang"
                  disabled
                  className="mt-2 w-full max-w-[400px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-[#3763DD] text-sm font-medium">
                Email
              </label>
              <div>
                <input
                  type="text"
                  value="phanthanhchung8c8@gmail.com"
                  disabled
                  className="mt-2 w-full max-w-[400px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-[#3763DD] text-sm font-medium">
                SĐT
              </label>
              <div>
                <input
                  type="text"
                  value="0946314117"
                  disabled
                  className="mt-2 w-full max-w-[400px] rounded-lg border border-gray-200 bg-gray-100 px-4 py-2"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex mt-8">
            <button className="ml-auto bg-[#3763DD] text-white px-6 py-2 rounded-full hover:bg-blue-700 transition">
              Lưu thông tin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}