---
title: "Build Serverless Services"
date: 2026-07-13
weight: 8
chapter: false
pre: " <b> 5.8 </b> "
---

#### Giới thiệu

Chương này xây dựng các vi dịch vụ Serverless để tách biệt các nghiệp vụ đặc thù - Thanh toán (Payments) và Xử lý tài liệu (Document Processing) - khỏi Backend chính, chạy trên AWS Lambda và được expose qua Amazon API Gateway, bảo vệ bằng Cognito Authorizer.

#### Mục tiêu

- Viết và deploy Lambda function xử lý Payments.
- Viết và deploy Lambda function xử lý tài liệu (Document Processing), kích hoạt khi có file mới upload vào S3.
- Tạo API Gateway (REST hoặc HTTP API) tích hợp với Lambda.
- Gắn Cognito Authorizer để bảo vệ các endpoint.

#### Kiến thức đạt được

- Hiểu mô hình Event-driven của Lambda (API Gateway trigger, S3 trigger).
- Hiểu cách API Gateway tích hợp Cognito User Pool Authorizer để xác thực token JWT.
- Hiểu lợi ích chi phí của Serverless: chỉ tính phí theo số lần gọi và thời gian thực thi, không tốn phí khi idle.

#### Kiến trúc sử dụng

```
React Frontend
     │ (JWT Token từ Cognito)
     ▼
Amazon API Gateway ── Cognito Authorizer
     │
     ├── /payments  ──► Lambda: officems-payments-fn ──► RDS / DynamoDB
     └── /documents ──► Lambda: officems-documents-fn ──► S3

S3 (uploads/) ──event: ObjectCreated──► Lambda: officems-doc-processor-fn ──► DynamoDB (metadata)
```

**Hình minh họa**

`[Placeholder: serverless-architecture.png - Sơ đồ API Gateway + Lambda + Cognito Authorizer]`
{{< figure src="/images/5-Workshop/5.8-Deploy Database/serverless-architecture.png" title="Serverless architecture" >}}

#### Các bước thực hiện

**Bước 1 - Viết Lambda function xử lý Payments**

```javascript
// index.js
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  // Xử lý logic thanh toán (ví dụ gọi cổng thanh toán bên thứ 3)
  // Lưu kết quả giao dịch vào DynamoDB audit log
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "success", transactionId: "TXN-" + Date.now() })
  };
};
```

Đóng gói và deploy:

```bash
cd payments-fn
npm install --production
zip -r function.zip .

aws lambda create-function \
  --function-name officems-payments-fn \
  --runtime nodejs20.x \
  --role arn:aws:iam::<account-id>:role/officems-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --vpc-config SubnetIds=<private-subnet-1a-id>,<private-subnet-1b-id>,SecurityGroupIds=<sg-backend-id> \
  --timeout 15 \
  --memory-size 256
```

{{% notice note %}}
Lambda cần được đặt trong cùng VPC (qua `--vpc-config`) nếu cần truy cập trực tiếp vào RDS/Redis trong Private Subnet.
{{% /notice %}}

**Bước 2 - Viết Lambda function xử lý tài liệu (S3 Trigger)**

```javascript
// index.js
exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    // Xử lý tài liệu: trích xuất metadata, ghi vào DynamoDB
    console.log(`Processing file ${key} from bucket ${bucket}`);
  }
  return { statusCode: 200 };
};
```

```bash
aws lambda create-function \
  --function-name officems-doc-processor-fn \
  --runtime nodejs20.x \
  --role arn:aws:iam::<account-id>:role/officems-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256

aws lambda add-permission \
  --function-name officems-doc-processor-fn \
  --statement-id s3invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::officems-documents-<unique-suffix>

aws s3api put-bucket-notification-configuration \
  --bucket officems-documents-<unique-suffix> \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:ap-southeast-1:<account-id>:function:officems-doc-processor-fn",
      "Events": ["s3:ObjectCreated:*"]
    }]
  }'
```

**Bước 3 - Tạo API Gateway HTTP API**

```bash
aws apigatewayv2 create-api \
  --name officems-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:<account-id>:function:officems-payments-fn
```

Tạo Cognito Authorizer:

```bash
aws apigatewayv2 create-authorizer \
  --api-id <api-id> \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --name officems-cognito-authorizer \
  --jwt-configuration Audience=<cognito-app-client-id>,Issuer=https://cognito-idp.ap-southeast-1.amazonaws.com/<user-pool-id>
```

Tạo Route `/payments` gắn Authorizer:

```bash
aws apigatewayv2 create-integration \
  --api-id <api-id> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-southeast-1:<account-id>:function:officems-payments-fn \
  --payload-format-version 2.0

aws apigatewayv2 create-route \
  --api-id <api-id> \
  --route-key "POST /payments" \
  --target integrations/<integration-id> \
  --authorization-type JWT \
  --authorizer-id <authorizer-id>

aws lambda add-permission \
  --function-name officems-payments-fn \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-1:<account-id>:<api-id>/*/*"
```

**Bước 4 - Deploy Stage**

```bash
aws apigatewayv2 create-stage \
  --api-id <api-id> \
  --stage-name production \
  --auto-deploy
```

**Hình minh họa**

`[Placeholder: apigateway-routes.png - API Gateway Console hiển thị Route /payments với JWT Authorizer]`

#### Kiểm tra kết quả

Gọi thử endpoint không kèm token (kỳ vọng bị từ chối):

```bash
curl -i -X POST https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/production/payments
```

Kết quả mong đợi: HTTP 401 Unauthorized.

Gọi thử với JWT token hợp lệ lấy từ Cognito:

```bash
curl -i -X POST https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/production/payments \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000000, "contractId": 1}'
```

Kết quả mong đợi: HTTP 200 với transactionId trả về.

Upload thử một file vào S3 bucket documents và kiểm tra CloudWatch Logs của `officems-doc-processor-fn` để xác nhận Lambda được kích hoạt.

#### Best Practices

- Tách riêng Lambda function theo từng nghiệp vụ (single responsibility), tránh gộp nhiều logic vào một function.
- Đặt Timeout và Memory phù hợp với khối lượng xử lý thực tế để tối ưu chi phí (Lambda tính phí theo GB-giây).
- Sử dụng Lambda Provisioned Concurrency nếu nghiệp vụ Payments yêu cầu độ trễ khởi động (cold start) thấp và ổn định.
- Luôn validate JWT token qua Cognito Authorizer ở tầng API Gateway, không tự xác thực token trong code Lambda.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| API trả về 401 dù đã gửi token | Token hết hạn hoặc sai Audience/Issuer trong Authorizer | Kiểm tra lại `jwt-configuration`, lấy token mới từ Cognito |
| Lambda không được S3 trigger | Thiếu quyền `lambda:InvokeFunction` cho `s3.amazonaws.com` | Chạy lại `aws lambda add-permission` |
| Lambda timeout khi truy cập RDS | Lambda chưa được đặt trong đúng VPC/Subnet của RDS | Kiểm tra lại `--vpc-config` khi tạo function |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.9 - Secrets Management](../5.9-Secrets/) để quản lý an toàn các thông tin nhạy cảm của hệ thống.
