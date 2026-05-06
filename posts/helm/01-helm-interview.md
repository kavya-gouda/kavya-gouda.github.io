# helm deep dive

## Section 1: Helm Fundamentals
1. What is Helm and what problem does it solve?
   Helm is a package manager for Kubernetes. It solves the problem of managing Kubernetes applications that consist of many interconnected YAML manifests.

  **Without Helm**: A production application might require 10-20 YAML files (Deployment, Service, ConfigMap, Secret, Ingress, HPA, RBAC, PVC, etc.). Managing these across dev/staging/prod environments means duplicating files and manually substituting values — error-prone and inconsistent.

  **With Helm**:
  - Bundle all manifests into a Chart (versioned, shareable package)
  - Use templates with Go templating to make values configurable
  - Override values per environment via values.yaml or --set flags
  - Track installed releases and roll back to previous versions
  - Share charts via Helm repositories (public or private)

  Three core concepts: Charts (the package), Releases (an installed instance), Repositories (where charts are stored).


2. Explain the Helm chart directory structure
```
mychart/
├── Chart.yaml          # Chart metadata (name, version, appVersion, dependencies)
├── values.yaml         # Default configuration values
├── values.schema.json  # Optional JSON schema for values validation
├── charts/             # Dependent charts (subcharts)
├── templates/          # Kubernetes manifest templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── _helpers.tpl    # Named template definitions (not rendered directly)
│   ├── NOTES.txt       # Post-install instructions (displayed after install)
│   └── tests/
│       └── test-connection.yaml
└── .helmignore         # Files to exclude when packaging
```
Key files:

Chart.yaml: Contains name, version (chart version), appVersion (app version), description, dependencies list
values.yaml: Default values — users can override with their own values file or --set flags
_helpers.tpl: Named templates using {{- define "mychart.fullname" -}} — reusable snippets used across templates
NOTES.txt: Rendered and displayed to user after helm install — put useful post-install instructions here

3. How does Helm templating work?
Helm uses Go's text/template package extended with Sprig functions. Templates are in the templates/ directory and are rendered when you run helm install or helm template.

```
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```
Scope objects:

.Values — values from values.yaml and overrides
.Chart — Chart.yaml contents
.Release — release info (Name, Namespace, Revision)
.Capabilities — Kubernetes cluster capabilities
Common functions: include, toYaml, nindent, quote, default, if/else, range, required

Debugging: helm template renders templates locally without installing. helm lint checks for syntax errors.

------
4. What is the difference between `helm install` and `helm upgrade --install`?

helm install fails if a release with that name already exists.

helm upgrade --install installs if the release doesn't exist, upgrades if it does. This is the idempotent form — used in CI/CD pipelines where you don't know if this is the first deploy or an update. 
```
helm upgrade --install my-app ./mychart   --namespace production   --create-namespace   --values ./values.prod.yaml   --set image.tag=${GIT_SHA}   --wait   --timeout 5m
```
Flags worth knowing:

--wait: Wait until all resources are ready before returning (or fail with timeout)

--atomic: Roll back automatically if the upgrade fails

--dry-run: Simulate without applying (client-side only)

--create-namespace: Create the namespace if it doesn't exist

-------
5. Explain Helm hooks and give use cases
Helm hooks allow you to run Jobs at specific points in the release lifecycle. They're implemented via the helm.sh/hook annotation on Kubernetes resources.

Hook types:

pre-install / post-install: Before/after the first install
pre-upgrade / post-upgrade: Before/after each upgrade
pre-delete / post-delete: Before/after helm delete
pre-rollback / post-rollback: Before/after rollback
test: Resources run when helm test is called

Common use cases:

```
# Database migration before upgrade
metadata:
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
```
**Hook weights**: Control execution order when multiple hooks share the same type (lower number = runs first).

**Delete policy**: before-hook-creation deletes old hook resources before creating new ones. hook-succeeded deletes the resource after it succeeds. Important — without a delete policy, old Job resources accumulate.

---------

## Section 2: Values, Overrides & Multi-Environment

6. How do you manage values across multiple environments?
   Pattern 1: Values file hierarchy

```
   helm upgrade --install my-app ./chart   -f values.yaml           # chart defaults
  -f values.prod.yaml      # env overrides (wins over values.yaml)
  --set image.tag=${SHA}    # deployment-specific (wins over all files)
```

  Later -f files and --set flags take precedence. This creates a clean layering: chart defaults → environment overrides → deployment-specific overrides.

  Pattern 2: Umbrella charts
  A parent chart that lists environment-specific subcharts as dependencies with different values files per environment. Works well for platform teams managing many services.

  Pattern 3: ArgoCD + Helm
  ArgoCD Application manifests specify the chart and per-environment values file paths. The values files live in the same Git repo. GitOps approach — no manual helm commands.

  What to avoid: Duplicating the entire values.yaml per environment. Only override what differs — keep the diff minimal and reviewable.

--------

7. What is the difference between `--set`, `-f values.yaml`, and `--set-file`?

All three override chart values but handle input differently:

-f values.yaml (recommended for most overrides):

Pass a YAML file with structured overrides. Readable, versionable, supports complex nested structures. Use for environment-specific config.

--set key=value (for simple, dynamic values):

Override a single value inline. Perfect for image tags from CI: --set image.tag=$GIT_SHA. For nested keys: --set service.port=8080. For arrays: --set ingress.hosts[0].host=example.com.

--set-string key=value:

Forces the value to be interpreted as a string — useful when --set would auto-cast a value (e.g., --set image.tag=1.0 would become a float without --set-string).

--set-file key=path:

Reads the value from a file. Use for multi-line values like TLS certificates or complex scripts.

Precedence (highest to lowest): --set > --set-file > --set-string > -f values.yaml (last file wins over earlier files) > chart values.yaml defaults.

------

8. How do you validate values in a Helm chart?


Option 1: required function in templates
```
image: {{ required "image.repository is required" .Values.image.repository }}
```
Fails at render time if the value is missing or empty.

Option 2: values.schema.json

JSON Schema definition placed in the chart root. Helm validates values against this schema at helm install/helm upgrade time, before rendering.

```
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "required": ["image"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "required": ["repository", "tag"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string" }
      }
    }
  }
}

```
Option 3: helm lint

Runs in CI to catch template errors and common issues before deployment.

Best practice: Use values.schema.json for chart libraries shared across teams — it gives users immediate feedback when they provide invalid config

## Section 3: Advanced Helm

9. Helm vs Kustomize: when do you choose each?
   Ideal answer:

    Helm:

    -  Package manager with versioning, dependency management, and release tracking
    -  Templating via Go templates — powerful but complex
    -  Chart repositories for sharing packages (Artifact Hub, private Harbor)
    -  Release history and rollback built-in
    -  Hook support for pre/post deployment tasks
    -  Complex to debug when templates go wrong
  
      
    Kustomize:
    
    -  Overlay system — patches applied to base YAML without templating
    -  No templating engine — uses strategic merge patches and JSON patches
    -  No release tracking or rollback (that's Kubernetes's job or your CI/CD)
    -  Built into kubectl (kubectl apply -k)
    -  Simpler to understand and debug — output is always valid YAML

    When to choose:

    Helm: Distributing applications to external users, complex parameterization, need for release management

    Kustomize: Internal platform config, simple env-specific overrides, teams that want YAML-native tooling
    Both together: ArgoCD and Flux support Helm + Kustomize in the same app — use Helm for the application chart, Kustomize for cluster-level config


   --------

   10. How does Helm 3 differ from Helm 2?
  
     The biggest change in Helm 3 (released 2019) was the removal of Tiller — Helm 2's server-side component that ran in the cluster with full cluster-admin privileges.
   Helm 2 problems Tiller caused:
    -  Serious security risk — Tiller had god-mode RBAC in the cluster
    -  Multi-tenancy issues — one Tiller served all namespaces
    -  Upgrade coordination challenges
   
   Helm 3 improvements:

   -  No Tiller: Helm 3 is client-only. Applies directly to the Kubernetes API using the user's kubeconfig credentials — proper RBAC
   -  Release secrets: Release metadata stored as Kubernetes Secrets in the release namespace (not in a centralized Tiller namespace)
   - 3-way strategic merge patches: Better handling of drift between desired and live state
   - OCI support: Charts can be stored in OCI registries (Docker registries)
   - Chart dependencies: Consolidated — requirements.yaml merged into Chart.yaml



--------


https://www.interviewdrill.io/blog/helm-interview-questions-devops-2026
