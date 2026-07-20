---
title: "Clean Up"
date: 2026-07-13
weight: 13
chapter: false
pre: " <b> 5.13 </b> "
---

#### Giới thiệu

Chương cuối cùng hướng dẫn dọn dẹp toàn bộ tài nguyên AWS đã tạo trong suốt workshop, tránh phát sinh chi phí ngoài ý muốn sau khi hoàn thành thực hành. Thứ tự xoá cần tuân theo chiều ngược lại với thứ tự tạo, do các tài nguyên phụ thuộc lẫn nhau (ví dụ không thể xoá VPC khi còn Subnet đang được sử dụng).

#### Mục tiêu

- Xoá toàn bộ tài nguyên theo đúng thứ tự phụ thuộc, không để sót tài nguyên tính phí (NAT Gateway, RDS, ElastiCache, VPC Endpoint Interface).
- Xác nhận tài khoản AWS không còn phát sinh chi phí từ workshop sau khi dọn dẹp.

#### Các bước thực hiện

**Bước 1 - Xoá CI/CD**

```bash
aws codepipeline delete-pipeline --name officems-pipeline
aws deploy delete-deployment-group --application-name officems-backend-app --deployment-group-name officems-backend-dg
aws deploy delete-application --application-name officems-backend-app
aws codebuild delete-project --name officems-backend-build
aws codebuild delete-project --name officems-frontend-build
aws codestar-connections delete-connection --connection-arn <connection-arn>
```

**Bước 2 - Xoá Monitoring**

```bash
aws cloudwatch delete-alarms --alarm-names officems-high-cpu officems-alb-unhealthy-targets officems-rds-high-cpu officems-rds-low-storage
aws cloudwatch delete-dashboards --dashboard-names officems-overview
aws sns delete-topic --topic-arn <sns-topic-arn>
```

**Bước 3 - Xoá Secrets Manager**

```bash
aws secretsmanager delete-secret --secret-id officems/redis --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id officems/payment-api-key --force-delete-without-recovery
# Secret officems/rds sẽ tự động bị xoá khi xoá RDS instance ở Bước 6
```

**Bước 4 - Xoá Serverless (Lambda, API Gateway)**

```bash
aws apigatewayv2 delete-api --api-id <api-id>
aws lambda delete-function --function-name officems-payments-fn
aws lambda delete-function --function-name officems-doc-processor-fn
```

**Bước 5 - Xoá Backend (Auto Scaling Group, ALB, Launch Template)**

```bash
aws autoscaling update-auto-scaling-group --auto-scaling-group-name officems-asg-backend --min-size 0 --desired-capacity 0
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name officems-asg-backend --force-delete
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn>
aws elbv2 delete-target-group --target-group-arn <tg-arn>
aws ec2 delete-launch-template --launch-template-name officems-lt-backend
```

Chờ ASG và ALB xoá hoàn tất (kiểm tra qua `describe-auto-scaling-groups` / `describe-load-balancers`) trước khi tiếp tục.

**Bước 6 - Xoá Database**

```bash
aws rds delete-db-instance --db-instance-identifier officems-mysql --skip-final-snapshot
aws rds wait db-instance-deleted --db-instance-identifier officems-mysql
aws rds delete-db-subnet-group --db-subnet-group-name officems-db-subnet-group

aws elasticache delete-cache-cluster --cache-cluster-id officems-redis
aws elasticache delete-cache-subnet-group --cache-subnet-group-name officems-redis-subnet-group

aws dynamodb delete-table --table-name officems-audit-logs
```

{{% notice warning %}}
`--skip-final-snapshot` sẽ xoá vĩnh viễn dữ liệu RDS mà không lưu snapshot. Trong môi trường thực tế, hãy cân nhắc tạo Final Snapshot trước khi xoá nếu dữ liệu còn giá trị tham khảo.
{{% /notice %}}

**Bước 7 - Xoá Frontend (S3, CloudFront, Route 53, WAF)**

```bash
aws s3 rm s3://officems-frontend-<unique-suffix> --recursive
aws s3api delete-bucket --bucket officems-frontend-<unique-suffix>

aws s3 rm s3://officems-documents-<unique-suffix> --recursive
aws s3api delete-bucket --bucket officems-documents-<unique-suffix>

# CloudFront: phải Disable trước, chờ Deployed, rồi mới Delete
aws cloudfront get-distribution-config --id <distribution-id> > dist-config.json
# Sửa "Enabled": false trong dist-config.json trước khi update
aws cloudfront update-distribution --id <distribution-id> --distribution-config file://dist-config.json --if-match <etag>
aws cloudfront wait distribution-deployed --id <distribution-id>
aws cloudfront delete-distribution --id <distribution-id> --if-match <new-etag>

aws wafv2 delete-web-acl --name officems-waf --scope CLOUDFRONT --id <web-acl-id> --lock-token <lock-token>

aws route53 change-resource-record-sets --hosted-zone-id <hosted-zone-id> --change-batch '{
  "Changes": [{"Action": "DELETE", "ResourceRecordSet": {"Name": "officems.example.com", "Type": "A", "AliasTarget": {"HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "<cloudfront-domain-name>", "EvaluateTargetHealth": false}}}]
}'
```

**Bước 8 - Xoá chứng chỉ ACM**

```bash
aws acm delete-certificate --certificate-arn <acm-regional-cert-arn> --region ap-southeast-1
aws acm delete-certificate --certificate-arn <acm-cloudfront-cert-arn> --region us-east-1
```

**Bước 9 - Xoá VPC Endpoints, NAT Gateway, Elastic IP**

```bash
aws ec2 delete-vpc-endpoints --vpc-endpoint-ids <s3-endpoint-id> <dynamodb-endpoint-id> <secretsmanager-endpoint-id>

aws ec2 delete-nat-gateway --nat-gateway-id <nat-1a-id>
aws ec2 delete-nat-gateway --nat-gateway-id <nat-1b-id>
aws ec2 wait nat-gateway-deleted --nat-gateway-ids <nat-1a-id> <nat-1b-id>

aws ec2 release-address --allocation-id <eip-nat1-allocation-id>
aws ec2 release-address --allocation-id <eip-nat2-allocation-id>
```

**Bước 10 - Xoá Networking (Route Table, Subnet, Internet Gateway, VPC) và Security**

```bash
aws ec2 disassociate-route-table --association-id <rt-association-id>
aws ec2 delete-route-table --route-table-id <rt-public-id>
aws ec2 delete-route-table --route-table-id <rt-private-1a-id>
aws ec2 delete-route-table --route-table-id <rt-private-1b-id>

aws ec2 delete-subnet --subnet-id <public-subnet-1a-id>
aws ec2 delete-subnet --subnet-id <public-subnet-1b-id>
aws ec2 delete-subnet --subnet-id <private-subnet-1a-id>
aws ec2 delete-subnet --subnet-id <private-subnet-1b-id>

aws ec2 detach-internet-gateway --internet-gateway-id <igw-id> --vpc-id <vpc-id>
aws ec2 delete-internet-gateway --internet-gateway-id <igw-id>

aws ec2 delete-security-group --group-id <sg-backend-id>
aws ec2 delete-security-group --group-id <sg-rds-id>
aws ec2 delete-security-group --group-id <sg-redis-id>
aws ec2 delete-security-group --group-id <sg-alb-id>

aws ec2 delete-vpc --vpc-id <vpc-id>
```

**Bước 11 - Xoá Cognito, IAM Role**

```bash
aws cognito-idp delete-user-pool --user-pool-id <user-pool-id>
aws cognito-identity delete-identity-pool --identity-pool-id <identity-pool-id>

aws iam remove-role-from-instance-profile --instance-profile-name officems-ec2-profile --role-name officems-ec2-role
aws iam delete-instance-profile --instance-profile-name officems-ec2-profile
aws iam detach-role-policy --role-name officems-ec2-role --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
aws iam delete-role-policy --role-name officems-ec2-role --policy-name officems-secrets-read
aws iam delete-role --role-name officems-ec2-role
aws iam delete-role --role-name officems-lambda-role
aws iam delete-role --role-name officems-codebuild-role
aws iam delete-role --role-name officems-codedeploy-role
aws iam delete-role --role-name officems-codepipeline-role
```

**Bước 12 - Xoá Budget và Key Pair**

```bash
aws budgets delete-budget --account-id <account-id> --budget-name officems-monthly-budget
aws ec2 delete-key-pair --key-name officems-keypair
rm -f officems-keypair.pem
```

#### Kiểm tra kết quả

```bash
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=officems-vpc"
aws rds describe-db-instances --db-instance-identifier officems-mysql 2>&1 | grep -i "not found" || echo "Kiểm tra lại RDS"
aws elasticache describe-cache-clusters --cache-cluster-id officems-redis 2>&1 | grep -i "not found" || echo "Kiểm tra lại Redis"
```

Kết quả mong đợi: không còn VPC, RDS instance, hay ElastiCache cluster nào mang tên `officems-*`.

Cuối cùng, vào **AWS Cost Explorer**, lọc theo tag `Project=OfficeMS` trong 24-48 giờ tiếp theo để xác nhận không còn chi phí phát sinh mới.

#### Best Practices

- Luôn dọn dẹp theo đúng thứ tự phụ thuộc: Compute/Application trước, Database sau, Networking cuối cùng.
- Kiểm tra kỹ NAT Gateway, RDS Multi-AZ, và Interface VPC Endpoint - đây là 3 nhóm tài nguyên dễ bị bỏ sót và gây phát sinh chi phí âm thầm nhất.
- Sau khi dọn dẹp, đặt lại AWS Budget về $0 hoặc xoá hẳn nếu không còn sử dụng tài khoản cho mục đích khác.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không xoá được VPC | Còn tài nguyên phụ thuộc (Subnet, Security Group, VPC Endpoint) chưa xoá hết | Chạy lại `describe-network-interfaces --filters Name=vpc-id,Values=<vpc-id>` để tìm ENI còn sót |
| Không xoá được Security Group | Còn rule tham chiếu chéo giữa các Security Group (ví dụ `sg-rds` tham chiếu `sg-backend`) | Xoá rule tham chiếu trước bằng `revoke-security-group-ingress`, sau đó xoá SG |
| CloudFront không xoá được | Distribution chưa chuyển hẳn sang trạng thái Disabled/Deployed | Chờ `aws cloudfront wait distribution-deployed` hoàn tất trước khi gọi `delete-distribution` |

{{% notice tip %}}
Bạn vừa hoàn thành toàn bộ Workshop Triển khai Hệ Thống Quản Lý Cho Thuê Văn Phòng On Cloud - từ hạ tầng mạng, bảo mật, ứng dụng, dữ liệu, serverless, giám sát, CI/CD đến tối ưu chi phí. Chúc mừng bạn đã có một nền tảng thực hành vững chắc để tự thiết kế các hệ thống tương tự trên AWS.
{{% /notice %}}
