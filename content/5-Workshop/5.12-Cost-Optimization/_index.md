---
title: "Cost Optimization"
date: 2026-07-13
weight: 12
chapter: false
pre: " <b> 5.12 </b> "
---

#### Introduction

This chapter applies cost-optimization measures to the system's operating expenses without changing the underlying architecture: setting up AWS Budgets and Cost Explorer to track spending, applying Savings Plans for steadily-running resources, enabling S3 Intelligent-Tiering for stored data, and creating VPC Endpoints to eliminate NAT Gateway data-processing charges when accessing S3/DynamoDB.

#### Objectives

- Estimate and compare monthly operating costs by component.
- Set up AWS Budgets to alert when spending exceeds a threshold.
- Enable Cost Explorer and analyze costs by service/tag.
- Purchase Savings Plans for steadily-running EC2 usage.
- Enable S3 Intelligent-Tiering for the documents bucket.
- Create a Gateway VPC Endpoint for S3/DynamoDB and an Interface VPC Endpoint for Secrets Manager, to reduce NAT Gateway data-processing costs.

#### Knowledge Gained

- Understand the cost structure of each AWS service used in the system's architecture.
- Understand the difference between a Gateway VPC Endpoint (free, uses a Route Table) and an Interface VPC Endpoint (billed hourly + data processing, uses an ENI).
- Understand how Savings Plans reduce EC2/Lambda costs compared to On-Demand pricing.

#### Architecture

Estimated monthly budget in `ap-southeast-1`, with traffic of roughly 1,000 users/day:

| Component | Estimated cost/month |
|---|---|
| EC2 Auto Scaling Group (2-4 x t3.small) | ~$30 - $60 |
| RDS db.t3.small Multi-AZ | ~$50 - $80 |
| ElastiCache cache.t3.micro | ~$15 - $25 |
| NAT Gateway (2 units) | ~$60 - $70 |
| ALB + Bandwidth + CloudFront | ~$20 - $50 |
| S3 / Lambda / API Gateway / DynamoDB / SES | ~$10 - $30 |
| **Total** | **~$200 - $400/month** |

The three most expensive resources: **NAT Gateway**, **RDS Multi-AZ**, and **Data Transfer bandwidth costs**.

**Illustration**

`[Placeholder: cost-breakdown.png - Cost distribution chart by service]
{{< figure src="/images/5-Workshop/5.12-Cost Optimization/cost-breakdown.png" title="Monthly cost breakdown" >}}`

#### Steps

**Step 1 - Set up AWS Budgets**

```bash
aws budgets create-budget \
  --account-id <account-id> \
  --budget '{
    "BudgetName": "officems-monthly-budget",
    "BudgetLimit": {"Amount": "400", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": 80},
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "ops-team@example.com"}]
  }]'
```

**Step 2 - Enable Cost Explorer and add cost allocation tags**

```bash
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active TagKey=Environment,Status=Active
```

Make sure every resource in the system has the tags `Project=OfficeMS` and `Environment=Production` so Cost Explorer can filter costs accurately by project.

**Step 3 - Purchase Savings Plans for EC2**

```bash
aws savingsplans describe-savings-plans-offerings \
  --plan-types Compute \
  --payment-options No Upfront \
  --durations 31536000
```

After identifying the offering that fits your usage baseline (based on the last 30 days of usage from Cost Explorer), purchase it through the **Savings Plans** Console, selecting a Compute Savings Plan with a 1-year commitment for flexibility to apply it across EC2, Lambda, and Fargate if you expand later.

**Step 4 - Enable S3 Intelligent-Tiering**

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket officems-documents-<unique-suffix> \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "officems-intelligent-tiering",
      "Status": "Enabled",
      "Filter": {},
      "Transitions": [{"Days": 0, "StorageClass": "INTELLIGENT_TIERING"}]
    }]
  }'
```

S3 Intelligent-Tiering automatically moves objects between access tiers (Frequent, Infrequent, Archive Instant Access) based on actual access patterns, which fits contract/office image data with uneven access frequency well.

**Step 5 - Create Gateway VPC Endpoints for S3 and DynamoDB**

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.s3 \
  --route-table-ids <rt-private-1a-id> <rt-private-1b-id> \
  --vpc-endpoint-type Gateway

aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.dynamodb \
  --route-table-ids <rt-private-1a-id> <rt-private-1b-id> \
  --vpc-endpoint-type Gateway
```

A Gateway VPC Endpoint has no hourly charge and no data-processing fee; it works by adding a route to the Private Subnet's Route Table so traffic to S3/DynamoDB travels over AWS's internal network instead of through the NAT Gateway.

**Step 6 - Create an Interface VPC Endpoint for Secrets Manager**

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id <vpc-id> \
  --service-name com.amazonaws.ap-southeast-1.secretsmanager \
  --vpc-endpoint-type Interface \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id> \
  --security-group-ids <sg-backend-id> \
  --private-dns-enabled
```

{{% notice note %}}
An Interface VPC Endpoint is billed hourly and by GB of data processed, but it is usually still significantly cheaper than routing traffic through the NAT Gateway at scale, while also reducing latency and improving security since traffic never leaves the AWS network.
{{% /notice %}}

**Illustration**

`[Placeholder: vpc-endpoints-console.png - List of Gateway and Interface VPC Endpoints created]`

#### Verify the Result

```bash
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=<vpc-id>" \
  --query 'VpcEndpoints[*].[ServiceName,State]'
```

Expected result: the S3, DynamoDB, and Secrets Manager endpoints are all in the `available` state.

From the EC2 Backend, verify that S3 traffic no longer goes through the NAT Gateway by monitoring the NAT Gateway's `BytesOutToDestination` metric in CloudWatch before/after creating the VPC Endpoint - this metric should drop noticeably for S3/DynamoDB traffic.

```bash
aws budgets describe-budgets --account-id <account-id> \
  --query 'Budgets[?BudgetName==`officems-monthly-budget`]'
```

Expected result: the budget has been created with an 80% alert threshold.

#### Best Practices

- Apply consistent cost tags (`Project`, `Environment`, `Owner`) to every resource from the start so Cost Explorer/Budgets can analyze costs accurately.
- Prefer the Gateway VPC Endpoint (free) first, and only use an Interface VPC Endpoint for services that don't support Gateway (like Secrets Manager, SNS, SQS).
- Only purchase Savings Plans after you have at least 30 days of real usage data, to avoid committing to the wrong baseline.
- Regularly review Cost Explorer weekly during the early operational period to catch unusual spending early.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Creating a Gateway VPC Endpoint doesn't reduce NAT costs | The Route Table wasn't properly attached to the endpoint | Check the `--route-table-ids` value used when creating the endpoint |
| The Budget doesn't send alerts | The email subscriber hasn't confirmed the subscription | Check your inbox and confirm the subscription |
| S3 Intelligent-Tiering doesn't apply to existing objects | The lifecycle rule only applies to new objects after being enabled | Reapply the rule or wait for S3's automatic evaluation cycle |

#### Next Step

Continue to [Chapter 5.13 - Clean Up](../5.13-Cleanup/) to remove all resources created, avoiding any unwanted ongoing charges.
