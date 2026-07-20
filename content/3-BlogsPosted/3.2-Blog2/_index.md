---
title: "Blog 2"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.2. </b> "
---
## Building a High Availability System: Automatic Scaling and Real-World Failure Recovery

### Why Is a High Availability (HA) Architecture Important?

When designing the **Cloud-based Office Rental Management System**, one of the key non-functional requirements was ensuring that the application could support **at least 500 concurrent users** and handle peak loads of **up to 2,000 concurrent users** without downtime or significant performance degradation.

Running the entire application on a single server would create a single point of failure. If that server became overloaded or experienced hardware issues, the entire system would become unavailable.

To address this challenge, I implemented a **three-tier architecture** deployed across multiple **Availability Zones (Multi-AZ)** to provide high availability, fault tolerance, and automatic scalability.

### How the Architecture Works

The High Availability architecture relies on the collaboration of three primary AWS components:

#### 1. Traffic Distribution with Application Load Balancer (ALB)

An **Application Load Balancer (ALB)** is deployed in the Public Subnet to receive incoming requests and distribute them evenly across Amazon EC2 instances located in Private Subnets.

Using built-in **Health Checks**, ALB continuously monitors the health of backend instances. If an EC2 instance becomes unhealthy, ALB automatically stops routing traffic to that instance, ensuring uninterrupted service for end users.

#### 2. Automatic Scaling with Auto Scaling Group (ASG)

The Node.js application layer is managed by an **Amazon EC2 Auto Scaling Group (ASG)** using a **Target Tracking Scaling Policy** based on CPU utilization with a target threshold of **60%**.

As application traffic increases, ASG automatically launches additional EC2 instances. When demand decreases, unnecessary instances are terminated automatically, maintaining optimal performance while minimizing infrastructure costs.

#### 3. Database High Availability with Amazon RDS Multi-AZ

The MySQL database is deployed using **Amazon RDS Multi-AZ**, which continuously replicates data to a standby instance located in another Availability Zone.

If the primary database becomes unavailable, Amazon RDS automatically performs a failover to the standby instance within approximately **45–70 seconds**, minimizing service disruption and ensuring business continuity.

### Common Misconceptions

- **Auto Scaling provisions new servers instantly.**

  In reality, launching new EC2 instances requires several minutes. During this period, AWS must provision the instance, execute initialization scripts, deploy the application, and complete ALB health checks before traffic can be routed to the new server.

  Therefore, configuring an appropriate **Minimum Capacity** is essential to absorb sudden traffic spikes while additional instances are being launched.

- **Application Load Balancer can stop all DDoS attacks.**

  ALB efficiently distributes traffic, but it cannot distinguish between legitimate and malicious application-layer requests.

  To effectively protect web applications against common web attacks, **AWS WAF (Web Application Firewall)** should be deployed alongside ALB.

- **High Availability means 100% uptime.**

  High Availability significantly improves service reliability and helps organizations achieve Service Level Agreements (SLAs), such as **99.9% availability**.

  However, brief interruptions can still occur during infrastructure events such as Amazon RDS failover. Applications should therefore implement retry mechanisms to automatically recover from transient failures.

### Lessons Learned from Load Testing

To validate the architecture, I used **Apache JMeter** to simulate **2,000 concurrent users**.

Several valuable observations were made:

- Configuring a **60% CPU utilization target** for Auto Scaling proved to be effective. During a stress test of approximately **600,000 requests over 15 minutes**, average CPU utilization reached **82%**, prompting ASG to automatically scale from **2 EC2 instances to 5 instances** in less than **three minutes**.

- The scale-out process completed smoothly without any HTTP 5xx server errors. This demonstrated the effectiveness of combining **Amazon Machine Images (AMIs)** with **Launch Templates** to rapidly provision fully configured application servers.

- Continuous monitoring with **Amazon CloudWatch** was essential for tuning the Auto Scaling **Cooldown Period**, preventing frequent scale-in and scale-out events (known as **thrashing**) during periods of fluctuating traffic.

### Conclusion

High Availability is not achieved through a single AWS service or configuration option. Instead, it is the result of integrating multiple infrastructure layers, including:

- **Application Load Balancer** for traffic distribution,
- **Amazon EC2 Auto Scaling** for compute elasticity,
- **Amazon RDS Multi-AZ** for database redundancy and failover.

By carefully configuring these services and validating the architecture through realistic load testing, organizations can confidently operate high-traffic applications while minimizing downtime and eliminating the need for manual intervention during infrastructure failures.

...Image...

![High Availability Architecture Using ALB, Auto Scaling, and Amazon RDS Multi-AZ](/images/3-BlogsPosted/BLOG2.png)

...Link...

...Guide...