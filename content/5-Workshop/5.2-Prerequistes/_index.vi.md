---
title: "Prerequisites"
date: 2026-07-13
weight: 2
chapter: false
pre: " <b> 5.2 </b> "
---

#### Giới thiệu

Trước khi bắt đầu triển khai Hệ Thống Quản Lý Cho Thuê Văn Phòng On Cloud, bạn cần chuẩn bị tài khoản AWS, các công cụ dòng lệnh, và các thông tin cấu hình cơ bản sẽ được sử dụng xuyên suốt workshop.

#### Mục tiêu

- Có một tài khoản AWS hoạt động với quyền IAM đủ để tạo tài nguyên VPC, EC2, RDS, S3, Lambda, CloudFront, IAM, Cognito.
- Cài đặt và cấu hình AWS CLI v2.
- Cài đặt Node.js, Git, và các công cụ hỗ trợ.
- Chuẩn bị domain (tuỳ chọn) để cấu hình Route 53 và ACM.
- Chuẩn bị mã nguồn Frontend (React) và Backend (Node.js/Express) mẫu.

#### Kiến thức đạt được

- Cách tạo IAM User/Role với quyền hạn phù hợp theo nguyên tắc least privilege.
- Cách cấu hình AWS CLI với credentials và region mặc định.
- Cách tổ chức repository GitHub phục vụ CI/CD ở chương sau.

#### Các bước thực hiện

**Bước 1 - Tạo tài khoản AWS và IAM User**

1. Đăng nhập AWS Management Console bằng tài khoản root, bật MFA cho root user.
2. Vào **IAM > Users**, tạo user mới ví dụ `officems-admin` với AWS Management Console access.
3. Gán policy `AdministratorAccess` cho môi trường workshop (trong môi trường production, nên tách nhỏ quyền theo từng dịch vụ).
4. Tạo Access Key cho user này để dùng cho AWS CLI.

**Bước 2 - Cài đặt AWS CLI v2**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Cấu hình CLI với Access Key vừa tạo:

```bash
aws configure
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: ap-southeast-1
Default output format: json
```

**Bước 3 - Cài đặt Node.js, Git**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
git --version
```

**Bước 4 - Tạo Key Pair cho EC2**

```bash
aws ec2 create-key-pair \
  --key-name officems-keypair \
  --query 'KeyMaterial' \
  --output text > officems-keypair.pem
chmod 400 officems-keypair.pem
```

**Bước 5 - Chuẩn bị domain (tuỳ chọn)**

Nếu bạn có sẵn domain (ví dụ mua qua Route 53 hoặc nhà cung cấp khác), ghi lại tên domain, ví dụ `officems.example.com`, để sử dụng ở Chương 5.4 (ACM) và Chương 5.5 (CloudFront/Route 53). Nếu không có domain, bạn vẫn có thể hoàn thành workshop bằng cách sử dụng domain mặc định của CloudFront (`*.cloudfront.net`).

**Bước 6 - Chuẩn bị mã nguồn**

Tạo 2 repository trên GitHub:

- `officems-frontend`: chứa mã nguồn React.
- `officems-backend`: chứa mã nguồn Node.js/Express.

```bash
git clone https://github.com/<your-org>/officems-frontend.git
git clone https://github.com/<your-org>/officems-backend.git
```

{{% notice note %}}
Nếu bạn chưa có sẵn mã nguồn thực tế, có thể dùng mã nguồn mẫu (boilerplate) React + Express để thực hành theo đúng luồng triển khai của workshop.
{{% /notice %}}

**Hình minh họa**

`[Placeholder: prerequisites-checklist.png - Checklist các công cụ và tài khoản cần chuẩn bị]`

#### Kiểm tra kết quả

Chạy các lệnh sau để xác nhận môi trường đã sẵn sàng:

```bash
aws sts get-caller-identity
node -v && npm -v
git --version
```

Kết quả mong đợi: lệnh `aws sts get-caller-identity` trả về đúng Account ID và User ARN vừa tạo, không có lỗi credentials.

#### Best Practices

- Không dùng Access Key của root account cho AWS CLI, luôn tạo IAM User riêng.
- Bật MFA cho tất cả các user có quyền truy cập console.
- Lưu file `.pem` (key pair) ở nơi an toàn, không commit vào Git.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| `aws sts get-caller-identity` báo lỗi `Unable to locate credentials` | Chưa chạy `aws configure` hoặc sai profile | Chạy lại `aws configure`, kiểm tra file `~/.aws/credentials` |
| Không tạo được key pair do trùng tên | Key pair đã tồn tại từ trước | Xoá key cũ bằng `aws ec2 delete-key-pair --key-name officems-keypair` hoặc đổi tên mới |
| Lệnh `node -v` không tìm thấy | NodeSource script chưa cài đúng | Cài lại theo hướng dẫn chính thức tại nodejs.org |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.3 - Create AWS Networking](../5.3-Networking/) để xây dựng hạ tầng mạng VPC cho toàn bộ hệ thống.
