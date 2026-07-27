---
title: "4. Dọn dẹp tài nguyên"
date: 2024-01-01
chapter: false
pre: "<b>4. </b>"
weight: 4
---

## Dọn dẹp tài nguyên

{{% notice warning %}}
**Quan trọng:** Hãy xóa tất cả tài nguyên sau khi hoàn thành workshop để tránh phát sinh chi phí không cần thiết.
{{% /notice %}}

### Thứ tự xóa tài nguyên

Xóa theo thứ tự ngược lại để tránh lỗi dependency:

#### 1. Xóa [Tên tài nguyên 2]

1. Vào **AWS Console** → **[Tên dịch vụ]**
2. Chọn resource cần xóa
3. Nhấn **Delete** và xác nhận

#### 2. Xóa [Tên tài nguyên 1]

1. Vào **AWS Console** → **[Tên dịch vụ]**
2. Chọn resource cần xóa
3. Nhấn **Delete** và xác nhận

### Kiểm tra

Sau khi dọn dẹp, kiểm tra **AWS Billing** để đảm bảo không còn tài nguyên đang chạy.

{{% notice info %}}
Nếu sử dụng AWS CLI, chạy lệnh: `aws resourcegroupstaggingapi get-resources` để liệt kê tài nguyên còn lại.
{{% /notice %}}

---

🎉 **Chúc mừng!** Bạn đã hoàn thành workshop. Hy vọng bạn đã học được những kiến thức hữu ích!
