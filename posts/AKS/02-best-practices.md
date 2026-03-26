# authentication and authorization in AKS - Best Practices Part 2

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/07731e96-ec86-448b-8e7c-c6e87f983a14" />

As you deploy and operate Azure Kubernetes Service (AKS) clusters, managing access to resources and services is a critical responsibility. Without proper identity and access controls, users and workloads may gain access to unnecessary resources, and tracking who made changes to the cluster can become difficult. To address these challenges, AKS provides built‑in mechanisms that help cluster operators securely manage authentication, authorization, and workload access.

This article outlines recommended best practices for managing access and identity in AKS. You’ll learn how to authenticate users with Microsoft Entra ID, control permissions using Kubernetes RBAC and Azure RBAC, and securely allow pods to access Azure resources using workload identities.

## Use Microsoft Entra ID for Authentication
<img width="390" height="182" alt="image" src="https://github.com/user-attachments/assets/14c40d70-c761-4942-884b-ed1f90ceca7a" />

#### Deploy AKS clusters with Microsoft Entra ID integration.

Microsoft Entra ID provides a centralized and enterprise‑ready identity management system. When AKS is integrated with Microsoft Entra ID, user authentication is handled centrally, and changes to user or group status are automatically reflected in cluster access.
Kubernetes itself does not manage user identities. Instead, AKS relies on Microsoft Entra ID to authenticate human users such as developers and administrators. Once authenticated, access to cluster resources is controlled through Kubernetes RBAC.

#### How Authentication Works

1.  A developer signs in using Microsoft Entra credentials
2.  Microsoft Entra ID issues an access token
3.  The developer performs an action using kubectl
4.  Kubernetes validates the token with Microsoft Entra ID
5.  Group membership is retrieved
6.  Kubernetes RBAC policies are evaluated
7.  The request succeeds or fails based on permissions

This model ensures strong authentication and consistent identity management across Azure and AKS.

## Use Kubernetes RBAC to assign the least possible permissions.

Kubernetes Role‑Based Access Control (RBAC) allows you to define exactly what actions users or groups can perform within the cluster. Permissions can be limited to a specific namespace or extended across the entire cluster

#### Core Concepts

- Role: Defines permissions within a single namespace
- ClusterRole: Defines permissions across the entire cluster
- RoleBinding: Assigns a Role to a user or group
- ClusterRoleBinding: Assigns a ClusterRole cluster‑wide

For example, you might create a Role that grants full access to resources in the finance-app namespace and bind it to a specific developer. This approach allows you to logically separate workloads and teams while safely sharing the same cluster.
Kubernetes RBAC integrates seamlessly with Microsoft Entra ID, allowing you to assign permissions to Entra users or groups and automatically reflect membership changes.

## Use Azure RBAC for AKS Resource Management

Use Azure RBAC to control access to the AKS resource and kubeconfig.
Operating an AKS cluster requires two distinct levels of access:

1. Azure‑level access
    This is required to manage the AKS resource itself, including:

    - Scaling the cluster
    - Upgrading Kubernetes versions
    - Pulling the kubeconfig file

2. Kubernetes API access
This controls what users can do inside the cluster, such as creating pods or viewing secrets.

Azure RBAC manages access at the Azure resource level, while Kubernetes RBAC (or Azure RBAC for Kubernetes authorization) manages access inside the cluster.

## Azure RBAC for Kubernetes Authorization
AKS can be configured to use Azure RBAC for Kubernetes authorization, allowing you to manage Kubernetes API access using Azure role assignments instead of traditional Kubernetes roles.

In this model:

- Microsoft Entra ID identities are authorized using Azure RBAC
- Kubernetes service accounts continue to use Kubernetes RBAC

This approach allows organizations to manage cluster access at scale using familiar Azure RBAC tools and role definitions, while maintaining Kubernetes‑native security for workloads.

## Secure Pod Access with Workload Identity

Microsoft Entra pod‑managed identity (preview) was deprecated on October 24, 2022.
Fixed credentials inside container images or Kubernetes secrets are insecure and difficult to manage. Instead, AKS now recommends using Microsoft Entra Workload Identity (preview) to allow pods to securely access Azure resources.
Workload identity is based on Kubernetes native features and federates pod identities with Microsoft Entra ID using OpenID Connect. This approach eliminates the need for stored secrets and supports automatic credential rotation.

With workload identity:
- Pods request tokens dynamically
- Access is scoped to specific Azure resources
- No credentials are stored in images or manifests

This modern approach replaces pod‑managed identity and aligns with Kubernetes‑native security practices.

Summary:

- Use Microsoft Entra ID for all AKS user authentication
- Apply Kubernetes RBAC to control access inside the cluster
- Use Azure RBAC to manage AKS resources and kubeconfig access
- Follow the principle of least privilege at all levels
- Replace pod‑managed identities with Microsoft Entra Workload Identity

Conclusion
AKS security relies on a layered access model that combines Azure identity management with Kubernetes‑native authorization. By integrating Microsoft Entra ID, applying Kubernetes RBAC carefully, and using workload identities for pod access, organizations can securely operate AKS clusters at scale while maintaining visibility, control, and compliance.


