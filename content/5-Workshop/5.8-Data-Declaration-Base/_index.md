---
title: "Build Serverless Services"
date: 2026-07-13
weight: 8
chapter: false
pre: " <b> 5.8 </b> "
---

#### Introduction

This chapter builds Serverless microservices to separate specialized business logic - Payments and Document Processing - from the main Backend, running on AWS Lambda and exposed through Amazon API Gateway, protected by a Cognito Authorizer.

#### Objectives

- Write and deploy a Lambda function to handle Payments.
- Write and deploy a Lambda function to handle document processing, triggered when a new file is uploaded to S3.
- Create an API Gateway (REST or HTTP API) integrated with Lambda.
- Attach a Cognito Authorizer to protect the endpoints.

#### Knowledge Gained

- Understand Lambda's event-driven model (API Gateway trigger, S3 trigger).
- Understand how API Gateway integrates with a Cognito User Pool Authorizer to validate JWT tokens.
- Understand the cost benefits of Serverless: you only pay per invocation and execution time, with no charge while idle.

#### Architecture

```
React Frontend
     │ (JWT Token from Cognito)
     ▼
Amazon API Gateway ── Cognito Authorizer
     │
     ├── /payments  ──► Lambda: officems-payments-fn ──► RDS / DynamoDB
     └── /documents ──► Lambda: officems-documents-fn ──► S3

S3 (uploads/) ──event: ObjectCreated──► Lambda: officems-doc-processor-fn ──► DynamoDB (metadata)
```

**Illustration**

`[Placeholder: serverless-architecture.png - API Gateway + Lambda + Cognito Authorizer diagram]`
{{< figure src="/images/5-Workshop/5.8-Deploy Database/serverless-architecture.png" title="Serverless architecture" >}}

#### Steps

**Step 1 - Write the Payments Lambda function**

```javascript
// index.js
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  // Handle payment logic (e.g., call a third-party payment gateway)
  // Save the transaction result to the DynamoDB audit log
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "success", transactionId: "TXN-" + Date.now() })
  };
};
```

Package and deploy:

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
Lambda needs to be placed in the same VPC (via `--vpc-config`) if it needs direct access to RDS/Redis in the Private Subnet.
{{% /notice %}}

**Step 2 - Write the document processing Lambda function (S3 Trigger)**

```javascript
// index.js
exports.handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    // Process the document: extract metadata, write it to DynamoDB
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

**Step 3 - Create the API Gateway HTTP API**

```bash
aws apigatewayv2 create-api \
  --name officems-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:<account-id>:function:officems-payments-fn
```

Create the Cognito Authorizer:

```bash
aws apigatewayv2 create-authorizer \
  --api-id <api-id> \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --name officems-cognito-authorizer \
  --jwt-configuration Audience=<cognito-app-client-id>,Issuer=https://cognito-idp.ap-southeast-1.amazonaws.com/<user-pool-id>
```

Create the `/payments` route with the Authorizer attached:

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

**Step 4 - Deploy the Stage**

```bash
aws apigatewayv2 create-stage \
  --api-id <api-id> \
  --stage-name production \
  --auto-deploy
```

**Illustration**

`[Placeholder: apigateway-routes.png - API Gateway Console showing the /payments route with the JWT Authorizer]`

#### Verify the Result

Try calling the endpoint without a token (expected to be rejected):

```bash
curl -i -X POST https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/production/payments
```

Expected result: HTTP 401 Unauthorized.

Try calling with a valid JWT token obtained from Cognito:

```bash
curl -i -X POST https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/production/payments \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000000, "contractId": 1}'
```

Expected result: HTTP 200 with a returned transactionId.

Upload a test file to the documents S3 bucket and check the CloudWatch Logs for `officems-doc-processor-fn` to confirm the Lambda function was triggered.

#### Best Practices

- Split Lambda functions by business responsibility (single responsibility), rather than combining multiple pieces of logic into one function.
- Set the Timeout and Memory appropriately for the actual processing workload, to optimize cost (Lambda bills per GB-second).
- Use Lambda Provisioned Concurrency if the Payments workload requires low, consistent cold-start latency.
- Always validate the JWT token at the API Gateway layer via the Cognito Authorizer, rather than self-validating tokens inside the Lambda code.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| The API returns 401 even though a token was sent | The token has expired, or the Authorizer's Audience/Issuer is wrong | Check the `jwt-configuration` settings and obtain a fresh token from Cognito |
| Lambda isn't triggered by S3 | Missing `lambda:InvokeFunction` permission for `s3.amazonaws.com` | Re-run `aws lambda add-permission` |
| Lambda times out when accessing RDS | Lambda wasn't placed in the same VPC/Subnet as RDS | Check the `--vpc-config` setting used when creating the function |

#### Next Step

Continue to [Chapter 5.9 - Secrets Management](../5.9-Building-Serverless-Services/) to safely manage the system's sensitive information.
