---
title: "Monitoring"
date: 2026-07-13
weight: 10
chapter: false
pre: " <b> 5.10 </b> "
---

#### Introduction

This chapter sets up comprehensive monitoring of the system's performance and logs using Amazon CloudWatch, combined with Amazon SNS to automatically send alerts to the operations team when an incident occurs or a metric crosses a threshold.

#### Objectives

- Install the CloudWatch Agent on EC2 to collect detailed logs and metrics (memory, disk - which aren't available by default).
- Create a CloudWatch Dashboard summarizing the key metrics.
- Create CloudWatch Alarms for the ALB, EC2 ASG, and RDS.
- Create an SNS Topic and an email subscription to receive alerts.

#### Knowledge Gained

- Understand the difference between default metrics (CPU, Network) and custom metrics (Memory, Disk) that require the CloudWatch Agent.
- Understand how a CloudWatch Alarm transitions from `OK` to `ALARM` and triggers an action via SNS.
- Understand how to organize Log Groups by system component for easy querying with CloudWatch Logs Insights.

#### Architecture

```
EC2 (CloudWatch Agent) ──┐
ALB ──────────────────────┤
RDS ──────────────────────┼──► Amazon CloudWatch (Metrics, Logs, Alarms, Dashboard)
Lambda ────────────────────┤                              │
DynamoDB ──────────────────┘                              ▼
                                                   Amazon SNS Topic
                                                            │
                                                            ▼
                                                  Email / SMS to the operations team
```

**Illustration**

`[Placeholder: cloudwatch-dashboard.png - Dashboard summarizing CPU/Memory/RDS Connections/ALB Latency]`

#### Steps

**Step 1 - Create the SNS Topic**

```bash
aws sns create-topic --name officems-alerts

aws sns subscribe \
  --topic-arn <sns-topic-arn> \
  --protocol email \
  --notification-endpoint ops-team@example.com
```

Confirm the subscription via the email that gets sent.

**Step 2 - Install the CloudWatch Agent on EC2**

Add this to the `user-data.sh` script (or install manually via Session Manager):

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
{
  "metrics": {
    "namespace": "OfficeMS/EC2",
    "metrics_collected": {
      "mem": {"measurement": ["mem_used_percent"]},
      "disk": {"measurement": ["used_percent"], "resources": ["/"]}
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [{
          "file_path": "/home/ubuntu/officems-backend/logs/app.log",
          "log_group_name": "/officems/backend",
          "log_stream_name": "{instance_id}"
        }]
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**Step 3 - Create CloudWatch Alarms**

Alarm for high CPU on the Auto Scaling Group:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-high-cpu \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=officems-asg-backend \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

Alarm for the ALB - unhealthy targets:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-alb-unhealthy-targets \
  --namespace AWS/ApplicationELB \
  --metric-name UnHealthyHostCount \
  --dimensions Name=TargetGroup,Value=<tg-arn-suffix> Name=LoadBalancer,Value=<alb-arn-suffix> \
  --statistic Average \
  --period 60 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn>
```

Alarm for RDS - CPU and Storage:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name officems-rds-high-cpu \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=officems-mysql \
  --statistic Average \
  --period 300 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions <sns-topic-arn>

aws cloudwatch put-metric-alarm \
  --alarm-name officems-rds-low-storage \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=officems-mysql \
  --statistic Average \
  --period 300 \
  --threshold 2000000000 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn>
```

**Step 4 - Create the CloudWatch Dashboard**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name officems-overview \
  --dashboard-body '{
    "widgets": [
      {"type":"metric","properties":{"title":"EC2 CPU","metrics":[["AWS/EC2","CPUUtilization","AutoScalingGroupName","officems-asg-backend"]]}},
      {"type":"metric","properties":{"title":"ALB Request Count","metrics":[["AWS/ApplicationELB","RequestCount"]]}},
      {"type":"metric","properties":{"title":"RDS CPU","metrics":[["AWS/RDS","CPUUtilization","DBInstanceIdentifier","officems-mysql"]]}},
      {"type":"metric","properties":{"title":"Lambda Errors","metrics":[["AWS/Lambda","Errors","FunctionName","officems-payments-fn"]]}}
    ]
  }'
```

**Illustration**

`[Placeholder: sns-alert-email.png - Alert email received when an Alarm transitions to the ALARM state]`

#### Verify the Result

```bash
aws cloudwatch describe-alarms --alarm-names officems-high-cpu \
  --query 'MetricAlarms[0].StateValue'
```

Expected result: `OK` (while the system is operating normally).

Try generating simulated load using the `stress` tool on an EC2 instance to check whether the Alarm switches to `ALARM` and sends an email via SNS.

#### Best Practices

- Set `evaluation-periods` to a reasonable value (2-3 consecutive periods) to avoid false-positive alerts from momentary traffic spikes.
- Group logs into separate Log Groups per component (`/officems/backend`, `/officems/lambda-payments`, etc.) for easier querying.
- Use CloudWatch Logs Insights to analyze errors by pattern instead of reading logs manually.
- Set up a Composite Alarm when you need to combine multiple conditions (e.g., high CPU AND high latency) before alerting.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| No alert email received | The SNS subscription hasn't been confirmed | Check the subscription confirmation email again |
| The CloudWatch Agent isn't sending Memory/Disk metrics | The agent wasn't installed correctly, or is missing IAM permissions | Check that `CloudWatchAgentServerPolicy` is attached to `officems-ec2-role` |
| An alarm is stuck at `INSUFFICIENT_DATA` | Not enough metric data has been collected yet within the evaluation window | Wait for more collection cycles, or check that the Agent is running |

#### Next Step

Continue to [Chapter 5.11 - CI/CD](../5.11-Monitoring/) to build the automated deployment pipeline.
