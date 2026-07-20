---
title: "CI/CD"
date: 2026-07-13
weight: 11
chapter: false
pre: " <b> 5.11 </b> "
---

#### Introduction

This chapter builds an automated deployment pipeline (CI/CD) from GitHub, using AWS CodePipeline to orchestrate, AWS CodeBuild to build and test, pushing the Frontend to S3/CloudFront, and AWS CodeDeploy to roll out the Backend to the Auto Scaling Group using a Blue/Green Deployment strategy, ensuring service is never interrupted during releases.

#### Objectives

- Connect the GitHub repository to CodePipeline via CodeStar Connections.
- Configure CodeBuild to build/test both the Frontend and the Backend.
- Configure CodeDeploy to deploy the Backend using Blue/Green Deployment.
- Send pipeline result notifications by email via Amazon SES.

#### Knowledge Gained

- Understand the CI/CD flow: Source -> Build -> Deploy in CodePipeline.
- Understand the Blue/Green Deployment mechanism, which gradually shifts traffic to the new version and can roll back instantly if something goes wrong.
- Understand how CodeDeploy coordinates with the Auto Scaling Group and the ALB Target Group.

#### Architecture

```
GitHub (push/merge) ── CodeStar Connections
        │
        ▼
   AWS CodePipeline
        │
        ├── Stage: Build Frontend  (CodeBuild) ──► S3 + CloudFront Invalidation
        │
        └── Stage: Build Backend   (CodeBuild) ──► CodeDeploy (Blue/Green)
                                                        │
                                            ┌───────────┴────────────┐
                                            ▼                        ▼
                                   Current ASG (Blue)       New ASG (Green)
                                            └──── ALB shifts traffic ────┘
        │
        ▼
   Amazon SES ──► Result notification email
```

**Illustration**

`[Placeholder: cicd-pipeline.png - CodePipeline with the Source/Build/Deploy stages]`

#### Steps

**Step 1 - Connect GitHub via CodeStar Connections**

```bash
aws codestar-connections create-connection \
  --provider-type GitHub \
  --connection-name officems-github-connection
```

After creating it, go to the AWS CodePipeline Console and complete the "Update pending connection" step to authorize access to the GitHub repository (this step must be done through the web console).

**Step 2 - Create the Frontend buildspec**

`officems-frontend/buildspec.yml`:

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
  pre_build:
    commands:
      - npm install
  build:
    commands:
      - npm run build
      - npm test -- --watchAll=false
  post_build:
    commands:
      - aws s3 sync build/ s3://officems-frontend-<unique-suffix>/ --delete
      - aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
artifacts:
  files:
    - '**/*'
  base-directory: build
```

**Step 3 - Create the Backend buildspec and appspec**

`officems-backend/buildspec.yml`:

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
  pre_build:
    commands:
      - npm install
  build:
    commands:
      - npm test
  post_build:
    commands:
      - echo "Build completed"
artifacts:
  files:
    - '**/*'
    - appspec.yml
    - scripts/*.sh
```

`officems-backend/appspec.yml` (used by CodeDeploy):

```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /home/ubuntu/officems-backend
hooks:
  BeforeInstall:
    - location: scripts/stop_app.sh
      timeout: 60
  AfterInstall:
    - location: scripts/install_deps.sh
      timeout: 180
  ApplicationStart:
    - location: scripts/start_app.sh
      timeout: 60
  ValidateService:
    - location: scripts/validate.sh
      timeout: 60
```

`scripts/start_app.sh`:

```bash
#!/bin/bash
cd /home/ubuntu/officems-backend
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
```

**Step 4 - Create the CodeBuild Project**

```bash
aws codebuild create-project \
  --name officems-backend-build \
  --source type=CODEPIPELINE,buildspec=buildspec.yml \
  --artifacts type=CODEPIPELINE \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/amazonlinux2-x86_64-standard:5.0,computeType=BUILD_GENERAL1_SMALL \
  --service-role arn:aws:iam::<account-id>:role/officems-codebuild-role
```

Create a similar project for `officems-frontend-build`.

**Step 5 - Create the CodeDeploy Application with Blue/Green Deployment**

```bash
aws deploy create-application \
  --application-name officems-backend-app \
  --compute-platform Server

aws deploy create-deployment-group \
  --application-name officems-backend-app \
  --deployment-group-name officems-backend-dg \
  --deployment-config-name CodeDeployDefault.AllAtOnceBlueGreen \
  --auto-scaling-groups officems-asg-backend \
  --service-role-arn arn:aws:iam::<account-id>:role/officems-codedeploy-role \
  --blue-green-deployment-configuration '{
    "terminateBlueInstancesOnDeploymentSuccess": {"action": "TERMINATE", "terminationWaitTimeInMinutes": 5},
    "deploymentReadyOption": {"actionOnTimeout": "CONTINUE_DEPLOYMENT"},
    "greenFleetProvisioningOption": {"action": "COPY_AUTO_SCALING_GROUP"}
  }' \
  --load-balancer-info 'targetGroupInfoList=[{name=officems-tg-backend}]'
```

{{% notice tip %}}
With `AllAtOnceBlueGreen`, CodeDeploy creates a new Auto Scaling Group (Green) alongside the current one (Blue), shifts traffic through the ALB Target Group once Green passes its Health Check, and automatically terminates Blue after 5 minutes if the deployment succeeds.
{{% /notice %}}

**Step 6 - Create the CodePipeline**

```bash
aws codepipeline create-pipeline --pipeline '{
  "name": "officems-pipeline",
  "roleArn": "arn:aws:iam::<account-id>:role/officems-codepipeline-role",
  "artifactStore": {"type": "S3", "location": "officems-pipeline-artifacts-<unique-suffix>"},
  "stages": [
    {
      "name": "Source",
      "actions": [{
        "name": "GitHubSource",
        "actionTypeId": {"category": "Source", "owner": "AWS", "provider": "CodeStarSourceConnection", "version": "1"},
        "configuration": {
          "ConnectionArn": "<connection-arn>",
          "FullRepositoryId": "<your-org>/officems-backend",
          "BranchName": "main"
        },
        "outputArtifacts": [{"name": "SourceOutput"}]
      }]
    },
    {
      "name": "Build",
      "actions": [{
        "name": "BuildBackend",
        "actionTypeId": {"category": "Build", "owner": "AWS", "provider": "CodeBuild", "version": "1"},
        "configuration": {"ProjectName": "officems-backend-build"},
        "inputArtifacts": [{"name": "SourceOutput"}],
        "outputArtifacts": [{"name": "BuildOutput"}]
      }]
    },
    {
      "name": "Deploy",
      "actions": [{
        "name": "DeployBackend",
        "actionTypeId": {"category": "Deploy", "owner": "AWS", "provider": "CodeDeploy", "version": "1"},
        "configuration": {"ApplicationName": "officems-backend-app", "DeploymentGroupName": "officems-backend-dg"},
        "inputArtifacts": [{"name": "BuildOutput"}]
      }]
    }
  ]
}'
```

**Step 7 - Notify results via Amazon SES**

Verify the sending domain/email:

```bash
aws sesv2 create-email-identity --email-identity noreply@officems.example.com
```

Create a CloudWatch Event Rule to catch pipeline completion events, triggering a Lambda function that sends an email via SES:

```bash
aws events put-rule \
  --name officems-pipeline-notify \
  --event-pattern '{
    "source": ["aws.codepipeline"],
    "detail-type": ["CodePipeline Pipeline Execution State Change"],
    "detail": {"pipeline": ["officems-pipeline"], "state": ["SUCCEEDED", "FAILED"]}
  }'

aws events put-targets \
  --rule officems-pipeline-notify \
  --targets "Id"="1","Arn"="arn:aws:lambda:ap-southeast-1:<account-id>:function:officems-ses-notify-fn"
```

**Illustration**

`[Placeholder: bluegreen-deployment.png - Diagram of traffic shifting from Blue to Green through the ALB]`

{{< figure src="/images/5-Workshop/5.11-Monitoring/bluegreen-deployment.png" title="Blue/Green deployment" >}}

#### Verify the Result

```bash
aws codepipeline get-pipeline-state --name officems-pipeline
```

Expected result: all 3 stages (Source/Build/Deploy) show `Succeeded` after pushing code to the `main` branch.

```bash
aws deploy get-deployment --deployment-id <deployment-id>
```

Expected result: `status = Succeeded`, confirming the Green fleet has received traffic and the Blue fleet has been terminated.

Try pushing a small commit (e.g., bumping the version in `package.json`) and watch the pipeline run automatically from Source to Deploy without any manual action.

#### Best Practices

- Always run `npm test` during the Build step before deploying; never skip automated testing.
- Use Blue/Green Deployment for the Backend to guarantee zero downtime and enable instant rollback.
- Scope the IAM Roles for CodeBuild/CodePipeline/CodeDeploy to only the resources they actually need.
- Configure automatic CloudFront Invalidation after every Frontend deployment to avoid serving a stale cached version.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| The pipeline stalls at the Source stage | The CodeStar Connection hasn't been through "Update pending connection" in the Console | Go to the CodePipeline Console and complete the GitHub authorization |
| CodeDeploy returns `InvalidDeploymentGroupNameException` | The Deployment Group wasn't created correctly, or references the wrong ASG | Check the Deployment Group name and its linked ASG |
| Blue/Green Deployment isn't shifting traffic | The ALB Target Group isn't healthy, or the Health Check endpoint is wrong | Check the `/health` endpoint and the Green fleet's Security Group |

#### Next Step

Continue to [Chapter 5.12 - Cost Optimization](../5.12-Cost-Optimization/) to optimize the system's operating costs.
