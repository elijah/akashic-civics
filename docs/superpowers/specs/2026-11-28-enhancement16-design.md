# Enhancement 16 Design: Deployment Hardening & Advanced Monitoring / API Gateway

**Version:** 1.0  
**Date:** 2026-11-28  
**Status:** Draft — pending user review  
**Author:** Agent + User

---

## 1. Context

Akashic Civics (v1.17) provides methodology-rigorous statistical analysis of hyper-local government and civic data. Enhancements 1–15 cover statistical methods, R integration, visualization, CLI tooling, testing, documentation, quality assurance, ecosystem tooling, and governance. **Enhancement 16 fills the gap** between Enhancement 15 (Governance, v1.16) and Enhancement 17 (R/JS Bridge Improvements, v1.17) in the Enhancement Tracker — it was never previously scoped.

The user's requirements:

| Requirement | User answer |
|---|---|
| Focus areas | Deployment hardening **and** advanced monitoring and API gateway support (all three equally) |
| Primary deployment target | **Kubernetes** |
| Monitoring level | **Full observability stack** (metrics, logs, traces, dashboards, alerts) |
| API gateway features | **All**: rate limiting, auth/OAuth2-OIDC/JWT, versioning, routing, schema validation |
| Security/compliance drivers | **Formal compliance**: ISO 27001, SOC 2 |
| Existing infrastructure | A Helm chart already exists at `~/helm-akashic` |
| Success measure | Modernized Helm chart deployable via `helm upgrade --install`; observability stack integrated; API gateway deployed; security hardening & compliance work complete; measurable KPIs defined |

Architectural preference: **modular umbrella Helm chart** — separate sub-charts for app services, observability stack, API gateway, security hardening, plus compliance mapping documentation.

---

## 2. Scope

### In scope

1. **Deployment hardening** — Kubernetes-native production deployment of Akashic Civics services with zero-trust networking, secret management, health checks, and automated vulnerability scanning.
2. **Advanced monitoring / observability** — Prometheus metrics, Loki logging, Jaeger distributed tracing, Grafana dashboards, Alertmanager alerting rules.
3. **API gateway** — Rate limiting, authentication/authorization (OAuth2/OIDC/JWT + API keys), API versioning, traffic routing, request/response schema validation.
4. **Security hardening & compliance** — mTLS between services, sealed secret rotation, audit logging, ISO 27001 / SOC 2 control mapping.
5. **Modernized umbrella Helm chart** refactoring the existing `~/helm-akashic` chart into self-contained sub-charts plus a Helm release pipeline in CI.

### Out of scope

- New statistical analysis methods (covered by Enhancement 3/4/29).
- Changes to core R bridge or JS statistical logic beyond what is needed to expose `/metrics`.
- LLM/LLM-prompt features (covered by Enhancement 5).
- UI / frontend redesign beyond adding Grafana links.

---

## 3. Architecture

### 3.1 Logical components

```
┌─────────────────────────────────────────────────────────┐
│                   Ingress / API Gateway                  │
│  (Kong): TLS termination · OAuth2/OIDC · JWT · API keys │
│       Rate limiting · Versioning · Schema validation    │
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS + mTLS
┌───────────────▼─────────────────────────────────────────┐
│                    App Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Dashboard    │  │ R Bridge     │  │ Statistical  │   │
│  │ (Express)    │  │ (Node/R)     │  │ modules      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │           │
│    /metrics             /metrics        /metrics       │
│  JSON logs            JSON logs       JSON logs        │
│         └───────────────┴───────────────┘              │
│                    Structured JSON                       │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│              Observability Stack                          │
│  Prometheus · Loki · Jaeger · Grafana · Alertmanager     │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Modular umbrella Helm chart structure

The umbrella chart lives at `helm/akashic-civics/` inside this repo (modernized from `~/helm-akashic`).

```
helm/akashic-civics/
├── Chart.yaml                  # Umbrella chart metadata
├── values.yaml                 # Default values for all sub-charts
├── values.production.yaml      # Production overrides
├── values.staging.yaml         # Staging overrides
├── templates/
│   └── umbrella-configmap.yaml # Top-level feature flags
├── charts/
│   ├── app/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── serviceaccount.yaml
│   │       ├── pod-disruption-budget.yaml
│   │       └── networkpolicy.yaml
│   ├── r-interface/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       └── service.yaml
│   ├── statistical/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       └── deployment.yaml
│   ├── reporting/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       └── deployment.yaml
│   ├── observability/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── prometheus/
│   │       │   ├── deployment.yaml
│   │       │   └── configmap.yaml
│   │       ├── loki/
│   │       │   ├── deployment.yaml
│   │       │   └── configmap.yaml
│   │       ├── grafana/
│   │       │   ├── deployment.yaml
│   │       │   └── dashboard-configmap.yaml
│   │       ├── jaeger/
│   │       │   ├── deployment.yaml
│   │       │   └── configmap.yaml
│   │       └── alertmanager/
│   │           ├── deployment.yaml
│   │           └── rules-configmap.yaml
│   ├── api-gateway/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── kong-deployment.yaml
│   │       ├── kong-service.yaml
│   │       └── kong-plugins-configmap.yaml
│   └── security/
│       ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│           ├── mTLS-networkpolicies.yaml
│           ├── sealed-secrets.yaml
│           └── audit-policy.yaml
```

**Values hierarchy:**

```
values.yaml
├── global:               # shared settings (imagePullSecrets, namespace, domain)
├── app:                  # dashboard server config
├── r-interface:          # R bridge config (rScriptPath, cores)
├── observability:        # prometheus/loki/grafana/jaeger toggles
├── apiGateway:           # kong settings, rate limits, auth modes
└── security:             # mTLS, sealed secrets, audit logging
```

Each sub-chart is independently installable but wired together via the umbrella chart's `values.yaml`.

### 3.3 Data flow

1. **User request** → Kong API gateway (TLS terminated).
2. Kong validates JWT/OIDC token or API key, enforces per-client rate limit, validates request body against JSON Schema for `LegalJusticeCase`-derived endpoints.
3. Kong routes to the Express dashboard service (`/api/v1/*`) or serves static dashboard assets.
4. Express service invokes R bridge or JS statistical modules; both emit:
   - Prometheus counters via `client-prometheus` (`disparity_gap_total`, `analysis_run_total`, `missing_rate_total`).
   - Structured JSON logs to stdout (scraped by Fluent Bit → Loki).
   - OpenTelemetry-style trace context propagated through sidecar → Jaeger.
5. Prometheus scrapes all `/metrics` endpoints every 15s; Alertmanager fires rules on high disparity gaps, elevated missing rates, or R script timeouts.
6. Grafana exposes pre-built dashboards: Disparity Heatmap, Trend Monitoring, API Latency, Alert History.
7. Audit log entries (immutable, WORM object storage) record every data read/write, analysis run, and configuration change.

### 3.4 Technology choices

| Layer | Tool | Rationale |
|---|---|---|
| Containerization | Docker (multi-stage builds) | Already used by CI (`jekyll-docker.yml`) |
| Orchestration | Kubernetes | User-specified primary target |
| Packaging | Helm (umbrella + sub-charts) | User-specified; matches `~/helm-akashic` |
| API Gateway | Kong (OSS) or Kong Ingress Controller | Native rate limiting, JWT/OAuth2 plugins, OpenAPI schema validation |
| Metrics | Prometheus + `prom-client` | Standard in K8s ecosystem; integrates with Grafana |
| Logging | Loki + Fluent Bit sidecar | Lightweight, no per-node daemon overhead |
| Tracing | Jaeger + OpenTelemetry Node SDK | Full request traces across JS → R bridge calls |
| Alerts | Alertmanager | Rule-based, integrates with Prometheus |
| Dashboards | Grafana | Rich JSON-based dashboards; provisionable via ConfigMap |
| Secrets | Sealed Secrets + Vault | GitOps-friendly, no plaintext secrets in git |
| mTLS | Istio or cert-manager + issuer | Zero-trust service-to-service encryption |
| Compliance | Control mapping docs (ISO 27001 / SOC 2) | Formal audit evidence |

---

## 4. Component Details

### 4.1 App services sub-charts (`app`, `r-interface`, `statistical`, `reporting`)

Each sub-chart produces:
- `Deployment` with `readinessProbe`, `livenessProbe`, `startupProbe`
- `Service` (ClusterIP, port 8080 HTTP + 9090 `/metrics`)
- `PodDisruptionBudget` (minAvailable: 1)
- `NetworkPolicy` (ingress only from API gateway; egress only to configured upstream)

**Metrics exposed (`/metrics`)**:

| Metric | Type | Labels |
|---|---|---|
| `akashic_analysis_run_total` | Counter | analysis_type, status, jurisdiction_id |
| `akashic_disparity_gap_total` | Counter | metric, primary_group, reference_group |
| `akashic_missing_rate_total` | Counter | field, analysis_type |
| `akashic_r_script_duration_seconds` | Histogram | script_name, status |
| `akashic_http_request_duration_seconds` | Histogram | route, method, status_code |

**JSON log format** (stdout):
```json
{"ts":"2026-11-28T00:00:00Z","level":"info","service":"dashboard","event":"analysis_run","analysis_type":"disparity","jurisdiction_id":"jur_1","duration_ms":1420}
```

### 4.2 Observability sub-chart (`observability`)

- **Prometheus** deployment + ConfigMap (scrape configs + alert rules).
- **Grafana** deployment + ConfigMap with pre-provisioned dashboards:
  1. *Disparity Heatmap* — conviction/sentence disparity by jurisdiction and demographic group.
  2. *Trend Monitoring* — CUSUM-derived trend lines for key metrics over time.
  3. *API Latency* — P50/P95/P99 for `/api/v1/*` routes.
  4. *Alert History* — recent Alertmanager alerts.
- **Loki** deployment + Fluent Bit daemonset sidecar config for JSON log scraping.
- **Jaeger** deployment + OpenTelemetry instrumentation in Node services.
- **Alertmanager** ConfigMap with rules:
  - `HighDisparityGap` — disparity gap > 10pp sustained for 10m.
  - `HighMissingRate` — missing rate > 20% on analysis fields.
  - `RScriptTimeout` — R execution > configured timeout.
  - `ServiceDown` — app service probe failure.

### 4.3 API gateway sub-chart (`api-gateway`)

Deployed as Kong Ingress Controller with:

| Feature | Kong plugin/config | Notes |
|---|---|---|
| TLS termination | `Ingress` + `TCPIngress` | cert-manager-issued certificates |
| Authentication | `jwt` / `oauth2` plugin + `key-auth` | OAuth2/OIDC preferred; API keys as fallback |
| Rate limiting | `rate-limiting` plugin | Per `consumer` (user/API key), configurable burst |
| Versioning | Route prefix matching (`/api/v1`, `/api/v2`) | Backward-compatible deprecation windows |
| Schema validation | `request-transformer` + JSON Schema on body | Validates `LegalJusticeCase`-derived fields |
| Routing | `Service` + `Route` objects | `/api/` → app service; `/dashboard/` → static frontend |

### 4.4 Security sub-chart (`security`)

- **mTLS**: `NetworkPolicy` + `cert-manager` `Issuer` / `Certificate` for service-to-service TLS; Istio sidecars optional in future phases.
- **Sealed Secrets**: Controller + `SealedSecret` resources for all credentials (R script path secrets, DB credentials, OAuth2 client secrets).
- **Audit policy**: `AuditPolicy` resource writing to WORM object storage (S3/GCS immutable bucket); SIEM-forwardable JSON.
- **Runtime security**: `PodSecurityPolicy` or `psp` equivalent (K8s v1.25+ `PodSecurity` admission) enforcing non-root, read-only root filesystem where possible.

---

## 5. Security & Compliance Mapping

| Control | Implementation | Evidence artifact |
|---|---|---|
| ISO 27001 A.9 Access Control | Kong JWT/OAuth2 + API keys + per-client rate limits | `helm/akashic-civics/charts/api-gateway/` |
| ISO 27001 A.10 Cryptography | TLS termination + mTLS between services + cert-manager | `helm/akashic-civics/charts/security/` |
| ISO 27001 A.12 Operations Security | Health checks, PDBs, alerting, log aggregation | `helm/akashic-civics/charts/observability/` |
| SOC 2 CC6.1 System Operations | Deployment pipelines, sealed secrets rotation, audit logging | `helm/akashic-civics/charts/security/` + CI |
| SOC 2 CC7.2 Transmission Security | mTLS, no plaintext HTTP, HSTS headers | `helm/akashic-civics/charts/security/` |
| SOC 2 CC7.3 Data Protection | WORM audit logs, data retention policy, encryption at rest | `docs/compliance/audit-log-policy.md` |

A compliance mapping document will be generated at `docs/compliance/iso-27001-soc-2-mapping.md` as part of this enhancement.

---

## 6. Success Criteria

1. **Deployable Helm chart** — `helm upgrade --install akashic-civics ./helm/akashic-civics` succeeds against a target K8s cluster and deploys all sub-charts.
2. **Observability** — Prometheus scrape targets healthy; Grafana dashboards load with real metric data; Alertmanager rules fire correctly on simulated breaches.
3. **API gateway** — Kong enforces rate limits, validates JWT/OIDC tokens, and routes v1/v2 versions correctly; invalid requests return 401/422.
4. **Security** — mTLS enforced between services; no plaintext secrets in git; audit logs written to immutable storage.
5. **Compliance** — `docs/compliance/iso-27001-soc-2-mapping.md` exists and maps all required controls to implementation evidence.
6. **KPIs** — 1M-case analysis completes in < 5 min on 4 CPU / 8 GB RAM node; zero critical CVEs in `trivy` scan of built images.

---

## 7. Non-goals / Future work

- Multi-cluster federation (considered for Enhancement 18+).
- ArgoCD GitOps syncing (can follow once the umbrella chart is stable).
- Istio full service mesh (mTLS via cert-manager is phase 1).
- Custom autoscaling based on business metrics (HPA on CPU/memory first).

---

## 8. Open questions (to resolve before implementation)

1. Where should the modernized Helm chart live in this repo — `helm/akashic-civics/` at root?
2. Is Kong the preferred API gateway, or should we use Ambassador/APISIX?
3. Should Grafana/Loki/Jaeger be deployed as sub-charts or referenced as external (hosted) services?
4. Who owns the `~/helm-akashic` chart migration — copy contents here, or symlink/reference externally?

---

*End of spec. Pending user review.*
