---
title: "CI/CD"
date: 2026-07-13
weight: 11
chapter: false
pre: " <b> 5.11 </b> "
---

#### Giới thiệu

Chương này xây dựng quy trình triển khai tự động (CI/CD) từ GitHub, sử dụng AWS CodePipeline điều phối, AWS CodeBuild để build và test, đẩy Frontend lên S3/CloudFront, và AWS CodeDeploy cập nhật Backend xuống Auto Scaling Group theo chiến lược Blue/Green Deployment, đảm bảo triển khai không gián đoạn dịch vụ.

#### Mục tiêu

- Kết nối GitHub repository với CodePipeline qua CodeStar Connections.
- Cấu hình CodeBuild build/test cho cả Frontend và Backend.
- Cấu hình CodeDeploy triển khai Backend theo Blue/Green Deployment.
- Gửi email thông báo kết quả pipeline qua Amazon SES.

#### Kiến thức đạt được

- Hiểu luồng CI/CD: Source -> Build -> Deploy trong CodePipeline.
- Hiểu cơ chế Blue/Green Deployment giúp chuyển traffic dần sang phiên bản mới, có thể rollback tức thì nếu lỗi.
- Hiểu cách CodeDeploy phối hợp với Auto Scaling Group và ALB Target Group.

#### Kiến trúc sử dụng

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
                                   ASG hiện tại (Blue)     ASG mới (Green)
                                            └──── ALB chuyển traffic ────┘
        │
        ▼
   Amazon SES ──► Email thông báo kết quả
```

**Hình minh họa**

`[Placeholder: cicd-pipeline.png - CodePipeline với các stage Source/Build/Deploy]`
{{< figure src="/images/5-Workshop/5.11-Monitoring/cicd-pipeline.png" title="Blue/Green deployment" >}}

#### Các bước thực hiện

**Bước 1 - Kết nối GitHub với CodeStar Connections**

```bash
aws codestar-connections create-connection \
  --provider-type GitHub \
  --connection-name officems-github-connection
```

Sau khi tạo, vào Console AWS CodePipeline hoàn tất bước "Update pending connection" để cấp quyền truy cập vào GitHub repository (thao tác này bắt buộc thực hiện qua giao diện web).

**Bước 2 - Tạo buildspec cho Frontend**

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

**Bước 3 - Tạo buildspec và appspec cho Backend**

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

`officems-backend/appspec.yml` (dùng bởi CodeDeploy):

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

**Bước 4 - Tạo CodeBuild Project**

```bash
aws codebuild create-project \
  --name officems-backend-build \
  --source type=CODEPIPELINE,buildspec=buildspec.yml \
  --artifacts type=CODEPIPELINE \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/amazonlinux2-x86_64-standard:5.0,computeType=BUILD_GENERAL1_SMALL \
  --service-role arn:aws:iam::<account-id>:role/officems-codebuild-role
```

Tạo tương tự cho `officems-frontend-build`.

**Bước 5 - Tạo CodeDeploy Application với Blue/Green Deployment**

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
Với `AllAtOnceBlueGreen`, CodeDeploy sẽ tạo một Auto Scaling Group mới (Green) song song với ASG hiện tại (Blue), chuyển traffic qua ALB Target Group sau khi Green pass Health Check, và tự động dừng Blue sau 5 phút nếu triển khai thành công.
{{% /notice %}}

**Bước 6 - Tạo CodePipeline**

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

**Bước 7 - Thông báo kết quả qua Amazon SES**

Xác thực domain/email gửi:

```bash
aws sesv2 create-email-identity --email-identity noreply@officems.example.com
```

Tạo CloudWatch Event Rule bắt sự kiện pipeline hoàn tất, kích hoạt Lambda gửi email qua SES:

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

**Hình minh họa**

`[Placeholder: bluegreen-deployment.png - Sơ đồ chuyển traffic Blue sang Green qua ALB]`
{{< figure src="/images/5-Workshop/5.11-Monitoring/bluegreen-deployment.png" title="Blue/Green deployment" >}}

#### Kiểm tra kết quả

```bash
aws codepipeline get-pipeline-state --name officems-pipeline
```

Kết quả mong đợi: cả 3 stage Source/Build/Deploy đều có trạng thái `Succeeded` sau khi push code lên branch `main`.

```bash
aws deploy get-deployment --deployment-id <deployment-id>
```

Kết quả mong đợi: `status = Succeeded`, xác nhận Green fleet đã nhận traffic và Blue fleet đã được terminate.

Thử push một commit nhỏ (ví dụ sửa version trong `package.json`) và quan sát pipeline tự động chạy từ Source đến Deploy mà không cần thao tác thủ công.

#### Best Practices

- Luôn chạy `npm test` trong bước Build trước khi Deploy, không bỏ qua kiểm thử tự động.
- Sử dụng Blue/Green Deployment cho Backend để đảm bảo zero-downtime và có thể rollback tức thì.
- Giới hạn quyền IAM Role của CodeBuild/CodePipeline/CodeDeploy đúng phạm vi tài nguyên cần thiết.
- Cấu hình CloudFront Invalidation tự động sau mỗi lần deploy Frontend để tránh cache phiên bản cũ.

#### Troubleshooting

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| Pipeline dừng ở Source stage | CodeStar Connection chưa được "Update pending connection" trên Console | Vào Console CodePipeline hoàn tất xác thực GitHub |
| CodeDeploy báo lỗi `InvalidDeploymentGroupNameException` | Deployment Group chưa được tạo đúng hoặc sai ASG | Kiểm tra lại tên Deployment Group và ASG liên kết |
| Blue/Green Deployment không chuyển traffic | ALB Target Group chưa healthy hoặc Health Check endpoint sai | Kiểm tra `/health` endpoint và Security Group Green fleet |

#### Bước tiếp theo

Tiếp tục sang [Chương 5.12 - Cost Optimization](../5.12-Cost-Optimization/) để tối ưu chi phí vận hành hệ thống.
