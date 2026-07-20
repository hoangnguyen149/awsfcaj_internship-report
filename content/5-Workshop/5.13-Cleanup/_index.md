---
title: "Clean Up"
date: 2026-07-13
weight: 13
chapter: false
pre: " <b> 5.13 </b> "
---

#### Introduction

This final chapter walks through cleaning up all the AWS resources created throughout the workshop, to avoid any unwanted charges after finishing your hands-on practice. Resources must be deleted in the reverse order they were created, since many depend on each other (for example, you can't delete a VPC while a Subnet still in use exists inside it).

#### Objectives

- Delete every resource in the correct dependency order, without leaving behind anything that still incurs charges (NAT Gateway, RDS, ElastiCache, Interface VPC Endpoint).
- Confirm the AWS account no longer incurs any workshop-related charges after cleanup.

#### Steps

**Step 1 - Delete CI/CD resources**

```bash
aws codepipeline delete-pipeline --name officems-pipeline
aws deploy delete-deployment-group --application-name officems-backend-app --deployment-group-name officems-backend-dg
aws deploy delete-application --application-name officems-backend-app
aws codebuild delete-project --name officems-backend-build
aws codebuild delete-project --name officems-frontend-build
aws codestar-connections delete-connection --connection-arn <connection-arn>
```

**Step 2 - Delete Monitoring resources**

```bash
aws cloudwatch delete-alarms --alarm-names officems-high-cpu officems-alb-unhealthy-targets officems-rds-high-cpu officems-rds-low-storage
aws cloudwatch delete-dashboards --dashboard-names officems-overview
aws sns delete-topic --topic-arn <sns-topic-arn>
```

**Step 3 - Delete Secrets Manager resources**

```bash
aws secretsmanager delete-secret --secret-id officems/redis --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id officems/payment-api-key --force-delete-without-recovery
# The officems/rds secret is automatically deleted when the RDS instance is deleted in Step 6
```

**Step 4 - Delete Serverless resources (Lambda, API Gateway)**

```bash
aws apigatewayv2 delete-api --api-id <api-id>
aws lambda delete-function --function-name officems-payments-fn
aws lambda delete-function --function-name officems-doc-processor-fn
```

**Step 5 - Delete the Backend (Auto Scaling Group, ALB, Launch Template)**

```bash
aws autoscaling update-auto-scaling-group --auto-scaling-group-name officems-asg-backend --min-size 0 --desired-capacity 0
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name officems-asg-backend --force-delete
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn>
aws elbv2 delete-target-group --target-group-arn <tg-arn>
aws ec2 delete-launch-template --launch-template-name officems-lt-backend
```

Wait for the ASG and ALB deletion to complete (check with `describe-auto-scaling-groups` / `describe-load-balancers`) before continuing.

**Step 6 - Delete the Database**

```bash
aws rds delete-db-instance --db-instance-identifier officems-mysql --skip-final-snapshot
aws rds wait db-instance-deleted --db-instance-identifier officems-mysql
aws rds delete-db-subnet-group --db-subnet-group-name officems-db-subnet-group

aws elasticache delete-cache-cluster --cache-cluster-id officems-redis
aws elasticache delete-cache-subnet-group --cache-subnet-group-name officems-redis-subnet-group

aws dynamodb delete-table --table-name officems-audit-logs
```

{{% notice warning %}}
`--skip-final-snapshot` permanently deletes the RDS data without saving a snapshot. In a real-world environment, consider taking a Final Snapshot before deleting if the data still has reference value.
{{% /notice %}}

**Step 7 - Delete the Frontend (S3, CloudFront, Route 53, WAF)**

```bash
aws s3 rm s3://officems-frontend-<unique-suffix> --recursive
aws s3api delete-bucket --bucket officems-frontend-<unique-suffix>

aws s3 rm s3://officems-documents-<unique-suffix> --recursive
aws s3api delete-bucket --bucket officems-documents-<unique-suffix>

# CloudFront: must be Disabled first, then wait for Deployed, before deleting
aws cloudfront get-distribution-config --id <distribution-id> > dist-config.json
# Edit "Enabled": false in dist-config.json before updating
aws cloudfront update-distribution --id <distribution-id> --distribution-config file://dist-config.json --if-match <etag>
aws cloudfront wait distribution-deployed --id <distribution-id>
aws cloudfront delete-distribution --id <distribution-id> --if-match <new-etag>

aws wafv2 delete-web-acl --name officems-waf --scope CLOUDFRONT --id <web-acl-id> --lock-token <lock-token>

aws route53 change-resource-record-sets --hosted-zone-id <hosted-zone-id> --change-batch '{
  "Changes": [{"Action": "DELETE", "ResourceRecordSet": {"Name": "officems.example.com", "Type": "A", "AliasTarget": {"HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "<cloudfront-domain-name>", "EvaluateTargetHealth": false}}}]
}'
```

**Step 8 - Delete the ACM certificates**

```bash
aws acm delete-certificate --certificate-arn <acm-regional-cert-arn> --region ap-southeast-1
aws acm delete-certificate --certificate-arn <acm-cloudfront-cert-arn> --region us-east-1
```

**Step 9 - Delete VPC Endpoints, NAT Gateways, and Elastic IPs**

```bash
aws ec2 delete-vpc-endpoints --vpc-endpoint-ids <s3-endpoint-id> <dynamodb-endpoint-id> <secretsmanager-endpoint-id>

aws ec2 delete-nat-gateway --nat-gateway-id <nat-1a-id>
aws ec2 delete-nat-gateway --nat-gateway-id <nat-1b-id>
aws ec2 wait nat-gateway-deleted --nat-gateway-ids <nat-1a-id> <nat-1b-id>

aws ec2 release-address --allocation-id <eip-nat1-allocation-id>
aws ec2 release-address --allocation-id <eip-nat2-allocation-id>
```

**Step 10 - Delete Networking (Route Tables, Subnets, Internet Gateway, VPC) and Security resources**

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

**Step 11 - Delete Cognito and IAM Role resources**

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

**Step 12 - Delete the Budget and Key Pair**

```bash
aws budgets delete-budget --account-id <account-id> --budget-name officems-monthly-budget
aws ec2 delete-key-pair --key-name officems-keypair
rm -f officems-keypair.pem
```

#### Verify the Result

```bash
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=officems-vpc"
aws rds describe-db-instances --db-instance-identifier officems-mysql 2>&1 | grep -i "not found" || echo "Please check RDS again"
aws elasticache describe-cache-clusters --cache-cluster-id officems-redis 2>&1 | grep -i "not found" || echo "Please check Redis again"
```

Expected result: no VPC, RDS instance, or ElastiCache cluster named `officems-*` remains.

Finally, go to **AWS Cost Explorer**, filter by the `Project=OfficeMS` tag over the next 24-48 hours, to confirm no new charges are being incurred.

#### Best Practices

- Always clean up in the correct dependency order: Compute/Application first, Database next, and Networking last.
- Pay close attention to the NAT Gateway, RDS Multi-AZ, and Interface VPC Endpoint - these are the three resource groups most commonly overlooked, and the ones most likely to keep silently generating charges.
- After cleanup, reset your AWS Budget to $0 or delete it entirely if you no longer plan to use the account for another purpose.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| The VPC won't delete | Dependent resources (Subnet, Security Group, VPC Endpoint) haven't all been removed yet | Run `describe-network-interfaces --filters Name=vpc-id,Values=<vpc-id>` to find any remaining ENIs |
| A Security Group won't delete | Another Security Group still references it (e.g., `sg-rds` references `sg-backend`) | Remove the cross-referencing rule first with `revoke-security-group-ingress`, then delete the SG |
| CloudFront won't delete | The distribution hasn't fully transitioned to Disabled/Deployed | Wait for `aws cloudfront wait distribution-deployed` to finish before calling `delete-distribution` |

{{% notice tip %}}
You have now completed the full Office Rental Management System On Cloud deployment workshop - from networking, security, application, data, serverless, monitoring, and CI/CD, to cost optimization. Congratulations on building a solid hands-on foundation for designing similar systems on AWS.
{{% /notice %}}
