---
title: "Secrets Management"
date: 2026-07-13
weight: 9
chapter: false
pre: " <b> 5.9 </b> "
---

#### Giới thiệu

Chương này cấu hình AWS Secrets Manager để bảo vệ các thông tin nhạy cảm của hệ thống, gồm mật khẩu RDS, connection string Redis, và các API key của bên thứ 3 (ví dụ cổng thanh toán), thay vì lưu trực tiếp trong mã nguồn hoặc biến môi trường tĩnh.

#### Mục tiêu

- Xác nhận Secret mật khẩu RDS được Secrets Manager quản lý tự động.
- Tạo thêm Secret cho Redis endpoint và API key bên thứ 3.
- Cập nhật Backend (EC2) và Lambda để đọc secret tại runtime thay vì hardcode.
- Cấu hình Automatic Rotation cho secret RDS.

#### Kiến thức đạt được

- Hiểu sự khác biệt giữa Secrets Manager và Systems Manager Parameter Store.
- Hiểu cơ chế Automatic Rotation giúp giảm rủi ro rò rỉ thông tin đăng nhập lâu dài.
- Hiểu cách IAM Role kiểm soát quyền đọc secret theo nguyên tắc least privilege.

#### Kiến trúc sử dụng

```
EC2 Backend / Lambda (IAM Role có quyền secretsmanager:GetSecretValue)
        │
        ▼
AWS Secrets Manager
   ├── officems/rds        (mật khẩu RDS - tự tạo khi bật manage-master-user-password)
   ├── officems/redis      (endpoint Redis)
   └── officems/payment-api-key  (API key cổng thanh toán bên thứ 3)
```

**Hình minh họa**

`[Placeholder: secrets-manager-list.png - Danh sách Secret trên console Secrets Manager]`

#### Các bước thực hiện

**Bước 1 - Xác nhận Secret RDS**

Vì đã bật `--manage-master-user-password` khi tạo RDS ở Chương 5.7, Secrets Manager đã tự động tạo secret. Kiểm tra:

```bash
aws rds describe-db-instances --db-instance-identifier officems-mysql \
  --query 'DBInstances[0].MasterUserSecret'
```

Ghi lại `SecretArn` trả về.

**Bước 2 - Tạo Secret cho Redis endpoint**

```bash
aws secretsmanager create-secret \
  --name officems/redis \
  --description "Redis connection info" \
  --secret-string '{"host":"<redis-endpoint>","port":"6379"}'
```

**Bước 3 - Tạo Secret cho API key bên thứ 3**

```bash
aws secretsmanager create-secret \
  --name officems/payment-api-key \
  --description "Payment gateway API key" \
  --secret-string '{"apiKey":"<your-payment-gateway-key>"}'
```

**Bước 4 - Cấp quyền đọc Secret cho IAM Role**

Thay vì dùng policy `SecretsManagerReadWrite` (quá rộng) đã gắn tạm ở Chương 5.4, tạo custom policy giới hạn đúng các secret cần thiết:

```bash
aws iam put-role-policy \
  --role-name officems-ec2-role \
  --policy-name officems-secrets-read \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:ap-southeast-1:<account-id>:secret:officems/rds*",
        "arn:aws:secretsmanager:ap-southeast-1:<account-id>:secret:officems/redis*"
      ]
    }]
  }'

aws iam detach-role-policy \
  --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

Tương tự cho `officems-lambda-role` với secret `officems/payment-api-key`.

**Bước 5 - Đọc Secret trong ứng dụng Node.js**

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const client = new SecretsManagerClient({ region: "ap-southeast-1" });

async function getSecret(secretId) {
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  return JSON.parse(response.SecretString);
}

// Sử dụng khi khởi động ứng dụng
const dbSecret = await getSecret("officems/rds");
const dbConfig = {
  host: "<rds-endpoint>",
  user: dbSecret.username,
  password: dbSecret.password,
  database: "officems"
};
```

**Bước 6 - Cấu hình Automatic Rotation cho Secret RDS**

```bash
aws secretsmanager rotate-secret \
  --secret-id officems/rds \
  --rotation-rules AutomaticallyAfterDays=30
```

{{% notice tip %}}
Với secret do RDS tự quản lý (`manage-master-user-password`), AWS cung cấp sẵn Lambda Rotation Function được cấu hình tự động, không cần tự viết Rotation Lambda thủ công.
{{% /notice %}}

**Hình minh họa**

`[Placeholder: secret-rotation-config.png - Cấu hình Automatic Rotation 30 ngày cho secret RDS]`

#### Kiểm tra kết quả

```bash
aws secretsmanager get-secret-value --secret-id officems/redis --query SecretString --output text
```

Kết quả mong đợi: trả về đúng JSON chứa host/port Redis.

Khởi động lại ứng dụng Backend và kiểm tra log để xác nhận không còn hardcode mật khẩu trong biến môi trường hoặc file cấu hình:

```bash
grep -r "password" officems-backend/.env 2>/dev/null
```

Kết quả mong đợi: không tìm thấy giá trị mật khẩu thực tế nào được hardcode.

#### Best Practices

- Không bao giờ commit secret vào Git, kể cả trong file `.env.example` với giá trị mẫu gây nhầm lẫn.
- Luôn giới hạn IAM Policy đọc secret theo đúng ARN cụ thể, tránh dùng wildcard `secretsmanager:*`.
- Bật Automatic Rotation cho mọi secret có vòng đời dài, đặc biệt là mật khẩu database.
- Cache giá trị secret trong bộ nhớ ứng dụng (không gọi API mỗi request) để giảm chi phí và độ trễ, chỉ refresh khi cần.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Lambda/EC2 báo lỗi `AccessDeniedException` khi đọc secret | IAM Role thiếu quyền `secretsmanager:GetSecretValue` cho đúng ARN | Kiểm tra lại `put-role-policy`, đảm bảo Resource ARN khớp |
| Rotation Secret thất bại | VPC endpoint hoặc NAT Gateway không cho phép Rotation Lambda gọi RDS | Kiểm tra Security Group RDS cho phép Rotation Lambda kết nối |
| Ứng dụng chậm khi khởi động | Gọi Secrets Manager nhiều lần không cần thiết | Thêm cơ chế cache secret trong bộ nhớ ứng dụng |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.10 - Monitoring](../5.10-Monitoring/) để thiết lập giám sát toàn diện với CloudWatch và SNS.
