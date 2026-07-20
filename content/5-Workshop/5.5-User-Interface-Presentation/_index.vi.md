---
title: "Deploy Frontend"
date: 2026-07-13
weight: 5
chapter: false
pre: " <b> 5.5 </b> "
---

#### Giới thiệu

Chương này triển khai giao diện React tĩnh (Static React Frontend) của hệ thống lên Amazon S3, phân phối toàn cầu qua Amazon CloudFront, bảo vệ bằng AWS WAF đã tạo ở chương trước, và ánh xạ domain qua Amazon Route 53.

#### Mục tiêu

- Build ứng dụng React thành các file tĩnh (HTML/CSS/JS).
- Tạo S3 Bucket lưu trữ static website, cấu hình Bucket Policy chỉ cho phép truy cập qua CloudFront (Origin Access Control).
- Tạo CloudFront Distribution, gắn chứng chỉ ACM và Web ACL WAF.
- Cấu hình Route 53 trỏ domain về CloudFront.

#### Kiến thức đạt được

- Hiểu cách CloudFront kết hợp Origin Access Control (OAC) để bảo vệ S3 Bucket không cho truy cập trực tiếp.
- Hiểu cách cấu hình Cache Behavior và Error Page cho Single Page Application (SPA).
- Hiểu cách Route 53 Alias Record trỏ về CloudFront.

#### Kiến trúc sử dụng

```
Route 53 (officems.example.com)
        │
        ▼
   CloudFront Distribution ── WAF Web ACL
        │ (Origin Access Control)
        ▼
   S3 Bucket (Static Website, Private)
```

**Hình minh họa**

`[Placeholder: frontend-architecture.png - Sơ đồ CloudFront + S3 + Route 53]`
{{< figure src="/images/5-Workshop/5.5-Policy/frontend-architecture.png" title="Frontend delivery architecture" >}}

#### Các bước thực hiện

**Bước 1 - Build ứng dụng React**

```bash
cd officems-frontend
npm install
npm run build
```

Kết quả build nằm trong thư mục `build/` (Create React App) hoặc `dist/` (Vite).

**Bước 2 - Tạo S3 Bucket**

```bash
aws s3api create-bucket \
  --bucket officems-frontend-<unique-suffix> \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-public-access-block \
  --bucket officems-frontend-<unique-suffix> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Bucket được thiết lập private hoàn toàn, chỉ CloudFront (qua OAC) mới có quyền đọc.

**Bước 3 - Upload nội dung build**

```bash
aws s3 sync build/ s3://officems-frontend-<unique-suffix>/ --delete
```

**Bước 4 - Tạo Origin Access Control (OAC) và CloudFront Distribution**

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name=officems-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3
```

Tạo CloudFront Distribution (rút gọn cấu hình chính):

```json
{
  "CallerReference": "officems-2026",
  "Origins": {
    "Items": [{
      "Id": "officems-s3-origin",
      "DomainName": "officems-frontend-<unique-suffix>.s3.ap-southeast-1.amazonaws.com",
      "OriginAccessControlId": "<oac-id>",
      "S3OriginConfig": {"OriginAccessIdentity": ""}
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "officems-s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "CustomErrorResponses": {
    "Items": [
      {"ErrorCode": 403, "ResponseCode": 200, "ResponsePagePath": "/index.html"},
      {"ErrorCode": 404, "ResponseCode": 200, "ResponsePagePath": "/index.html"}
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "<acm-cert-arn-us-east-1>",
    "SSLSupportMethod": "sni-only"
  },
  "WebACLId": "<waf-web-acl-arn>",
  "Enabled": true,
  "DefaultRootObject": "index.html"
}
```

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

Cập nhật lại Bucket Policy để chỉ cho phép CloudFront Distribution vừa tạo:

```bash
aws s3api put-bucket-policy --bucket officems-frontend-<unique-suffix> --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::officems-frontend-<unique-suffix>/*",
    "Condition": {"StringEquals": {"AWS:SourceArn": "arn:aws:cloudfront::<account-id>:distribution/<distribution-id>"}}
  }]
}'
```

{{% notice note %}}
`CustomErrorResponses` trả về `index.html` với mã 200 cho lỗi 403/404 là bắt buộc đối với Single Page Application dùng client-side routing (React Router), để tránh lỗi trắng trang khi refresh sâu (deep link).
{{% /notice %}}

**Bước 5 - Cấu hình Route 53**

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <hosted-zone-id> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "officems.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "<cloudfront-domain-name>",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

`Z2FDTNDATAQYW2` là Hosted Zone ID cố định của CloudFront, dùng cho mọi Alias Record trỏ đến CloudFront.

**Hình minh họa**

`[Placeholder: cloudfront-distribution.png - CloudFront Distribution trạng thái Deployed]`

#### Kiểm tra kết quả

```bash
curl -I https://officems.example.com
```

Kết quả mong đợi: HTTP 200, header `x-cache` xác nhận request được phục vụ qua CloudFront. Truy cập trực tiếp URL S3 Bucket phải trả về lỗi `403 Access Denied`, xác nhận Bucket đã được bảo vệ đúng cách.

#### Best Practices

- Luôn dùng Origin Access Control (OAC) thay cho Origin Access Identity (OAI) đã lỗi thời.
- Bật Cache Invalidation tự động trong pipeline CI/CD mỗi khi deploy bản build mới (sẽ cấu hình ở Chương 5.11).
- Cấu hình Cache-Control header hợp lý cho từng loại file: HTML nên có `no-cache`, các file JS/CSS có hash tên nên cache dài hạn.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Truy cập domain trả về 403 | Bucket Policy chưa cập nhật đúng Distribution ARN | Kiểm tra lại `put-bucket-policy` và `SourceArn` |
| Refresh trang con (ví dụ `/admin/dashboard`) bị lỗi trắng trang | Thiếu Custom Error Response trả về `index.html` | Thêm lại `CustomErrorResponses` cho mã lỗi 403/404 |
| CloudFront không nhận chứng chỉ ACM | Chứng chỉ được tạo sai region | Chứng chỉ cho CloudFront bắt buộc phải ở `us-east-1` |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.6 - Deploy Backend](../5.6-Backend/) để triển khai Backend API trên EC2 Auto Scaling Group.
