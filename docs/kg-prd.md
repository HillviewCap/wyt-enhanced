Here is a concise Product Requirements Document (PRD) to launch a “Wi‑Fi Client De‑Randomization & Visualization” feature using Kismet logs and pcaps.

Product name
- Wi‑Fi Client De‑Randomization & Visualization

Problem statement
- Network analysts need to study how Wi‑Fi clients using randomized MAC addresses can still be fingerprinted via probe/beacon traffic; today this requires fragmented workflows across capture tools, scripting, and ad‑hoc visualizations. The feature should unify capture metadata (Kismet) and packet‑level features (pcaps), compute fingerprints and linkage hypotheses, and present results in an explainable visualization.

Goals and objectives
- Provide an end‑to‑end pipeline that ingests Kismet device logs and pcap/pcapng captures, extracts probe/beacon features, produces device‑level fingerprints resilient to MAC randomization, and visualizes relationships as a knowledge graph for interactive analysis.  
- Enable defensible, auditable analysis with per‑edge evidence (IE match, sequence continuity, timing similarity, RSSI correlation), supporting research and reporting.  
- Operate passively and ethically by default in controlled environments, facilitating repeatable lab experiments and publishable results.

Scope
- In scope: ingestion of Kismet unified logs and device JSON, conversion/ingestion of pcaps; extraction of IE, sequence, timing, channel, RSSI features; fingerprint generation; linkage scoring; knowledge‑graph visualization; exportable reports.  
- Out of scope (initial release): active probing, PHY‑layer SDR features beyond metadata provided by standard captures, mobile app clients, cloud multi‑tenant aggregation.

Personas and use cases
- OT/Cybersecurity analyst: quantify presence and link randomized addresses during red/blue exercises in controlled spaces; document results for reports.  
- Researcher: benchmark de‑randomization methods across OS/driver versions; publish methodology and anonymized metrics.  
- SecOps engineer: monitor discovery behavior changes during client updates or policy rollouts.

User stories
- As an analyst, import Kismet logs and pcaps and see a time‑sliced view of probe bursts and randomized MACs linked by shared IE fingerprints and sequence continuity.  
- As a researcher, export CSVs of computed features and a JSON/graph export of inferred device identities and supporting evidence.  
- As a SecOps engineer, filter the graph to a time window and channel set, verify linkage suggestions, and flag false positives for model tuning.

Data inputs
- Kismet unified database logs and device JSON exports (devices, observations, channel histories, manufacturers).  
- Pcap/pcapng files containing 802.11 management frames (probe requests/responses, beacons, assoc frames) with radiotap metadata (timestamps, RSSI, channel).

Core features and requirements

1) Ingestion and normalization
- Accept Kismet unified logs and device JSON; map to internal entities: DeviceObservation, ChannelHistory, Manufacturer, FirstSeen/LastSeen.  
- Accept pcaps; index frames with timestamps, channel, RSSI, subtype, source/destination, sequence control.  
- Handle large captures via chunked processing and incremental indexing.

2) Feature extraction
- Information Elements (IEs): ordered tag list per frame; selected values (Supported Rates, HT/VHT/HE caps, vendor IEs, WPS fields).  
- Sequence features: sequence number continuity, gaps, wrap handling, per‑burst monotonic trends.  
- Timing features: inter‑frame arrival times within bursts, burst size, scan cadence periodicity; per‑channel sweep timing.  
- Context features: RSSI statistics per burst, channel occupancy context, nearby beacons/APs for environment constraints.

3) Fingerprinting
- IE signature construction: canonical ordered IE ID list with hashed key‑values; fuzzy matching with edit‑distance thresholds.  
- OS/driver hinting: map common IE patterns to likely stacks where possible; preserve confidence score.  
- Stability scoring: measure signature stability across time windows to weight linkage edges.

4) De‑randomization linkage engine
- Candidate generation: link randomized MACs observed within proximity windows and overlapping channels; intersect by IE signature similarity.  
- Evidence scoring: composite score with tunable weights for IE match, sequence continuity, timing similarity, RSSI correlation, environmental consistency (APs/channels).  
- Clustering: group MACs into inferred device identities using DBSCAN/HDBSCAN-style clustering on feature vectors; support manual merge/split.

5) Knowledge graph visualization
- Graph schema: nodes for RandomMAC, ProbeBurst, Fingerprint, SequenceSeries, Channel, AP/BSSID, DeviceIdentity (inferred), DeviceObservation (Kismet).  
- Edges: uses‑fingerprint, continues‑sequence, in‑burst, on‑channel, near‑AP, observed‑as, linked‑to; each edge stores evidence metrics and timestamps.  
- Interactions: time slider; filter by channel, evidence thresholds, manufacturer; click a node/edge to inspect raw packets and feature deltas; approve/reject links.

6) Analytics and reporting
- Metrics: number of randomized MACs, unique inferred devices, linkage rate, false‑positive review queue, top fingerprints, OS/driver hints distribution.  
- Exports: CSVs for probe/beacon features; JSON/graph export (e.g., GraphML/CSV for nodes/edges); PDF/Markdown report with charts and selected graph snapshots.  
- Reproducibility: save analysis runs with parameter sets; enable reruns and diffs.

Non‑functional requirements
- Performance: process 10M packets within 1 hour on a modern workstation; interactive graph rendering for 5k nodes/10k edges with fluid filtering.  
- Accuracy: provide default thresholds tuned for high precision; expose knobs to trade precision/recall; include calibration notebooks and sample datasets.  
- Security & privacy: default anonymization of MACs and hashing of sensitive fields; configurable data retention; role‑based access; audit logging.  
- Portability: Linux‑first; support containers; no GPU required for baseline.

Ethics and compliance
- Emphasize passive, consented, lab‑controlled use; include a data minimization mode and a redaction pipeline; display a banner reminding of legal considerations.  
- Provide an “evidence view” to ensure every linkage is explainable and can be removed from exports if policy requires.

MVP scope
- Ingest Kismet device JSON and pcaps.  
- Extract IE/sequence/timing/RSSI features; build IE signatures.  
- Compute linkage suggestions with adjustable thresholds.  
- Render a basic knowledge graph with time filter and evidence popovers.  
- Export CSV of features and JSON of inferred identities and edges.

Phase roadmap
- Phase 1 (MVP, 6–8 weeks): ingestion, feature extraction, IE‑based fingerprinting, basic linkage, graph UI with time filtering, CSV/JSON export.  
- Phase 2 (8–10 weeks): sequence continuity heuristics, timing‑based clustering, evidence scoring weights UI, review/approval workflow, report generator.  
- Phase 3 (10–12 weeks): OS/driver hinting, multi‑capture longitudinal graphs, performance scaling, team collaboration (comments/marks), policy/redaction modes.

Success metrics
- Functional: ≥70% linkage precision on internal test sets with randomized MACs; sub‑5 min interactive filtering on 100k‑edge graphs.  
- Usability: ≥80% of pilot analysts can complete a de‑randomization task and export a report within 30 minutes.  
- Performance: process 5M packets under 30 minutes on a 16‑core workstation; graph load under 5 seconds for medium datasets.

Dependencies and integrations
- Input from capture stack configured to include management frames and radiotap metadata.  
- Python parsing/ETL for pcaps; storage layer for features and graph entities; visualization layer for graph and timelines.  
- Optional adapters to read existing Kismet unified logs and convert them when needed.

Risks and mitigations
- Risk: false linkages in dense environments. Mitigation: conservative defaults, evidence transparency, analyst approval workflow.  
- Risk: large capture sizes. Mitigation: chunked processing, downsampling views, server‑side filtering.  
- Risk: privacy concerns. Mitigation: anonymization, redaction, consent tooling, clear EULA.

Acceptance criteria
- Given Kismet logs and pcaps from a controlled test, the system builds fingerprints, proposes linkages with evidence, and renders a navigable knowledge graph; analyst can approve links and export a final report with metrics and artifacts.  
- Adjustable thresholds change linkage counts as expected and are reflected immediately in the graph and metrics.  
- Exports are reproducible and contain all parameters used.

Open questions
- Which graph backend to standardize on for first release (embedded vs. external)?  
- Preferred export formats for downstream research tools (GraphML vs. CSV edge lists).  
- Default evidence weightings per environment (e.g., office vs. stadium).

[1](https://zero-outage.com/the-standard/security/how-to-write-a-prd-template/)
[2](https://www.aha.io/roadmapping/guide/requirements-management/what-is-a-good-product-requirements-document-template)
[3](https://www.notion.com/templates/category/product-requirements-doc)
[4](https://www.chatprd.ai/templates)
[5](https://www.smartsheet.com/content/free-product-requirements-document-template)
[6](https://slite.com/templates/product-requirements-document)
[7](https://www.atlassian.com/agile/product-management/requirements)
[8](https://www.mural.co/templates/product-requirements-document)
[9](https://complianceforge.com/cybersecurity-templates/)