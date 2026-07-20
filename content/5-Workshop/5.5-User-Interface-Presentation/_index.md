---
title: "Deploy Frontend"
date: 2026-07-13
weight: 5
chapter: false
pre: " <b> 5.5 </b> "
---

#### Introduction

This chapter deploys the system's static React Frontend to Amazon S3, distributes it globally through Amazon CloudFront, protects it with the AWS WAF created in the previous chapter, and maps the domain through Amazon Route 53.

#### Objectives

- Build the React application into static files (HTML/CSS/JS).
- Create an S3 Bucket to host the static website, with a Bucket Policy that only allows access through CloudFront (Origin Access Control).
- Create a CloudFront Distribution, attaching the ACM certificate and the WAF Web ACL.
- Configure Route 53 to point the domain to CloudFront.

#### Knowledge Gained

- Understand how CloudFront combines with Origin Access Control (OAC) to protect an S3 Bucket from direct access.
- Understand how to configure Cache Behavior and Error Pages for a Single Page Application (SPA).
- Understand how a Route 53 Alias Record points to CloudFront.

#### Architecture

```
Route 53 (officems.example.com)
        │
        ▼
   CloudFront Distribution ── WAF Web ACL
        │ (Origin Access Control)
        ▼
   S3 Bucket (Static Website, Private)
```

**Illustration**

`[Placeholder: frontend-architecture.png - CloudFront + S3 + Route 53 diagram]`
{{< figure src="/images/5-Workshop/5.5-Policy/frontend-architecture.png" title="Frontend delivery architecture" >}}


#### Steps

**Step 1 - Build the React application**

```bash
cd officems-frontend
npm install
npm run build
```

The build output is located in the `build/` folder (Create React App) or `dist/` (Vite).

**Step 2 - Create the S3 Bucket**

```bash
aws s3api create-bucket \
  --bucket officems-frontend-<unique-suffix> \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-public-access-block \
  --bucket officems-frontend-<unique-suffix> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

The bucket is configured to be fully private; only CloudFront (via OAC) is allowed to read from it.

**Step 3 - Upload the build output**

```bash
aws s3 sync build/ s3://officems-frontend-<unique-suffix>/ --delete
```

**Step 4 - Create the Origin Access Control (OAC) and the CloudFront Distribution**

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name=officems-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3
```

Create the CloudFront Distribution (abbreviated main configuration):

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

Update the Bucket Policy so it only allows the CloudFront Distribution you just created:

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
Returning `index.html` with a 200 status code via `CustomErrorResponses` for 403/404 errors is required for a Single Page Application using client-side routing (React Router), to avoid a blank-page error on a deep-link refresh.
{{% /notice %}}

**Step 5 - Configure Route 53**

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

`Z2FDTNDATAQYW2` is CloudFront's fixed Hosted Zone ID, used for any Alias Record that points to CloudFront.

**Illustration**

`[Placeholder: cloudfront-distribution.png - CloudFront Distribution in the Deployed state]`

#### Verify the Result

```bash
curl -I https://officems.example.com
```

Expected result: HTTP 200, with an `x-cache` header confirming the request was served through CloudFront. Accessing the S3 Bucket URL directly should return a `403 Access Denied` error, confirming the bucket is properly protected.

#### Best Practices

- Always use Origin Access Control (OAC) instead of the deprecated Origin Access Identity (OAI).
- Enable automatic Cache Invalidation in the CI/CD pipeline every time a new build is deployed (configured in Chapter 5.11).
- Configure Cache-Control headers appropriately for each file type: HTML should use `no-cache`, while hashed JS/CSS filenames can be cached long-term.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Accessing the domain returns 403 | The Bucket Policy hasn't been updated with the correct Distribution ARN | Check `put-bucket-policy` and the `SourceArn` value |
| Refreshing a sub-page (e.g., `/admin/dashboard`) shows a blank page | Missing Custom Error Response returning `index.html` | Re-add `CustomErrorResponses` for error codes 403/404 |
| CloudFront doesn't accept the ACM certificate | The certificate was created in the wrong region | The certificate for CloudFront must be in `us-east-1` |

#### Next Step

Continue to [Chapter 5.6 - Deploy Backend](../5.6-Backend/) to deploy the Backend API on an EC2 Auto Scaling Group.
