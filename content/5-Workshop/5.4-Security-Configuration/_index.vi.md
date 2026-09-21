---
title: "Configure Security"
date: 2026-07-13
weight: 4
chapter: false
pre: " <b> 5.4 </b> "
---

#### Giới thiệu

Chương này cấu hình các lớp bảo mật cho hệ thống, gồm Security Group và NACL bảo vệ tài nguyên mạng, IAM Role phân quyền cho dịch vụ, Amazon Cognito xác thực người dùng, ACM cấp chứng chỉ SSL/TLS và AWS WAF bảo vệ tầng biên trước các cuộc tấn công phổ biến.

#### Mục tiêu

- Tạo các Security Group riêng biệt cho ALB, EC2 Backend, RDS, ElastiCache.
- Cấu hình Network ACL cho Public/Private Subnet.
- Tạo IAM Role cho EC2, Lambda phù hợp nguyên tắc least privilege.
- Tạo Amazon Cognito User Pool và Identity Pool cho Tenant/Admin/Technician.
- Yêu cầu chứng chỉ SSL/TLS bằng ACM.
- Tạo AWS WAF Web ACL bảo vệ CloudFront.

#### Kiến thức đạt được

- Hiểu sự khác biệt giữa Security Group (stateful) và NACL (stateless).
- Hiểu cách Cognito User Pool tích hợp với API Gateway qua Cognito Authorizer.
- Hiểu cách ACM cấp và gia hạn chứng chỉ tự động cho CloudFront/ALB.
- Hiểu các rule cơ bản của WAF (Rate-based rule, SQL Injection, XSS).

#### Kiến trúc sử dụng

```
Internet
   │
  WAF (gắn CloudFront)
   │
CloudFront ── ACM cert (us-east-1)
   │
   ▼
   ALB (Security Group: sg-alb) ── ACM cert (regional)
   │
   ▼
EC2 Backend (Security Group: sg-backend, chỉ nhận traffic từ sg-alb)
   │
   ▼
RDS (Security Group: sg-rds, chỉ nhận traffic từ sg-backend)
ElastiCache (Security Group: sg-redis, chỉ nhận traffic từ sg-backend)

Cognito User Pool ── API Gateway (Cognito Authorizer) ── Lambda
```

**Hình minh họa**

`[Placeholder: security-layers.png - Sơ đồ các lớp bảo mật từ WAF đến Database]`
{{< figure src="/images/5-Workshop/5.4-S3-onprem/security-layers.png" title="Security layers diagram" >}}

#### Các bước thực hiện

**Bước 1 - Tạo Security Group**

```bash
# SG cho ALB - nhận traffic HTTPS từ Internet
aws ec2 create-security-group --group-name officems-sg-alb \
  --description "ALB Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-alb-id> \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <sg-alb-id> \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# SG cho EC2 Backend - chỉ nhận traffic từ ALB, port 3000
aws ec2 create-security-group --group-name officems-sg-backend \
  --description "Backend EC2 Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-backend-id> \
  --protocol tcp --port 3000 --source-group <sg-alb-id>

# SG cho RDS - chỉ nhận traffic từ Backend, port 3306
aws ec2 create-security-group --group-name officems-sg-rds \
  --description "RDS Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-rds-id> \
  --protocol tcp --port 3306 --source-group <sg-backend-id>

# SG cho ElastiCache Redis - chỉ nhận traffic từ Backend, port 6379
aws ec2 create-security-group --group-name officems-sg-redis \
  --description "Redis Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-redis-id> \
  --protocol tcp --port 6379 --source-group <sg-backend-id>
```

**Bước 2 - Cấu hình Network ACL**

```bash
aws ec2 create-network-acl --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=officems-nacl-private}]'

# Cho phép traffic nội bộ VPC
aws ec2 create-network-acl-entry --network-acl-id <nacl-id> \
  --rule-number 100 --protocol -1 --cidr-block 10.0.0.0/16 \
  --rule-action allow --ingress

# Cho phép traffic outbound (ephemeral ports) trả về từ NAT Gateway
aws ec2 create-network-acl-entry --network-acl-id <nacl-id> \
  --rule-number 110 --protocol tcp --port-range From=1024,To=65535 \
  --cidr-block 0.0.0.0/0 --rule-action allow --ingress

aws ec2 associate-network-acl \
  --network-acl-id <nacl-id> --subnet-id <private-subnet-1a-id>
aws ec2 associate-network-acl \
  --network-acl-id <nacl-id> --subnet-id <private-subnet-1b-id>
```

**Bước 3 - Tạo IAM Role cho EC2 và Lambda**

Role cho EC2 Backend (đọc Secrets Manager, ghi log CloudWatch):

```bash
aws iam create-role --role-name officems-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": {"Service": "ec2.amazonaws.com"}, "Action": "sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
aws iam attach-role-policy --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

aws iam create-instance-profile --instance-profile-name officems-ec2-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name officems-ec2-profile --role-name officems-ec2-role
```

Role cho Lambda (Payments, Document Processing):

```bash
aws iam create-role --role-name officems-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

{{% notice warning %}}
Trong môi trường production, không nên dùng các managed policy `FullAccess`. Hãy viết custom policy giới hạn đúng resource ARN cần thiết.
{{% /notice %}}

**Bước 4 - Tạo Amazon Cognito User Pool**

```bash
aws cognito-idp create-user-pool \
  --pool-name officems-user-pool \
  --auto-verified-attributes email \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireNumbers":true,"RequireSymbols":true}}'
```

Tạo Group phân quyền theo vai trò:

```bash
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Tenant
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Admin
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Technician
```

Tạo App Client và Identity Pool:

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <user-pool-id> --client-name officems-web-client \
  --no-generate-secret --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH

aws cognito-identity create-identity-pool \
  --identity-pool-name officems_identity_pool \
  --allow-unauthenticated-identities \
  --cognito-identity-providers ProviderName=cognito-idp.ap-southeast-1.amazonaws.com/<user-pool-id>,ClientId=<app-client-id>
```

**Bước 5 - Yêu cầu chứng chỉ SSL/TLS bằng ACM**

```bash
# Chứng chỉ cho ALB (regional - ap-southeast-1)
aws acm request-certificate \
  --domain-name api.officems.example.com \
  --validation-method DNS \
  --region ap-southeast-1

# Chứng chỉ cho CloudFront (bắt buộc tạo tại us-east-1)
aws acm request-certificate \
  --domain-name officems.example.com \
  --validation-method DNS \
  --region us-east-1
```

Thêm CNAME record xác thực domain vào Route 53 theo hướng dẫn trả về từ `describe-certificate`, sau đó chờ trạng thái chuyển thành `ISSUED`.

**Bước 6 - Tạo AWS WAF Web ACL**

```bash
aws wafv2 create-web-acl \
  --name officems-waf \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=officemsWaf \
  --rules '[
    {
      "Name": "AWS-AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "OverrideAction": {"None": {}},
      "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesCommonRuleSet"}},
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "commonRules"}
    },
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Action": {"Block": {}},
      "Statement": {"RateBasedStatement": {"Limit": 2000, "AggregateKeyType": "IP"}},
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "rateLimit"}
    }
  ]'
```

**Hình minh họa**

`[Placeholder: cognito-waf-setup.png - Cấu hình Cognito User Pool và WAF Web ACL trên console]`

#### Kiểm tra kết quả

- Trong **EC2 > Security Groups**, xác nhận 4 Security Group đã tạo đúng rule inbound theo chuỗi ALB → Backend → RDS/Redis.
- Trong **Cognito > User Pools**, xác nhận User Pool `officems-user-pool` có 3 Group: Tenant, Admin, Technician.
- Trong **ACM**, xác nhận cả 2 chứng chỉ đã chuyển trạng thái `Issued`.
- Trong **WAF & Shield**, xác nhận Web ACL `officems-waf` đã có 2 rule active.

#### Best Practices

- Luôn tham chiếu Security Group bằng `source-group` thay vì CIDR nội bộ để tự động cập nhật khi IP EC2 thay đổi.
- Áp dụng nguyên tắc least privilege cho mọi IAM Role, tránh gắn các policy `FullAccess` trong môi trường production.
- Bật MFA bắt buộc (`AdminSetUserMFAPreference`) cho nhóm Admin trong Cognito.
- Luôn tạo chứng chỉ ACM cho CloudFront tại region `us-east-1`, bất kể workload chạy ở region nào.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Chứng chỉ ACM ở trạng thái `Pending Validation` mãi không chuyển | CNAME record DNS validation chưa được thêm hoặc chưa propagate | Kiểm tra lại Route 53, dùng `dig` để xác nhận CNAME đã trỏ đúng |
| EC2 Backend không kết nối được RDS | Security Group RDS chưa mở port 3306 cho `sg-backend` | Kiểm tra lại rule inbound của `sg-rds` |
| WAF không chặn được traffic tấn công | Web ACL chưa được associate với CloudFront distribution | Gắn Web ACL vào CloudFront ở Chương 5.5 |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.5 - Deploy Frontend](../5.5-User-Interface-Presentation/) để triển khai giao diện React lên Amazon S3 và phân phối qua CloudFront.
