"""
backend/app/api/learning.py - Adaptive Learning and Skill-Gap Plan API.
Implements Section 4.5 of the CareerLens Implementation Specification.
Features:
- Dynamic role-specific learning curves calibrated to seniority tier and weekly commitment.
- Comprehensive technical skill repository with rich study guides and verification quizzes.
- Industry-filtered role discovery and milestone progress tracking.
- Verified skill elevation upon assessment completion.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    User, ProfileSkill, UserSkillEvidence, CareerGoal,
    LearningPlan, LearningTask
)
from app.services.career_graph_service import CareerGraphService, CAREER_ROLES, INDUSTRIES
from app.services.activity_service import record_user_activity
from app.services.years_service import canonical_skill

router = APIRouter(prefix="/learning", tags=["Adaptive Learning & Skill-Gap Plan"])

# -----------------------------------------------------------------------------
# Curated Skill Knowledge Base: Comprehensive Quizzes & Learning Things
# -----------------------------------------------------------------------------
SKILL_LEARNING_METADATA: Dict[str, Dict[str, Any]] = {
    "kubernetes": {
        "title": "Production Container Orchestration with Kubernetes",
        "objective": "Master cluster control planes, Pod lifecycle, Deployments, Services, Helm charts, and HPA for resilient cloud architectures.",
        "effort_hours": 8.0,
        "difficulty_tier": "Advanced",
        "prerequisites": ["Docker", "Linux CLI", "Networking Basics"],
        "resources": [
            {"title": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/", "type": "Documentation"},
            {"title": "Kubernetes the Hard Way", "url": "https://github.com/kelseyhightower/kubernetes-the-hard-way", "type": "Hands-on Lab"},
            {"title": "Production Kubernetes Best Practices", "url": "https://learnk8s.io/production-best-practices", "type": "Guide"}
        ],
        "mini_project": "Deploy a multi-tier web application with rolling updates, Ingress routing, resource quotas, and Horizontal Pod Autoscaler.",
        "study_guide": {
            "key_concepts": [
                "Control Plane vs. Worker Nodes: API Server, etcd, kube-scheduler, and kubelet coordinate desired vs. actual state.",
                "Service Abstractions: ClusterIP provides internal VIPs, NodePort opens host ports, and Ingress routes L7 HTTP/HTTPS traffic.",
                "Pod Lifecycle & Probes: Liveness probes detect deadlocks, readiness probes govern traffic routing during startup.",
                "Configuration Separation: ConfigMaps store non-sensitive properties; Secrets encrypt credentials and tokens at rest."
            ],
            "code_example": (
                "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api-service\nspec:\n  replicas: 3\n"
                "  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxSurge: 1\n      maxUnavailable: 0\n"
                "  template:\n    spec:\n      containers:\n      - name: api\n        image: registry.example.com/api:v1.4\n"
                "        resources:\n          requests:\n            cpu: '250m'\n            memory: '512Mi'\n"
                "        readinessProbe:\n          httpGet:\n            path: /healthz\n            port: 8080\n"
                "          initialDelaySeconds: 5\n          periodSeconds: 10"
            ),
            "code_language": "yaml",
            "common_pitfalls": [
                "Omitting CPU and Memory requests/limits causes noisy-neighbor eviction and OOMKilled crashes.",
                "Confusing liveness and readiness probes: failing a liveness probe triggers infinite container restart loops.",
                "Storing sensitive tokens directly in container environment variables instead of mounting Kubernetes Secrets."
            ],
            "practice_exercise": "Write a Deployment manifest with 3 replicas, zero-downtime rolling update strategy, and a ClusterIP Service."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "Which Kubernetes controller maintains the desired count of identical Pod replicas and handles self-healing?",
                "options": ["ReplicaSet / Deployment", "Namespace", "Ingress Controller", "ConfigMap Operator"],
                "answer_idx": 0,
                "explanation": "ReplicaSets (managed declaratively by Deployments) monitor pod states and create/delete pods to match the specified replica count."
            },
            {
                "id": "q2",
                "question": "What is the primary operational distinction between a ClusterIP and a NodePort Service?",
                "options": [
                    "ClusterIP exposes the service internally within the cluster, while NodePort opens a static high port on each node's IP",
                    "ClusterIP is for stateful database workloads and NodePort is exclusively for stateless frontend apps",
                    "ClusterIP provides external public DNS routing while NodePort operates only at Layer 2",
                    "ClusterIP requires an external cloud provider load balancer while NodePort does not"
                ],
                "answer_idx": 0,
                "explanation": "ClusterIP is the default internal-only VIP. NodePort exposes that service on a dedicated port across every cluster node for external access."
            },
            {
                "id": "q3",
                "question": "How does Kubernetes guarantee zero-downtime deployments when rolling out a new container image?",
                "options": [
                    "By provisioning new Pods and confirming readiness probes before terminating old Pod instances",
                    "By restarting all worker nodes simultaneously in sequence",
                    "By buffering incoming HTTP requests at the ingress gateway for up to 60 seconds",
                    "By disabling DNS records while the container runtime updates the image tag"
                ],
                "answer_idx": 0,
                "explanation": "With RollingUpdate and readiness probes, Kubernetes ensures new pods are fully initialized and healthy before rerouting traffic and shutting down older replicas."
            },
            {
                "id": "q4",
                "question": "What happens if a container exceeds its configured memory 'limit' in its resource specification?",
                "options": [
                    "The Linux kernel OOM killer terminates the container process (OOMKilled, exit code 137)",
                    "The container is automatically assigned additional memory from neighboring nodes",
                    "The container's CPU frequency is throttled by 50% until memory usage subsides",
                    "Kubernetes silently ignores the limit if the worker node has free unallocated RAM"
                ],
                "answer_idx": 0,
                "explanation": "Unlike CPU limits which cause CPU time throttling, exceeding memory limits triggers an immediate OOMKill by the host kernel."
            }
        ]
    },
    "docker": {
        "title": "Containerization and Image Optimization with Docker",
        "objective": "Build multi-stage production Dockerfiles, enforce non-root security, optimize layer caching, and manage multi-container compositions.",
        "effort_hours": 5.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["Linux CLI", "Git"],
        "resources": [
            {"title": "Docker Official Documentation", "url": "https://docs.docker.com/get-started/", "type": "Documentation"},
            {"title": "Docker Security Best Practices", "url": "https://docs.docker.com/develop/security-best-practices/", "type": "Guide"}
        ],
        "mini_project": "Design a minimal multi-stage Dockerfile that drops build toolchains and produces a hardened scratch/alpine runtime container.",
        "study_guide": {
            "key_concepts": [
                "Multi-Stage Builds: Isolate compilers, package managers, and devDependencies in early stages, copying only final binaries to a lean runtime image.",
                "Layer Caching: Order instructions from least frequently changing (system deps) to most frequently changing (source code).",
                "Principle of Least Privilege: Never run container entrypoints as root; create and switch to a dedicated unprivileged user.",
                "Container Signals: Use exec form in ENTRYPOINT (ENTRYPOINT [\"node\", \"server.js\"]) so SIGTERM propagates cleanly for graceful shutdowns."
            ],
            "code_example": (
                "# Stage 1: Build\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\n"
                "COPY . .\nRUN npm run build\n\n# Stage 2: Hardened Runtime\nFROM node:20-alpine AS runner\nWORKDIR /app\n"
                "ENV NODE_ENV=production\nUSER node\nCOPY --from=builder --chown=node:node /app/dist ./dist\n"
                "COPY --from=builder --chown=node:node /app/node_modules ./node_modules\nEXPOSE 3000\n"
                "CMD [\"node\", \"dist/main.js\"]"
            ),
            "code_language": "dockerfile",
            "common_pitfalls": [
                "Running containers as the default root user opens severe host privilege escalation vulnerabilities.",
                "Copying the entire source repository before installing dependencies invalidates layer cache on every code change.",
                "Using bloated base images like full ubuntu or debian when a distroless or alpine base cuts CVE surface area by 85%."
            ],
            "practice_exercise": "Refactor a single-stage Dockerfile into a 2-stage build with non-root USER and measure the final image size reduction."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "What is the primary technical benefit of multi-stage Docker builds for production deployment?",
                "options": [
                    "They isolate build toolchains and dependencies, yielding minimal and secure runtime images",
                    "They allow containers to bypass Linux kernel network virtualization",
                    "They automatically convert x86_64 binaries into ARM64 instructions at runtime",
                    "They allow a single Docker container to run multiple distinct operating systems simultaneously"
                ],
                "answer_idx": 0,
                "explanation": "Multi-stage builds allow developers to use large SDKs and compilers in the build stage, copying only the resulting artifacts into an unbloated runtime image."
            },
            {
                "id": "q2",
                "question": "Which Dockerfile instruction should be declared to ensure containerized processes do not execute as root?",
                "options": ["USER nonroot", "RUN chown -R root /app", "ENTRYPOINT [\"root\"]", "EXPOSE 8080"],
                "answer_idx": 0,
                "explanation": "The USER directive changes the default user from root to an unprivileged user, reducing the risk of container-breakout attacks."
            },
            {
                "id": "q3",
                "question": "Why should dependency manifests (e.g. package.json, requirements.txt) be copied and installed BEFORE application source code?",
                "options": [
                    "To leverage Docker's layer cache and prevent re-downloading packages when only source code changes",
                    "Because Docker requires dependencies to be compiled before the filesystem exists",
                    "To ensure that environment variables take precedence over package versions",
                    "To compress dependencies into read-only squash layers automatically"
                ],
                "answer_idx": 0,
                "explanation": "Docker caches each instruction layer. Placing dependency installation before application source files ensures Docker reuses the installed dependency layer unless manifests change."
            },
            {
                "id": "q4",
                "question": "What is the difference between ENTRYPOINT and CMD in a Dockerfile?",
                "options": [
                    "ENTRYPOINT defines the executable to be invoked, while CMD provides default arguments that can be overridden",
                    "ENTRYPOINT is executed on the host, while CMD is executed inside the guest container",
                    "CMD is run during image build time, while ENTRYPOINT runs only at container startup",
                    "ENTRYPOINT can only execute shell scripts, while CMD executes binary ELF executables"
                ],
                "answer_idx": 0,
                "explanation": "ENTRYPOINT sets the default command. CMD provides arguments to ENTRYPOINT, which can be easily overridden by passing arguments to 'docker run'."
            }
        ]
    },
    "system design": {
        "title": "Scalable Distributed System Architecture",
        "objective": "Master trade-offs in distributed computing: CAP theorem, caching strategies, partitioning, and asynchronous message brokering.",
        "effort_hours": 10.0,
        "difficulty_tier": "Advanced",
        "prerequisites": ["Data Structures", "HTTP Protocols", "Relational Databases"],
        "resources": [
            {"title": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer", "type": "Guide"},
            {"title": "Designing Data-Intensive Applications", "url": "https://dataintensive.net/", "type": "Book"}
        ],
        "mini_project": "Design an end-to-end distributed URL shortener or rate limiter handling 100,000 requests/sec with low latency.",
        "study_guide": {
            "key_concepts": [
                "CAP Theorem & PACELC: In network partitions, choose Consistency (CP) or Availability (AP); evaluate latency vs consistency in normal state.",
                "Caching Strategies: Cache-Aside for read-heavy loads, Write-Through for data consistency, Write-Back for high-velocity writes.",
                "Horizontal Partitioning (Sharding): Range-based, hash-based, or consistent hashing to distribute keys evenly across distributed nodes.",
                "Asynchronous Decoupling: Event-driven queues (Kafka/RabbitMQ) buffer spikes, guarantee idempotency, and eliminate cascading timeouts."
            ],
            "code_example": (
                "async def get_user_profile(user_id: str):\n"
                "    cache_key = f'profile:{user_id}'\n"
                "    cached = await redis_client.get(cache_key)\n"
                "    if cached:\n"
                "        return json.loads(cached)\n"
                "    # Cache miss: query authoritative database\n"
                "    profile = await db.query(UserProfile).filter_by(id=user_id).first()\n"
                "    if profile:\n"
                "        await redis_client.setex(cache_key, 300, json.dumps(profile.dict()))\n"
                "    return profile"
            ),
            "code_language": "python",
            "common_pitfalls": [
                "Thundering Herd Problem: Thousands of concurrent requests simultaneously querying a cold database upon cache expiration.",
                "Ignoring Eventual Consistency: Reading stale cache replicas immediately after writing without read-your-writes guarantees.",
                "Single Points of Failure (SPOF): Placing stateful session data in memory on a single application instance."
            ],
            "practice_exercise": "Architect a multi-datacenter distributed rate limiter using Redis token-bucket algorithms and sliding window counters."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "According to the CAP Theorem, what guarantee must a distributed datastore forfeit during an active network partition?",
                "options": [
                    "Either strong Consistency or high Availability across both partitions",
                    "Data encryption at rest and transport security",
                    "Horizontally scalable partition tolerance",
                    "Database schema normalization and ACID transactions"
                ],
                "answer_idx": 0,
                "explanation": "During a network partition, nodes cannot communicate. A system must either reject writes to guarantee consistency (CP) or accept writes on both sides leading to temporary inconsistency (AP)."
            },
            {
                "id": "q2",
                "question": "Which caching pattern writes data directly to both the cache and the backing database in a synchronized transaction?",
                "options": ["Write-Through", "Cache-Aside", "Write-Back (Write-Behind)", "Read-Through"],
                "answer_idx": 0,
                "explanation": "In Write-Through caching, the application writes to the cache, which synchronously updates the backing store before returning success, preventing stale data."
            },
            {
                "id": "q3",
                "question": "What is the primary benefit of Consistent Hashing when sharding requests across a dynamic pool of cache servers?",
                "options": [
                    "Only K/N keys need to be remapped on average when adding or removing a node, minimizing cache churn",
                    "It encrypts key hashes using SHA-256 for zero-trust compliance",
                    "It guarantees ACID transactions across distributed heterogeneous databases",
                    "It completely eliminates the need for replication across nodes"
                ],
                "answer_idx": 0,
                "explanation": "Consistent hashing arranges nodes in a ring. When nodes join or leave, only keys in adjacent intervals migrate, avoiding catastrophic mass-remaps."
            },
            {
                "id": "q4",
                "question": "How can distributed systems effectively safeguard against the 'Thundering Herd' problem during cache expiration?",
                "options": [
                    "By employing mutual exclusion locks (mutex) or probabilistic early expiration (XFetch)",
                    "By setting all cache keys to expire at exact midnight intervals",
                    "By increasing the database query timeout to 60 seconds",
                    "By replacing all caches with unindexed SQL tables"
                ],
                "answer_idx": 0,
                "explanation": "Distributed mutex locks allow only one worker to query the database and repopulate the cache, while other requests wait or receive stale data."
            }
        ]
    },
    "react": {
        "title": "Modern React 19 Architecture & State Mastery",
        "objective": "Deep-dive into React concurrent rendering, custom hooks, memoization semantics, server components, and performant state orchestration.",
        "effort_hours": 6.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["Modern JavaScript (ES2022+)", "HTML/CSS DOM APIs"],
        "resources": [
            {"title": "React Official Documentation", "url": "https://react.dev/", "type": "Documentation"},
            {"title": "React Architecture Patterns", "url": "https://kentcdodds.com/blog", "type": "Guide"}
        ],
        "mini_project": "Build an optimistic UI mutation system with custom caching hooks, abort controllers, and zero re-render waste.",
        "study_guide": {
            "key_concepts": [
                "Reconciliation & Virtual DOM: React compares fiber trees to batch minimal DOM modifications.",
                "Hook Rules & Closures: Keep state pure, avoid stale closure references by specifying exhaustive dependencies.",
                "Memoization: Use useMemo and useCallback selectively for expensive calculations and referential equality of callbacks.",
                "Concurrent Features: Transitions (useTransition) keep high-priority user input responsive during expensive re-renders."
            ],
            "code_example": (
                "export function useDebouncedSearch<T>(fetcher: (query: string) => Promise<T[]>, delay = 300) {\n"
                "  const [results, setResults] = useState<T[]>([]);\n"
                "  const [isPending, startTransition] = useTransition();\n\n"
                "  const handleSearch = useCallback((query: string) => {\n"
                "    const controller = new AbortController();\n"
                "    const timer = setTimeout(async () => {\n"
                "      const data = await fetcher(query);\n"
                "      startTransition(() => setResults(data));\n"
                "    }, delay);\n"
                "    return () => { clearTimeout(timer); controller.abort(); };\n"
                "  }, [fetcher, delay]);\n\n"
                "  return { results, isPending, handleSearch };\n"
                "}"
            ),
            "code_language": "typescript",
            "common_pitfalls": [
                "Mutating state directly (e.g. array.push()) instead of creating new object references prevents component re-rendering.",
                "Omitting cleanup functions in useEffect leads to memory leaks and competing async state updates.",
                "Overusing useMemo on trivial expressions adds overhead that exceeds the cost of raw re-evaluation."
            ],
            "practice_exercise": "Create a virtualized infinite scroll list using React 19 useTransition and IntersectionObserver."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "What is the primary function of React's useTransition hook in concurrent rendering?",
                "options": [
                    "To mark state updates as non-urgent transitions, keeping the user interface responsive to inputs",
                    "To animate CSS transitions between route navigations automatically",
                    "To serialize server components into JSON payloads",
                    "To bypass the React reconciliation engine and update the DOM directly"
                ],
                "answer_idx": 0,
                "explanation": "useTransition allows developers to differentiate between urgent updates (like typing in an input) and non-urgent transitions (like rendering a large filtered list)."
            },
            {
                "id": "q2",
                "question": "Why does React require state to be treated as immutable rather than mutating objects directly?",
                "options": [
                    "Because React relies on shallow reference equality checks (Object.is) to determine if re-renders are needed",
                    "Because JavaScript prohibits object property modification in browser runtimes",
                    "To force all application state to be stored in localStorage",
                    "To allow the browser garbage collector to freeze background memory"
                ],
                "answer_idx": 0,
                "explanation": "React checks whether prevProps !== nextProps using reference equality. In-place mutations preserve the same object memory address, causing React to miss the update."
            },
            {
                "id": "q3",
                "question": "What problem does the useCallback hook solve when passed to a memoized child component?",
                "options": [
                    "It preserves referential identity of the callback function across renders, preventing unnecessary child re-renders",
                    "It automatically executes asynchronous callbacks in a background web worker",
                    "It binds the function's this context to the parent DOM element",
                    "It catches uncaught exceptions thrown inside child event handlers"
                ],
                "answer_idx": 0,
                "explanation": "Inline functions get a new memory reference on every render. Wrapping them in useCallback ensures the reference remains stable as long as dependencies do not change."
            },
            {
                "id": "q4",
                "question": "What is the key advantage of React Server Components (RSCs) over traditional client components?",
                "options": [
                    "They execute exclusively on the server, sending zero JavaScript bundle weight to the client for dependencies",
                    "They completely remove the need for HTML and CSS in the browser",
                    "They allow direct two-way WebSocket data binding without client state",
                    "They automatically compile client JavaScript into WebAssembly"
                ],
                "answer_idx": 0,
                "explanation": "Server Components run on the server and render into an intermediate format. Heavy libraries used only inside RSCs do not get added to the client's JS bundle."
            }
        ]
    },
    "typescript": {
        "title": "Advanced TypeScript & Type-Level Engineering",
        "objective": "Master conditional types, template literal types, mapped types, generics constraints, and strict compile-time invariants.",
        "effort_hours": 6.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["JavaScript Fundamentals"],
        "resources": [
            {"title": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/", "type": "Documentation"},
            {"title": "Total TypeScript Tutorials", "url": "https://www.totaltypescript.com/", "type": "Interactive"}
        ],
        "mini_project": "Construct a fully type-safe API client with route-parameter extraction and schema validation.",
        "study_guide": {
            "key_concepts": [
                "Conditional Types & infer: Types that evaluate logic dynamically based on relationship tests (`T extends U ? X : Y`).",
                "Discriminated Unions: Group types using a common literal tag to enable exhaustive switch narrowing.",
                "Template Literal Types: Combine string literal unions for type-safe routing, event names, and CSS properties.",
                "Mapped Types & Modifiers: Transform property types systematically using `[K in keyof T]` with `readonly` or `?` modifiers."
            ],
            "code_example": (
                "type RouteParams<T extends string> =\n"
                "  T extends `${string}:${infer Param}/${infer Rest}`\n"
                "    ? { [K in Param | keyof RouteParams<Rest>]: string }\n"
                "    : T extends `${string}:${infer Param}`\n"
                "      ? { [K in Param]: string }\n"
                "      : Record<string, never>;\n\n"
                "// Usage:\n"
                "type Params = RouteParams<'/users/:userId/posts/:postId'>;\n"
                "// Evaluates to: { userId: string; postId: string; }"
            ),
            "code_language": "typescript",
            "common_pitfalls": [
                "Using 'any' as a quick escape hatch destroys downstream type inference and compiler safety guarantees.",
                "Not enabling 'strict: true' in tsconfig permits implicit any and loose null/undefined checking.",
                "Confusing type assertions ('as Type') with runtime type validation (Zod/Valibot)."
            ],
            "practice_exercise": "Implement a DeepPartial<T> and DeepReadonly<T> recursive mapped type utility."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "What is the purpose of the 'infer' keyword in TypeScript conditional types?",
                "options": [
                    "To declare a type variable within a condition to be deduced automatically from the matched type",
                    "To tell the compiler to ignore type checking errors for external libraries",
                    "To force dynamic runtime type checking at execute time",
                    "To cast an unknown object into a specific class constructor"
                ],
                "answer_idx": 0,
                "explanation": "'infer' introduces a new type variable within the 'extends' clause of a conditional type, allowing TypeScript to extract sub-types (e.g. ReturnType<T>)."
            },
            {
                "id": "q2",
                "question": "What constitutes a 'Discriminated Union' in TypeScript?",
                "options": [
                    "A union of object types that share a common literal property used for type narrowing",
                    "A combination of primitive types with template strings",
                    "A type that can only be accessed by authenticated users",
                    "An interface that extends multiple disparate classes simultaneously"
                ],
                "answer_idx": 0,
                "explanation": "A discriminated union has a shared discriminant property with literal types (e.g. { type: 'success' } | { type: 'error' }), enabling complete type narrowing."
            },
            {
                "id": "q3",
                "question": "What is the critical behavioral difference between 'unknown' and 'any' in TypeScript?",
                "options": [
                    "'unknown' is type-safe; values must be narrowed or asserted before performing operations, whereas 'any' disables all checks",
                    "'unknown' can only represent null and undefined",
                    "'any' performs runtime reflection while 'unknown' does not",
                    "'unknown' is compiled into WebAssembly while 'any' remains JavaScript"
                ],
                "answer_idx": 0,
                "explanation": "'unknown' is the top type that enforces safe consumption. You cannot call methods or access properties on an unknown value without first narrowing its type."
            },
            {
                "id": "q4",
                "question": "What does the 'satisfies' operator provide compared to standard type annotation?",
                "options": [
                    "It validates that an expression matches a type while preserving the expression's specific inferred type",
                    "It converts TypeScript code into runtime JSON schema specifications",
                    "It executes automated unit tests during build compilation",
                    "It forces all object keys to be optional and nullable"
                ],
                "answer_idx": 0,
                "explanation": "'satisfies' checks conformance to a contract without widening the inferred type (e.g. preserving exact string literals or method return types)."
            }
        ]
    },
    "python": {
        "title": "Modern Python 3.12+ Production Engineering",
        "objective": "Master asyncio event loops, concurrency primitives, type hints with Pydantic v2, memory management, and high-performance backend design.",
        "effort_hours": 7.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["Basic Programming Principles"],
        "resources": [
            {"title": "Official Python Documentation", "url": "https://docs.python.org/3/", "type": "Documentation"},
            {"title": "Fluent Python (2nd Edition)", "url": "https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/", "type": "Book"}
        ],
        "mini_project": "Build an asynchronous worker pool handling HTTP webhook processing with concurrency throttling and graceful shutdown.",
        "study_guide": {
            "key_concepts": [
                "GIL & Concurrency Models: Asyncio for I/O bound tasks; multiprocessing/subprocesses for CPU bound calculations.",
                "Asyncio Architecture: Event loop single-threaded cooperative multitasking using coroutines, Tasks, and Futures.",
                "Pydantic v2 Architecture: Rust-backed validation core (pydantic-core) delivering 10-20x faster model serialization.",
                "Memory & Generators: Generator expressions and itertools process large streaming datasets in O(1) memory space."
            ],
            "code_example": (
                "import asyncio\nfrom contextlib import asynccontextmanager\n\n"
                "async def fetch_item(item_id: int, sem: asyncio.Semaphore):\n"
                "    async with sem:\n"
                "        # Throttled network call\n"
                "        await asyncio.sleep(0.1)\n"
                "        return {'id': item_id, 'status': 'ok'}\n\n"
                "async def run_batch(ids: list[int], max_concurrency: int = 10):\n"
                "    sem = asyncio.Semaphore(max_concurrency)\n"
                "    tasks = [fetch_item(i, sem) for i in ids]\n"
                "    return await asyncio.gather(*tasks)"
            ),
            "code_language": "python",
            "common_pitfalls": [
                "Calling blocking I/O functions (like requests.get or time.sleep) inside async def coroutines freezes the entire event loop.",
                "Using mutable default arguments (e.g. def fn(items=[])) causes unexpected shared state across invocations.",
                "Catching bare 'except:' catches KeyboardInterrupt and SystemExit, blocking proper process termination."
            ],
            "practice_exercise": "Implement an asynchronous pipeline using asyncio.Queue with backpressure and graceful SIGTERM signal handling."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "What occurs when a blocking synchronous call (such as time.sleep(5)) is invoked inside an asyncio coroutine?",
                "options": [
                    "It blocks the entire thread's event loop, preventing all other concurrent coroutines from executing",
                    "Asyncio automatically offloads the blocking call to a secondary worker thread",
                    "The Python interpreter raises a BlockingIOError immediately",
                    "The coroutine is cancelled and rescheduled at the back of the queue"
                ],
                "answer_idx": 0,
                "explanation": "Asyncio is single-threaded cooperative multitasking. A blocking call prevents the event loop from running, freezing all pending tasks until the call finishes."
            },
            {
                "id": "q2",
                "question": "What is the recommended approach to execute heavy CPU-bound computations without blocking an async Python web service?",
                "options": [
                    "Offload the computation to a ProcessPoolExecutor using asyncio.get_running_loop().run_in_executor()",
                    "Increase the thread count in the current GIL context",
                    "Wrap the computation inside an asyncio.create_task() call",
                    "Set the Python garbage collection threshold to zero"
                ],
                "answer_idx": 0,
                "explanation": "Because of Python's Global Interpreter Lock (GIL), multi-threading does not speed up CPU-bound code. Separate processes in a ProcessPoolExecutor execute in parallel."
            },
            {
                "id": "q3",
                "question": "Why should mutable default arguments (e.g., def append_to(item, target=[])) be avoided in Python?",
                "options": [
                    "Default arguments are evaluated once at function definition time, sharing the same object across all subsequent calls",
                    "Python raises a SyntaxError when mutable defaults are passed",
                    "Mutable defaults prevent functions from returning values",
                    "They cause memory fragmentation in the garbage collector"
                ],
                "answer_idx": 0,
                "explanation": "Default parameter values are created when the function is defined. Subsequent calls that modify the default list modify the same object in memory."
            },
            {
                "id": "q4",
                "question": "What is the primary performance benefit of Pydantic v2 over Pydantic v1?",
                "options": [
                    "Its core validation engine is rewritten in Rust (pydantic-core), speeding up validation by 10-20x",
                    "It eliminates the need for type annotations in Python classes",
                    "It compiles Python models directly into C binaries at import time",
                    "It replaces all JSON serializers with unformatted XML"
                ],
                "answer_idx": 0,
                "explanation": "Pydantic v2 shifted validation and serialization logic to a compiled Rust core, resulting in dramatic performance improvements."
            }
        ]
    },
    "fastapi": {
        "title": "High-Performance APIs with FastAPI & SQLAlchemy 2.0",
        "objective": "Build asynchronous OpenAPI microservices, leverage dependency injection, manage database session lifecycles, and enforce OAuth2/JWT auth.",
        "effort_hours": 6.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["Python", "REST Architecture Basics"],
        "resources": [
            {"title": "FastAPI Official Documentation", "url": "https://fastapi.tiangolo.com/", "type": "Documentation"},
            {"title": "SQLAlchemy 2.0 Unified Tutorial", "url": "https://docs.sqlalchemy.org/en/20/tutorial/", "type": "Documentation"}
        ],
        "mini_project": "Develop a production REST service with SQLAlchemy async sessions, background tasks, rate limiting, and OpenAPI schemas.",
        "study_guide": {
            "key_concepts": [
                "Dependency Injection: Reusable parameterized dependencies (Depends) manage DB transactions and authentication tokens cleanly.",
                "Pydantic Validation: Request bodies and query parameters validate automatically and generate interactive OpenAPI documentation.",
                "Async Route Execution: Define routes as `async def` for non-blocking I/O, or `def` for synchronous tasks offloaded to threadpools.",
                "Database Lifecycles: Yielding dependencies in FastAPI cleanly guarantee session commits and rollbacks on errors."
            ],
            "code_example": (
                "from fastapi import FastAPI, Depends, HTTPException, status\n"
                "from sqlalchemy.ext.asyncio import AsyncSession\n\n"
                "async def get_db():\n"
                "    async with AsyncSessionLocal() as session:\n"
                "        try:\n"
                "            yield session\n"
                "            await session.commit()\n"
                "        except Exception:\n"
                "            await session.rollback()\n"
                "            raise\n\n"
                "@app.get('/items/{item_id}', response_model=ItemOut)\n"
                "async def read_item(item_id: str, db: AsyncSession = Depends(get_db)):\n"
                "    item = await db.get(Item, item_id)\n"
                "    if not item:\n"
                "        raise HTTPException(status_code=404, detail='Item not found')\n"
                "    return item"
            ),
            "code_language": "python",
            "common_pitfalls": [
                "Defining synchronous I/O operations inside `async def` endpoints starves the main event loop.",
                "Failing to close or rollback database sessions in exception handlers causes connection pool exhaustion.",
                "Exposing raw database models directly instead of separating request/response schemas with Pydantic."
            ],
            "practice_exercise": "Build an authenticated endpoint that processes file uploads and schedules a background worker task."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "How does FastAPI handle an endpoint defined with regular 'def' instead of 'async def'?",
                "options": [
                    "It runs the function in an external threadpool so it does not block the main event loop",
                    "It automatically converts the synchronous function into asynchronous machine code",
                    "It rejects the endpoint definition with an HTTP 500 error at startup",
                    "It pauses all incoming network traffic until the function completes"
                ],
                "answer_idx": 0,
                "explanation": "If a route is declared with standard 'def', FastAPI runs it in Starlette's threadpool so synchronous operations do not freeze the main event loop."
            },
            {
                "id": "q2",
                "question": "What is the primary benefit of utilizing FastAPI's 'Depends' dependency injection mechanism?",
                "options": [
                    "It decouples business logic, shares database sessions, and streamlines authentication with automated cleanup",
                    "It replaces the need for a web server like Uvicorn",
                    "It compiles Python classes into JavaScript for frontend consumption",
                    "It guarantees 100% database cache hit ratios"
                ],
                "answer_idx": 0,
                "explanation": "Depends enables modular, composable dependencies that FastAPI resolves automatically per request, including handling context managers and exception cleanups."
            },
            {
                "id": "q3",
                "question": "What happens when a client sends invalid JSON data to a FastAPI endpoint expecting a Pydantic model?",
                "options": [
                    "FastAPI automatically returns an HTTP 422 Unprocessable Entity with detailed field validation errors",
                    "The server crashes and restarts the Uvicorn process",
                    "FastAPI silently converts missing fields to empty strings",
                    "The request is rerouted to a 404 Not Found error page"
                ],
                "answer_idx": 0,
                "explanation": "FastAPI performs request validation using Pydantic and returns a structured 422 error detailing exactly which fields failed validation and why."
            },
            {
                "id": "q4",
                "question": "How should database transactions be safely managed across FastAPI request lifecycles?",
                "options": [
                    "Using a generator dependency with try...yield...finally to guarantee commit or rollback on error",
                    "By opening one global database connection shared across all threads without closing",
                    "By writing raw SQL scripts to a temporary file on disk",
                    "By committing transactions inside frontend JavaScript code"
                ],
                "answer_idx": 0,
                "explanation": "A generator dependency that yields the DB session ensures that the session is committed on success and rolled back and closed if an unhandled exception occurs."
            }
        ]
    },
    "sql": {
        "title": "Relational Database Design & Advanced SQL",
        "objective": "Master indexing strategies, execution plan analysis (EXPLAIN ANALYZE), window functions, CTEs, and transactional isolation levels.",
        "effort_hours": 7.0,
        "difficulty_tier": "Intermediate",
        "prerequisites": ["Basic Database Concepts"],
        "resources": [
            {"title": "PostgreSQL Official Documentation", "url": "https://www.postgresql.org/docs/", "type": "Documentation"},
            {"title": "Use The Index, Luke!", "url": "https://use-the-index-luke.com/", "type": "Guide"}
        ],
        "mini_project": "Analyze a slow analytical query using EXPLAIN ANALYZE and design composite B-Tree indexes reducing query runtime by 90%.",
        "study_guide": {
            "key_concepts": [
                "B-Tree Indexes: Optimize equality, range scans, and sorting; composite index column order follows leftmost prefix rule.",
                "EXPLAIN ANALYZE: Differentiate between sequential scans and index/bitmap scans; identify high cost operators.",
                "Window Functions: Compute running totals, rankings (DENSE_RANK), and partition aggregates without collapsing rows.",
                "ACID Isolation Levels: Read Committed vs. Repeatable Read vs. Serializable; understand dirty reads, non-repeatable reads, and phantom reads."
            ],
            "code_example": (
                "WITH RankedSalaries AS (\n"
                "  SELECT\n"
                "    employee_id,\n"
                "    department_id,\n"
                "    salary,\n"
                "    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as salary_rank\n"
                "  FROM employees\n"
                "  WHERE status = 'active'\n"
                ")\n"
                "SELECT employee_id, department_id, salary\n"
                "FROM RankedSalaries\n"
                "WHERE salary_rank <= 3;"
            ),
            "code_language": "sql",
            "common_pitfalls": [
                "Applying SQL functions on indexed columns in WHERE clauses (e.g. WHERE LOWER(email) = ...) invalidates index lookups.",
                "Using SELECT * in production prevents index-only scans and incurs massive memory and network serialization overhead.",
                "Missing foreign key indexes causing full table locks during parent record deletions."
            ],
            "practice_exercise": "Write a query utilizing window functions (LEAD/LAG) to detect month-over-month revenue growth per region."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "Why does applying a function to an indexed column (e.g. WHERE EXTRACT(year FROM created_at) = 2026) prevent standard index utilization?",
                "options": [
                    "Because the database must compute the function for every row via a sequential scan unless an expression index is defined",
                    "Because SQL standards disallow mathematical operations in WHERE conditions",
                    "Because B-Tree indexes only store string values",
                    "Because indexes are erased whenever an aggregate function is called"
                ],
                "answer_idx": 0,
                "explanation": "B-Tree indexes index raw column values. To use an index with a function, developers must create an expression-based index (e.g. CREATE INDEX ON table(EXTRACT(year FROM created_at)))."
            },
            {
                "id": "q2",
                "question": "What distinguishes window functions from standard GROUP BY aggregations in SQL?",
                "options": [
                    "Window functions compute calculations across sets of rows while retaining individual row identities",
                    "Window functions can only run on temporary tables",
                    "Window functions permanently alter table schemas",
                    "GROUP BY queries cannot be indexed by the database engine"
                ],
                "answer_idx": 0,
                "explanation": "GROUP BY collapses multiple rows into a single summary row. Window functions perform calculations over a partition without reducing the row count."
            },
            {
                "id": "q3",
                "question": "What is an 'Index-Only Scan' in modern relational databases like PostgreSQL?",
                "options": [
                    "A query execution where all requested columns reside in the index itself, avoiding table heap disk lookups entirely",
                    "A scan that deletes unindexed data to speed up execution",
                    "A scan that only runs during database maintenance windows",
                    "A scan restricted exclusively to primary key columns"
                ],
                "answer_idx": 0,
                "explanation": "If all columns in the SELECT and WHERE clauses are covered by the index (and visibility maps confirm tuple currency), the engine never touches table data pages."
            },
            {
                "id": "q4",
                "question": "In the context of database transaction isolation, what is a 'Non-Repeatable Read'?",
                "options": [
                    "When a transaction reads the same row twice and observes different data because another committed transaction modified it",
                    "When a transaction fails to write to a read-only replica",
                    "When an index is corrupted and cannot be queried repeatedly",
                    "When duplicate rows violate a unique key constraint"
                ],
                "answer_idx": 0,
                "explanation": "A non-repeatable read occurs at the Read Committed isolation level when row values change between consecutive reads within the same active transaction."
            }
        ]
    },
    "aws": {
        "title": "Cloud Architecture & Infrastructure on AWS",
        "objective": "Design highly available multi-AZ cloud infrastructures, configure IAM least privilege, VPC networking, S3 lifecycle, and ECS/EKS workloads.",
        "effort_hours": 9.0,
        "difficulty_tier": "Advanced",
        "prerequisites": ["Networking Basics", "Linux Administration"],
        "resources": [
            {"title": "AWS Well-Architected Framework", "url": "https://aws.amazon.com/architecture/well-architected/", "type": "Documentation"},
            {"title": "AWS Certified Solutions Architect Guides", "url": "https://aws.amazon.com/certification/", "type": "Guide"}
        ],
        "mini_project": "Design a resilient multi-tier VPC with public/private subnets, NAT gateways, ALB load balancing, and auto-scaling app tiers.",
        "study_guide": {
            "key_concepts": [
                "Well-Architected Pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.",
                "VPC Topology: Segregate public facing ALBs from private compute instances and isolated database subnets.",
                "IAM Least Privilege: Use role-based temporary credentials (STS) and condition keys rather than static long-lived API keys.",
                "Resilience & High Availability: Deploy across a minimum of 2-3 Availability Zones (AZs) with automated health check failovers."
            ],
            "code_example": (
                "// AWS CDK / CloudFormation representation of Least Privilege Policy\n"
                "{\n"
                "  \"Version\": \"2012-10-17\",\n"
                "  \"Statement\": [\n"
                "    {\n"
                "      \"Effect\": \"Allow\",\n"
                "      \"Action\": [\n"
                "        \"s3:GetObject\",\n"
                "        \"s3:PutObject\"\n"
                "      ],\n"
                "      \"Resource\": \"arn:aws:s3:::production-app-assets-2026/*\",\n"
                "      \"Condition\": {\n"
                "        \"Bool\": { \"aws:SecureTransport\": \"true\" }\n"
                "      }\n"
                "    }\n"
                "  ]\n"
                "}"
            ),
            "code_language": "json",
            "common_pitfalls": [
                "Placing production database instances inside public subnets with 0.0.0.0/0 inbound rules.",
                "Using root account credentials or hardcoded AWS secret keys inside application repositories.",
                "Single-AZ deployments leading to full service outages during cloud provider zone incidents."
            ],
            "practice_exercise": "Diagram a high-scale serverless event processing pipeline using API Gateway, Lambda, SQS, and DynamoDB."
        },
        "quiz": [
            {
                "id": "q1",
                "question": "What is the recommended architectural placement for database instances (e.g. Amazon RDS) in an enterprise VPC?",
                "options": [
                    "In isolated private subnets with no direct route to an Internet Gateway",
                    "In public subnets with port 5432 open to all IP addresses (0.0.0.0/0)",
                    "On the default VPC Internet Gateway itself",
                    "Inside AWS CloudFront edge locations"
                ],
                "answer_idx": 0,
                "explanation": "Databases must always reside in private subnets without direct internet routing, accessible only from authorized application security groups."
            },
            {
                "id": "q2",
                "question": "Which AWS IAM component allows EC2 instances or container tasks to securely obtain temporary credentials without storing static keys?",
                "options": ["IAM Roles", "IAM User Access Keys", "Root Account Credentials", "S3 Bucket Policies"],
                "answer_idx": 0,
                "explanation": "IAM Roles use the AWS Security Token Service (STS) to generate automatically rotating temporary credentials for compute instances and pods."
            },
            {
                "id": "q3",
                "question": "How does an Application Load Balancer (ALB) evaluate traffic health to maintain high availability?",
                "options": [
                    "By executing periodic HTTP/HTTPS health checks against target instances and routing traffic only to healthy targets",
                    "By inspecting GitHub commit logs before routing requests",
                    "By terminating all connections if a single target node latency rises above 50ms",
                    "By requiring manual confirmation from DevOps engineers"
                ],
                "answer_idx": 0,
                "explanation": "ALBs continually send health check requests to configured endpoints. When a target fails consecutive checks, the balancer stops forwarding traffic until it recovers."
            },
            {
                "id": "q4",
                "question": "What is the primary role of an AWS NAT Gateway in a Virtual Private Cloud (VPC)?",
                "options": [
                    "It allows instances in private subnets to initiate outbound internet traffic (e.g. for updates) while preventing unsolicited inbound connections",
                    "It routes public internet users directly to private database instances",
                    "It translates IPv4 addresses into domain name system (DNS) records",
                    "It encrypts all internal VPC traffic with SSL certificates automatically"
                ],
                "answer_idx": 0,
                "explanation": "A NAT Gateway enables outbound internet access for private subnet workloads without exposing them to incoming internet-initiated connections."
            }
        ]
    }
}


def get_skill_industry(skill_name: str, industry_hint: Optional[str] = None) -> str:
    """
    Identifies the industry domain for a skill (tech, data, finance, healthcare, legal,
    marketing, product, operations, engineering).
    """
    if industry_hint and industry_hint in (
        "tech", "data", "product", "finance", "healthcare",
        "marketing", "operations", "engineering", "legal"
    ):
        return industry_hint

    s = skill_name.lower().strip()

    # 1. Primary Keyword Heuristics
    if any(k in s for k in [
        'finance', 'financial', 'dcf', 'lbo', 'bloomberg', 'valuation', 'accounting',
        'gaap', 'ifrs', 'audit', 'tax', 'm&a', 'trading', 'portfolio', 'cfa', 'fp&a',
        'capital iq', 'banking', 'equity', 'debt', 'risk management', 'credit risk',
        'market risk', 'derivatives', 'fairness opinion', 'general ledger', 'hedge', 'treasury'
    ]):
        return 'finance'

    if any(k in s for k in [
        'health', 'clinical', 'medical', 'hipaa', 'ehr', 'fhir', 'hl7', 'epic', 'cerner',
        'pharmac', 'patient', 'biostatistic', 'genom', 'bioinformatics', 'biomarker',
        'drug', 'fda', 'life sciences', 'snomed', 'icd-10', 'cdisc', 'edc', 'gcp', 'hospital'
    ]):
        return 'healthcare'

    if any(k in s for k in [
        'legal', 'compliance', 'gdpr', 'ccpa', 'cpra', 'contract', 'regulatory', 'privacy',
        'dpa', 'aml', 'kyc', 'fincen', 'policy drafting', 'litigation', 'e-discovery',
        'sanctions', 'ethics', 'fcpa', 'ironclad', 'cloc', 'statutory', 'law'
    ]):
        return 'legal'

    if any(k in s for k in [
        'marketing', 'seo', 'sem', 'content', 'growth', 'cac', 'ltv', 'copywriting',
        'brand', 'social media', 'advertising', 'funnel', 'campaign', 'attribution',
        'google analytics', 'cro', 'battlecard', 'demand gen', 'pr management', 'public relations'
    ]):
        return 'marketing'

    if any(k in s for k in [
        'product manager', 'product design', 'ui/ux', 'ux research', 'wirefram', 'figma',
        'design system', 'design token', 'user interview', 'usability', 'user journey',
        'persona', 'roadmap', 'prd', 'story mapping', 'heuristic', 'card sort', 'product strategy'
    ]):
        return 'product'

    if any(k in s for k in [
        'scrum', 'agile', 'kanban', 'sprint', 'operations', 'supply chain', 'recruiting',
        'talent', 'hrbp', 'procurement', 'vendor management', 'logistics', 'inventory',
        'sla', 'onboarding', 'safe', 'greenhouse', 'lever', 'impediment', 'people operations'
    ]):
        return 'operations'

    if any(k in s for k in [
        'pcb', 'cad', 'solidworks', 'hardware', 'schematic', 'soldering', 'oscilloscope',
        'fpga', 'thermal simulation', 'fea', 'robotics', 'ros', 'kinematics', 'sensor fusion',
        'motor actuation', 'altium', 'kicad', 'dfm', 'dfa', 'gd&t', 'spice', 'mechatronics'
    ]):
        return 'engineering'

    if any(k in s for k in [
        'data', 'sql', 'spark', 'pandas', 'analytics', 'tableau', 'power bi', 'looker',
        'dbt', 'snowflake', 'bigquery', 'machine learning', 'deep learning', 'pytorch',
        'tensorflow', 'scikit', 'statistic', 'etl', 'data lake', 'pipeline', 'bi analyst',
        'data scientist', 'data engineer'
    ]):
        return 'data'

    # 2. Exact match in non-tech CAREER_ROLES first, then tech
    for r in CAREER_ROLES.values():
        ind = r.get("industry_id")
        if ind != 'tech':
            for sk in r.get("core_skills", []) + r.get("advanced_skills", []):
                if sk.lower().strip() == s:
                    return ind

    for r in CAREER_ROLES.values():
        ind = r.get("industry_id")
        for sk in r.get("core_skills", []) + r.get("advanced_skills", []):
            if sk.lower().strip() == s:
                return ind

    return 'tech'


def get_skill_metadata(skill_name: str, industry_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves rich curated metadata, study guides, and verification quizzes for a skill.
    If not found in the curated list, dynamically generates a domain-calibrated metadata object
    calibrated to the skill's industry domain (Finance, Healthcare, Legal, Marketing, Product, Ops, Engineering, Data, Tech).
    """
    key = skill_name.lower().strip()
    for meta_key, val in SKILL_LEARNING_METADATA.items():
        if meta_key in key or key in meta_key:
            return val

    domain = get_skill_industry(skill_name, industry_hint)
    canon = canonical_skill(skill_name) or skill_name.title()

    if domain == "finance":
        return {
            "title": f"Financial Strategy, Valuation & Execution in {canon}",
            "objective": f"Develop comprehensive competence in {canon}, financial statement analysis, valuation rigor, scenario stress-testing, and compliance with statutory accounting standards.",
            "effort_hours": 6.0,
            "difficulty_tier": "Advanced",
            "prerequisites": ["Financial Accounting Principles", "Corporate Finance Basics"],
            "resources": [
                {"title": f"Corporate Finance Institute - {canon} Guide", "url": f"https://www.google.com/search?q={canon}+corporate+finance+institute", "type": "Documentation"},
                {"title": f"Valuation & Financial Modeling Best Practices for {canon}", "url": f"https://www.google.com/search?q={canon}+valuation+modeling+best+practices", "type": "Article"},
                {"title": f"Hands-on {canon} Financial Modeling Lab", "url": f"https://www.google.com/search?q={canon}+financial+modeling+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Build a dynamic financial model analyzing multi-year scenarios in {canon} with variance analysis and formula integrity checks.",
            "study_guide": {
                "key_concepts": [
                    f"Financial Valuation & Projections: Establish robust forecasting methodologies and core drivers in {canon}.",
                    f"Formula Integrity & Sensitivity Testing: Conduct sensitivity and scenario stress-testing on interest rate and macro variables in {canon}.",
                    f"Accounting & Statutory Compliance: Ensure alignment with GAAP/IFRS standards, audit trails, and reconciliation controls for {canon}.",
                    f"Fiduciary Governance & Capital Allocation: Evaluate hurdle rates, capital structure, and risk-adjusted return on investment."
                ],
                "code_example": (
                    f"# Financial Modeling & Valuation Framework for {canon}\n"
                    f"# Demonstrates dynamic scenario testing, net present value, and audit reconciliation\n"
                    f"def calculate_financial_scenario(cash_flows: list, discount_rate: float = 0.08) -> dict:\n"
                    f"    npv = sum(cf / ((1 + discount_rate) ** idx) for idx, cf in enumerate(cash_flows))\n"
                    f"    return {{\n"
                    f"        'skill': '{canon}',\n"
                    f"        'npv': round(npv, 2),\n"
                    f"        'discount_rate': discount_rate,\n"
                    f"        'status': 'audit_verified'\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Failing to conduct multi-variable sensitivity analysis when projecting outcomes in {canon}.",
                    f"Hardcoding dynamic assumptions directly inside calculation cells rather than dedicated assumption blocks.",
                    f"Overlooking working capital adjustments and non-cash reconciliation items in {canon} valuations."
                ],
                "practice_exercise": f"Construct a dynamic multi-scenario financial model in {canon} incorporating variance analysis and formula integrity auditing."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"What is a critical best practice to maintain model integrity and auditability when working with {canon}?",
                    "options": [
                        "Separating input assumptions, calculations, and presentation outputs with dynamic formula linking and automated balance checks",
                        "Hardcoding projected figures directly inside calculation formulas to accelerate model completion",
                        "Using unlinked standalone worksheets with manual copy-pasting",
                        "Disabling circular reference checks and variance auditing"
                    ],
                    "answer_idx": 0,
                    "explanation": "Robust financial modeling requires separating inputs, calculations, and presentation tabs with automated reconciliation checks to prevent spreadsheet errors."
                },
                {
                    "id": "q2",
                    "question": f"When stress-testing assumptions in {canon}, which methodology provides the most rigorous risk assessment?",
                    "options": [
                        "Multi-variable sensitivity analysis and Monte Carlo scenario modeling across economic cycles",
                        "Assuming a single historical growth rate will remain constant indefinitely",
                        "Optimistic best-case modeling without downside scenario testing",
                        "Ignoring cost of capital fluctuations and currency shifts"
                    ],
                    "answer_idx": 0,
                    "explanation": "Multi-variable sensitivity and scenario testing reveal capital vulnerabilities under adverse market conditions."
                },
                {
                    "id": "q3",
                    "question": f"Under statutory accounting standards (GAAP/IFRS), how should transactions related to {canon} be documented?",
                    "options": [
                        "With verifiable transaction source documents, clear reconciliation trails, and consistent revenue recognition principles",
                        "Through informal verbal agreements without written audit trails",
                        "By netting revenues and expenses without disclosing gross figures",
                        "By altering past ledger entries without audit timestamps"
                    ],
                    "answer_idx": 0,
                    "explanation": "Fiduciary accounting mandates immutable audit trails, documented reconciliations, and compliance with statutory standards."
                },
                {
                    "id": "q4",
                    "question": f"What is the key metric used to evaluate risk-adjusted returns when deploying capital into {canon}?",
                    "options": [
                        "Comparing Net Present Value (NPV) and Internal Rate of Return (IRR) against the Weighted Average Cost of Capital (WACC)",
                        "Evaluating total revenue growth while ignoring cost of capital",
                        "Relying solely on arbitrary payback periods without discounting cash flows",
                        "Maximizing raw leverage without monitoring debt covenant limits"
                    ],
                    "answer_idx": 0,
                    "explanation": "Capital allocation requires comparing expected returns (NPV/IRR) against the hurdle rate (WACC) to ensure shareholder value creation."
                }
            ]
        }

    elif domain == "healthcare":
        return {
            "title": f"Clinical Protocols, Governance & Informatics in {canon}",
            "objective": f"Develop rigorous proficiency in {canon}, patient data privacy (HIPAA), regulatory compliance (GCP/FDA), clinical workflow integration, and evidence-based protocols.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Health Informatics Principles", "Clinical Protocol Standards"],
            "resources": [
                {"title": f"NIH / HL7 Official Guidelines for {canon}", "url": f"https://www.google.com/search?q={canon}+hl7+fhir+guidelines", "type": "Documentation"},
                {"title": f"HIPAA Compliance & Clinical Data Best Practices in {canon}", "url": f"https://www.google.com/search?q={canon}+hipaa+clinical+data+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Healthcare Data Lab", "url": f"https://www.google.com/search?q={canon}+healthcare+informatics+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Build a compliant data pipeline verifying patient record integrity and HIPAA audit compliance for {canon}.",
            "study_guide": {
                "key_concepts": [
                    f"Patient Privacy & HIPAA Safeguards: Protect PHI with encryption, role-based access control, and complete audit trails in {canon}.",
                    f"Interoperability & Data Standards: Implement semantic data exchange using HL7 FHIR and standard terminologies (SNOMED, ICD-10) for {canon}.",
                    f"Clinical Safety & Decision Support: Design validated protocols and decision support rules with verified physician oversight.",
                    f"Regulatory Compliance & Trial Integrity: Ensure adherence to FDA guidelines and Good Clinical Practice (GCP) standards."
                ],
                "code_example": (
                    f"# Clinical Data Governance & Interoperability for {canon}\n"
                    f"# De-identifies PHI and validates protocol constraints according to HIPAA\n"
                    f"import hashlib\n"
                    f"def validate_clinical_patient_record(patient_record: dict) -> dict:\n"
                    f"    mrn = patient_record.get('mrn', 'UNKNOWN')\n"
                    f"    pseudo_id = hashlib.sha256(mrn.encode('utf-8')).hexdigest()[:12]\n"
                    f"    return {{\n"
                    f"        'study_subject_id': pseudo_id,\n"
                    f"        'domain': '{canon}',\n"
                    f"        'protocol_compliant': True,\n"
                    f"        'phi_safeguarded': True\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Transmitting unencrypted Protected Health Information (PHI) in logs or external APIs during {canon} workflows.",
                    f"Failing to maintain comprehensive audit trails for access to medical records in {canon}.",
                    f"Neglecting HL7/FHIR terminological mappings, causing clinical semantic mismatches across systems."
                ],
                "practice_exercise": f"Implement a compliant data pipeline verifying patient record integrity and HIPAA audit compliance for {canon}."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"Under HIPAA regulations, how must Protected Health Information (PHI) associated with {canon} be handled?",
                    "options": [
                        "Encrypted in transit and at rest, restricted by role-based minimum necessary access, and tracked with access logs",
                        "Stored in unencrypted shared spreadsheets accessible to all hospital staff",
                        "Shared freely over unencrypted email channels for clinical convenience",
                        "Stored without audit logs or authentication requirements"
                    ],
                    "answer_idx": 0,
                    "explanation": "HIPAA Security Rule mandates technical safeguards including encryption, role-based access control (RBAC), and comprehensive audit logging."
                },
                {
                    "id": "q2",
                    "question": f"What is the primary objective of data standards such as HL7 FHIR when working with {canon}?",
                    "options": [
                        "Facilitating semantic interoperability and secure real-time health data exchange across disparate EHR systems",
                        "Restricting patient data access to proprietary single-vendor software",
                        "Replacing all clinical laboratory tests with manual paperwork",
                        "Removing all diagnostic coding standards such as SNOMED and ICD-10"
                    ],
                    "answer_idx": 0,
                    "explanation": "HL7 FHIR provides modular RESTful resources that enable interoperable clinical data exchange across diverse healthcare systems."
                },
                {
                    "id": "q3",
                    "question": f"In clinical research and data governance for {canon}, what does adherence to Good Clinical Practice (GCP) guarantee?",
                    "options": [
                        "The rights, safety, and well-being of trial participants are protected and clinical data is credible and auditable",
                        "Faster drug approval by skipping patient informed consent procedures",
                        "Elimination of institutional review board (IRB) oversight",
                        "Publishing unblinded trial results before study completion"
                    ],
                    "answer_idx": 0,
                    "explanation": "GCP guidelines protect human subject rights and guarantee the scientific integrity and reproducibility of clinical trial data."
                },
                {
                    "id": "q4",
                    "question": f"When clinical decision support systems utilize {canon}, what safety mechanism is essential?",
                    "options": [
                        "Clear clinician oversight, evidence-based reference citations, and real-time alert validation",
                        "Fully autonomous drug dosing changes without physician verification",
                        "Silencing all contraindication and allergy alerts to prevent alert fatigue",
                        "Obscuring the medical rationale from the attending care team"
                    ],
                    "answer_idx": 0,
                    "explanation": "Safe clinical informatics systems keep clinicians in the loop with transparent, evidence-based alerts and validation boundaries."
                }
            ]
        }

    elif domain == "legal":
        return {
            "title": f"Regulatory Compliance & Applied Legal Architecture in {canon}",
            "objective": f"Build specialized expertise in {canon}, statutory interpretation, contract clause negotiation, regulatory compliance, risk mitigation, and audit readiness.",
            "effort_hours": 6.0,
            "difficulty_tier": "Advanced",
            "prerequisites": ["Regulatory Law Fundamentals", "Corporate Governance"],
            "resources": [
                {"title": f"Official Regulatory Compliance Framework for {canon}", "url": f"https://www.google.com/search?q={canon}+regulatory+compliance+framework", "type": "Documentation"},
                {"title": f"Corporate Risk Assessment & Contract Best Practices in {canon}", "url": f"https://www.google.com/search?q={canon}+corporate+compliance+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Policy Governance Lab", "url": f"https://www.google.com/search?q={canon}+legal+compliance+audit+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Formulate a structured compliance checklist and policy governance framework for {canon}.",
            "study_guide": {
                "key_concepts": [
                    f"Statutory Interpretation: Analyze regulatory directives and corporate obligations in {canon}.",
                    f"Contract Risk & Indemnification: Structure robust liability boundaries, indemnity triggers, and dispute clauses for {canon}.",
                    f"Privacy & Data Protection: Enforce GDPR, CCPA/CPRA, and cross-border transfer compliance with signed DPAs.",
                    f"Audit Readiness & Ethics: Maintain documented compliance review logs and anti-corruption controls."
                ],
                "code_example": (
                    f"// Regulatory Compliance Policy Matrix for {canon}\n"
                    f"export const {re.sub(r'[^A-Za-z0-9]', '', canon)}GovernancePolicy = {{\n"
                    f"  framework: '{canon}',\n"
                    f"  status: 'enforced',\n"
                    f"  controls: [\n"
                    f"    {{ id: 'REG-01', requirement: 'Data minimization', verified: true }},\n"
                    f"    {{ id: 'REG-02', requirement: 'Statutory audit trail', verified: true }}\n"
                    f"  ],\n"
                    f"  auditTimestamp: new Date().toISOString()\n"
                    f"}};\n"
                ),
                "code_language": "typescript",
                "common_pitfalls": [
                    f"Failing to track cross-border data transfer adequacy mechanisms in {canon} policies.",
                    f"Ambiguously drafted liability indemnification clauses exposing organizations to uncapped risk in {canon}.",
                    f"Lack of routine vendor compliance audits and contract renewals under {canon} obligations."
                ],
                "practice_exercise": f"Formulate a structured compliance checklist and policy governance framework for {canon}."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"Under corporate compliance and privacy frameworks (e.g. GDPR/CCPA), what is a core requirement when managing {canon}?",
                    "options": [
                        "Maintaining documented legal basis for processing, data minimization, and responding to data subject requests within statutory timelines",
                        "Retaining all personal and corporate records indefinitely without review",
                        "Transferring sensitive data to unvetted third parties without Data Processing Agreements (DPAs)",
                        "Exempting executive personnel from anti-corruption and compliance oversight"
                    ],
                    "answer_idx": 0,
                    "explanation": "Modern data privacy and compliance laws demand lawful processing bases, minimal data retention, and strict statutory response workflows."
                },
                {
                    "id": "q2",
                    "question": f"When drafting and negotiating contractual agreements covering {canon}, how should liability risk be mitigated?",
                    "options": [
                        "Through clearly defined liability caps, mutual indemnification boundaries, and explicit disclaimers of consequential damages",
                        "By accepting unlimited uncapped liability for all third-party actions",
                        "Omitting governing law and dispute resolution mechanisms",
                        "Relying on ambiguous verbal agreements rather than written clauses"
                    ],
                    "answer_idx": 0,
                    "explanation": "Effective legal contracting establishes precise caps on liability, well-defined indemnity triggers, and dispute arbitration venues."
                },
                {
                    "id": "q3",
                    "question": f"What is the primary function of an internal compliance audit for {canon}?",
                    "options": [
                        "Proactively discovering regulatory gaps, assessing risk severity, and implementing corrective action plans before external regulator inquiry",
                        "Concealing compliance deviations from external auditors",
                        "Overriding statutory disclosure mandates",
                        "Disciplining employees without investigation"
                    ],
                    "answer_idx": 0,
                    "explanation": "Internal compliance audits evaluate operational controls against regulatory requirements to remediate gaps proactively."
                },
                {
                    "id": "q4",
                    "question": f"Under anti-money laundering (AML) and anti-bribery (FCPA) guidelines applicable to {canon}, what is mandatory?",
                    "options": [
                        "Risk-based Know Your Customer (KYC) screening, beneficial ownership verification, and suspicious activity reporting",
                        "Processing transactions without verifying the identity of foreign counterparts",
                        "Facilitating payments through undocumented offshore accounts",
                        "Deleting transaction logs after 30 days"
                    ],
                    "answer_idx": 0,
                    "explanation": "AML and anti-corruption regulations mandate beneficial ownership verification, transaction monitoring, and SAR filings."
                }
            ]
        }

    elif domain == "marketing":
        return {
            "title": f"Growth Analytics, GTM Strategy & Optimization in {canon}",
            "objective": f"Develop high-impact capabilities in {canon}, multi-touch attribution, conversion rate optimization, audience segmentation, and ROI measurement.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Marketing Fundamentals", "Growth Analytics"],
            "resources": [
                {"title": f"Official Growth Strategy & Playbook for {canon}", "url": f"https://www.google.com/search?q={canon}+growth+marketing+strategy", "type": "Documentation"},
                {"title": f"Conversion Rate Optimization & Funnel Analytics in {canon}", "url": f"https://www.google.com/search?q={canon}+cro+funnel+analytics", "type": "Article"},
                {"title": f"Interactive {canon} Marketing Analytics Lab", "url": f"https://www.google.com/search?q={canon}+marketing+experimentation+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Design an end-to-end campaign experiment in {canon} with KPI attribution tracking and cohort retention analysis.",
            "study_guide": {
                "key_concepts": [
                    f"Attribution Modeling: Deploy multi-touch and algorithmic attribution to assess true channel efficiency in {canon}.",
                    f"Conversion Rate Optimization: Formulate data-driven A/B testing hypotheses with statistical rigor for {canon}.",
                    f"Unit Economics & LTV:CAC: Measure payback velocity, gross margin contribution, and customer churn dynamics.",
                    f"Audience Segmentation & Retention: Leverage behavioral cohort analysis to increase customer lifetime value."
                ],
                "code_example": (
                    f"# Marketing Analytics & CAC/LTV Model for {canon}\n"
                    f"def evaluate_marketing_efficiency(spend: float, new_customers: int, arpu: float, churn_rate: float) -> dict:\n"
                    f"    cac = spend / max(new_customers, 1)\n"
                    f"    ltv = arpu / max(churn_rate, 0.01)\n"
                    f"    ratio = ltv / max(cac, 1.0)\n"
                    f"    return {{\n"
                    f"        'skill': '{canon}',\n"
                    f"        'cac': round(cac, 2),\n"
                    f"        'ltv': round(ltv, 2),\n"
                    f"        'ltv_cac_ratio': round(ratio, 2),\n"
                    f"        'healthy_unit_economics': ratio >= 3.0\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Relying solely on last-touch attribution models, ignoring top-of-funnel contribution in {canon}.",
                    f"Declaring A/B test winners prematurely before achieving statistical significance in {canon}.",
                    f"Failing to account for customer churn when estimating lifetime value (LTV) for {canon} campaigns."
                ],
                "practice_exercise": f"Design an end-to-end campaign experiment in {canon} with KPI attribution tracking and cohort retention analysis."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"When measuring return on marketing investment in {canon}, why is multi-touch attribution superior to single-touch models?",
                    "options": [
                        "It credits all customer touchpoints across the funnel (awareness, nurture, conversion) rather than only the first or last interaction",
                        "It attributes 100% of revenue to the final paid ad click regardless of prior interactions",
                        "It eliminates the need to track customer acquisition costs",
                        "It guarantees zero customer churn across campaigns"
                    ],
                    "answer_idx": 0,
                    "explanation": "Multi-touch attribution models accurately distribute revenue credit across all awareness, nurture, and conversion touchpoints."
                },
                {
                    "id": "q2",
                    "question": f"In conversion rate optimization (CRO) experiments for {canon}, what is required before declaring a winning variant?",
                    "options": [
                        "Achieving statistical significance (e.g. 95% confidence level) with sufficient sample size and minimum test duration",
                        "Stopping the test after the first 2 hours when one variant has 3 conversions",
                        "Selecting the variant preferred by the internal marketing team regardless of user data",
                        "Running tests without an identified control baseline"
                    ],
                    "answer_idx": 0,
                    "explanation": "A/B testing requires statistical significance and adequate sample size to avoid false positive declarations caused by traffic anomalies."
                },
                {
                    "id": "q3",
                    "question": f"What is considered a healthy benchmark for the Customer Lifetime Value to Customer Acquisition Cost (LTV:CAC) ratio in {canon}?",
                    "options": [
                        "An LTV:CAC ratio of 3:1 or higher, indicating sustainable unit economics and profitable acquisition",
                        "An LTV:CAC ratio of 0.5:1, where acquisition cost exceeds customer lifetime gross profit",
                        "A negative ratio where customers cost more than total lifetime revenue",
                        "A ratio of 1:1 where zero gross margin remains for operating expenses"
                    ],
                    "answer_idx": 0,
                    "explanation": "An LTV:CAC ratio of 3:1 or greater represents healthy unit economics allowing profitable reinvestment in growth channels."
                },
                {
                    "id": "q4",
                    "question": f"When executing search engine optimization (SEO) and organic growth for {canon}, what strategy drives sustainable rankings?",
                    "options": [
                        "High-quality comprehensive content matching search intent, strong technical Core Web Vitals, and authoritative backlinks",
                        "Keyword stuffing repetitive phrases across low-quality thin content",
                        "Purchasing hundreds of spam backlinks from link farms",
                        "Hiding white text keywords on white backgrounds to trick search engine crawlers"
                    ],
                    "answer_idx": 0,
                    "explanation": "Modern search algorithms reward content quality, search intent alignment, technical performance (Core Web Vitals), and domain authority."
                }
            ]
        }

    elif domain == "product":
        return {
            "title": f"User-Centered Product Architecture & Discovery in {canon}",
            "objective": f"Master {canon} methodologies, product requirements discovery, design systems, usability research synthesis, and cross-functional roadmapping.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Product Discovery Basics", "User Experience Principles"],
            "resources": [
                {"title": f"Product Management & UX Architecture for {canon}", "url": f"https://www.google.com/search?q={canon}+product+management+ux+guide", "type": "Documentation"},
                {"title": f"Design Systems & Product Discovery Best Practices in {canon}", "url": f"https://www.google.com/search?q={canon}+product+design+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Product Spec & Usability Lab", "url": f"https://www.google.com/search?q={canon}+product+requirements+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Draft a comprehensive product requirement document (PRD) and feature roadmap in {canon} with quantitative validation criteria.",
            "study_guide": {
                "key_concepts": [
                    f"Problem Discovery & Validation: Conduct user interviews, heuristic evaluations, and card sorting in {canon}.",
                    f"Prioritization Frameworks: Apply RICE, Kano, and MoSCoW methodologies to score trade-offs objectively for {canon}.",
                    f"Design Systems & Tokens: Maintain scalable design tokens, WCAG 2.1 accessibility, and component libraries.",
                    f"Outcome Metrics & KPIs: Establish North Star metrics and measurable leading indicators for product success."
                ],
                "code_example": (
                    f"// Product Specification Schema for {canon}\n"
                    f"export const {re.sub(r'[^A-Za-z0-9]', '', canon)}Spec = {{\n"
                    f"  title: '{canon} Initiative',\n"
                    f"  problemStatement: 'Users require intuitive workflows for {canon}',\n"
                    f"  priorityScore: {{ reach: 1000, impact: 3, confidence: 0.8, effort: 2 }},\n"
                    f"  riceScore: 1200,\n"
                    f"  successMetric: 'Weekly Task Completion Rate +20%'\n"
                    f"}};\n"
                ),
                "code_language": "typescript",
                "common_pitfalls": [
                    f"Building features in {canon} without validating problem hypotheses with real target users.",
                    f"Lacking measurable North Star outcome metrics, focusing only on output velocity in {canon}.",
                    f"Letting scope creep dilute the core user value proposition of {canon}."
                ],
                "practice_exercise": f"Draft a comprehensive product requirement document (PRD) and feature roadmap in {canon} with quantitative validation criteria."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"When using the RICE prioritization framework in {canon}, how is the prioritization score computed?",
                    "options": [
                        "(Reach × Impact × Confidence) ÷ Effort",
                        "(Effort × Cost) ÷ Reach",
                        "Impact + Velocity - Effort",
                        "Reach ÷ (Impact + Confidence)"
                    ],
                    "answer_idx": 0,
                    "explanation": "The RICE framework balances Reach, Impact, and Confidence against Effort to objectively score feature initiatives."
                },
                {
                    "id": "q2",
                    "question": f"In UX research and discovery for {canon}, what is the primary benefit of conducting qualitative usability testing with 5 users?",
                    "options": [
                        "Uncovering roughly 80% of the most critical usability defects and workflow friction points before development starts",
                        "Gathering statistically significant quantitative market sizing data",
                        "Eliminating the need to write engineering product requirements",
                        "Replacing all customer analytics and event tracking"
                    ],
                    "answer_idx": 0,
                    "explanation": "Jakob Nielsen's heuristic shows that 5 users in qualitative usability testing typically identify ~80% of usability flaws."
                },
                {
                    "id": "q3",
                    "question": f"What is the role of Design Tokens when managing Design Systems in {canon}?",
                    "options": [
                        "Providing platform-agnostic design decisions (colors, spacing, typography) that synchronize design and frontend code automatically",
                        "Restricting designers to using only black-and-white wireframes",
                        "Bypassing all accessibility standards in mobile applications",
                        "Hardcoding hex codes directly inside CSS files without variables"
                    ],
                    "answer_idx": 0,
                    "explanation": "Design tokens represent the atomic design decisions that maintain consistency across Figma and multi-platform codebases."
                },
                {
                    "id": "q4",
                    "question": f"How should a Product Manager define a feature's Acceptance Criteria for {canon}?",
                    "options": [
                        "Using clear, testable Given/When/Then scenarios that define exact functional and boundary behaviors",
                        "Writing vague subjective guidelines like 'the interface should look modern'",
                        "Leaving all edge case handling undefined until after launch",
                        "Specifying only the happy path without error states"
                    ],
                    "answer_idx": 0,
                    "explanation": "Rigorous acceptance criteria use behavior-driven Given/When/Then syntax to align engineering, design, and QA on expected outcomes."
                }
            ]
        }

    elif domain == "operations":
        return {
            "title": f"Operational Excellence, Workflow Architecture & Scaling in {canon}",
            "objective": f"Implement best-in-class {canon} workflows, continuous process improvement, agile team orchestration, and operational SLA governance.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Operations Management Basics", "Process Optimization"],
            "resources": [
                {"title": f"Operational Excellence Framework for {canon}", "url": f"https://www.google.com/search?q={canon}+operational+excellence+framework", "type": "Documentation"},
                {"title": f"Agile Delivery & Process Optimization in {canon}", "url": f"https://www.google.com/search?q={canon}+process+optimization+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Operations Governance Lab", "url": f"https://www.google.com/search?q={canon}+operations+workflow+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Map out a streamlined standard operating procedure (SOP) and escalation runbook for {canon}.",
            "study_guide": {
                "key_concepts": [
                    f"Theory of Constraints: Identify and eliminate throughput bottlenecks in {canon} operating workflows.",
                    f"SLA & Vendor Governance: Monitor delivery against contracted service levels with automated telemetry.",
                    f"Agile Scrum Orchestration: Facilitate sprint ceremonies, velocity estimation, and blocker removal for {canon}.",
                    f"Continuous Process Improvement: Apply Kaizen and Root Cause Analysis (RCA) to eliminate recurring operational defects."
                ],
                "code_example": (
                    f"# Operational Incident & SLA Governance Policy for {canon}\n"
                    f"def evaluate_sla_compliance(resolution_time_minutes: int, sla_threshold: int = 120) -> dict:\n"
                    f"    is_compliant = resolution_time_minutes <= sla_threshold\n"
                    f"    return {{\n"
                    f"        'domain': '{canon}',\n"
                    f"        'resolution_minutes': resolution_time_minutes,\n"
                    f"        'sla_threshold': sla_threshold,\n"
                    f"        'sla_passed': is_compliant,\n"
                    f"        'status': 'PASSED' if is_compliant else 'ESCALATION_TRIGGERED'\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Establishing SLAs in {canon} without clear escalation paths and ownership responsibilities.",
                    f"Failing to analyze root cause bottlenecks, managing recurring defects with ad-hoc patches in {canon}.",
                    f"Managing mission-critical operations with fragmented, untracked spreadsheets instead of unified platforms."
                ],
                "practice_exercise": f"Map out a streamlined standard operating procedure (SOP) and escalation runbook for {canon}."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"Under the Theory of Constraints in operations for {canon}, what is the first step to improve overall system throughput?",
                    "options": [
                        "Identify the primary system bottleneck, optimize its capacity, and subordinate all non-bottleneck processes to its cadence",
                        "Accelerate non-bottleneck steps, causing massive inventory buildup in front of the bottleneck",
                        "Fire team members without analyzing workflow dependencies",
                        "Ignore work-in-progress (WIP) limits across teams"
                    ],
                    "answer_idx": 0,
                    "explanation": "Throughput is determined by the bottleneck; optimizing non-bottlenecks creates excess work-in-progress without increasing delivery."
                },
                {
                    "id": "q2",
                    "question": f"When managing Service Level Agreements (SLAs) and vendor contracts in {canon}, what governance mechanism prevents disputes?",
                    "options": [
                        "Well-defined objective metrics, automated telemetry reporting, clear escalation paths, and financial penalty/credit clauses",
                        "Relying on subjective quarterly verbal feedback without metric logs",
                        "Omitting remedy clauses for persistent downtime or missed deliverables",
                        "Accepting vendor-provided unverified metrics without independent auditability"
                    ],
                    "answer_idx": 0,
                    "explanation": "Contractual SLAs require objective automated metrics, verified reporting, and enforceable remedies for non-performance."
                },
                {
                    "id": "q3",
                    "question": f"In Agile Scrum operations for {canon}, what is the primary purpose of the Sprint Retrospective ceremony?",
                    "options": [
                        "Enabling the team to inspect processes, identify impediments, and commit to concrete continuous improvement actions for the next sprint",
                        "Assigning blame to individual contributors for missed tickets",
                        "Reviewing corporate financial balance sheets",
                        "Extending the sprint deadline without team consultation"
                    ],
                    "answer_idx": 0,
                    "explanation": "The Retrospective empowers agile teams to inspect their teamwork, eliminate waste, and implement continuous process improvement."
                },
                {
                    "id": "q4",
                    "question": f"How does tracking Work-in-Progress (WIP) limits improve team velocity in {canon}?",
                    "options": [
                        "It minimizes multitasking context-switching overhead, accelerates cycle time, and reveals blockers immediately",
                        "It forces everyone to start 10 different tasks simultaneously without finishing any",
                        "It hides workflow bottlenecks by masking team capacity",
                        "It eliminates the need for sprint planning"
                    ],
                    "answer_idx": 0,
                    "explanation": "Limiting WIP reduces cognitive context-switching, speeds up cycle time from start to completion, and surfaces delivery bottlenecks."
                }
            ]
        }

    elif domain == "engineering":
        return {
            "title": f"Precision Systems, Kinematics & Applied Engineering in {canon}",
            "objective": f"Design and validate {canon} architectures, mechanical/electrical tolerances, thermal characteristics, and automated hardware-in-the-loop tests.",
            "effort_hours": 6.0,
            "difficulty_tier": "Advanced",
            "prerequisites": ["Engineering Mechanics & Circuits", "CAD / Simulation Basics"],
            "resources": [
                {"title": f"Hardware & Systems Engineering Principles for {canon}", "url": f"https://www.google.com/search?q={canon}+hardware+engineering+principles", "type": "Documentation"},
                {"title": f"GD&T & Tolerance Analysis Best Practices in {canon}", "url": f"https://www.google.com/search?q={canon}+gdt+tolerance+analysis", "type": "Article"},
                {"title": f"Interactive {canon} Hardware Design Lab", "url": f"https://www.google.com/search?q={canon}+circuit+cad+simulation+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Construct a verification test protocol and tolerance budget for {canon} under environmental stress.",
            "study_guide": {
                "key_concepts": [
                    f"GD&T & Mechanical Tolerance: Design precise fits and assemblies following ASME Y14.5 standards in {canon}.",
                    f"Signal Integrity & High-Speed Layout: Manage impedance, return paths, and EMC compliance for {canon}.",
                    f"Kinematics & Control Systems: Model forward/inverse kinematics, sensor fusion, and actuator controls.",
                    f"Thermal & Environmental Reliability: Perform thermal finite element analysis (FEA) and failure mode mitigation (FMEA)."
                ],
                "code_example": (
                    f"# Hardware Telemetry & Tolerance Verification for {canon}\n"
                    f"def verify_hardware_tolerances(measured: float, nominal: float, tolerance: float) -> dict:\n"
                    f"    deviation = abs(measured - nominal)\n"
                    f"    in_spec = deviation <= tolerance\n"
                    f"    return {{\n"
                    f"        'subsystem': '{canon}',\n"
                    f"        'deviation': round(deviation, 4),\n"
                    f"        'tolerance_limit': tolerance,\n"
                    f"        'status': 'PASS' if in_spec else 'FAIL_OUT_OF_SPEC'\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Overlooking thermal dissipation limits under sustained peak load in {canon}.",
                    f"Neglecting tolerance stack-up analysis across mechanical interfaces in {canon}.",
                    f"Failing to perform EMC pre-compliance scans early in hardware prototyping for {canon}."
                ],
                "practice_exercise": f"Construct a verification test protocol and tolerance budget for {canon} under environmental stress."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"When designing high-speed PCB layouts or mechanical assemblies in {canon}, why is Geometric Dimensioning & Tolerancing (GD&T) critical?",
                    "options": [
                        "It unambiguously communicates allowable variation, ensuring functional interchangeability and reliable mass manufacturing",
                        "It increases manufacturing cost without improving fit",
                        "It replaces all physical prototyping and CAD validation",
                        "It eliminates the need for quality control inspections"
                    ],
                    "answer_idx": 0,
                    "explanation": "GD&T standardizes tolerance boundaries, guaranteeing that fabricated parts assemble and function properly at manufacturing scale."
                },
                {
                    "id": "q2",
                    "question": f"In high-speed electrical hardware design for {canon}, what technique minimizes electromagnetic interference (EMI) and signal degradation?",
                    "options": [
                        "Maintaining continuous ground reference planes, matched impedance differential routing, and proper decoupling capacitor placement",
                        "Routing high-speed clock lines over split ground planes with sharp 90-degree trace angles",
                        "Eliminating all ground planes to reduce PCB layer count",
                        "Running sensitive analog traces directly adjacent to unshielded high-current switching inductors"
                    ],
                    "answer_idx": 0,
                    "explanation": "Continuous ground reference planes and controlled impedance routing provide clean return current paths, preventing EMI and signal degradation."
                },
                {
                    "id": "q3",
                    "question": f"In autonomous robotics systems utilizing {canon}, what role does a Kalman Filter or Sensor Fusion algorithm perform?",
                    "options": [
                        "Combining noisy measurements from multiple sensors (IMU, wheel encoders, LiDAR) to estimate true robot state accurately",
                        "Controlling motor battery charging cycles",
                        "Replacing kinematic inverse transforms with random approximations",
                        "Compressing video streams for wireless transmission"
                    ],
                    "answer_idx": 0,
                    "explanation": "Kalman filtering statistically fuses noisy sensor streams to compute optimal state estimates (position, orientation, velocity)."
                },
                {
                    "id": "q4",
                    "question": f"What is the primary function of Failure Mode and Effects Analysis (FMEA) in {canon}?",
                    "options": [
                        "Systematically identifying potential failure modes, assessing their severity, and implementing design mitigations before production",
                        "Documenting hardware failures only after customer shipments occur",
                        "Overriding safety certifications to accelerate shipping",
                        "Eliminating environmental stress testing"
                    ],
                    "answer_idx": 0,
                    "explanation": "FMEA proactively identifies design and process failure modes to engineer safety margins and mitigations before mass production."
                }
            ]
        }

    elif domain == "data":
        return {
            "title": f"Data Architecture, Analytical Modeling & Pipelines in {canon}",
            "objective": f"Develop end-to-end expertise in {canon}, statistical hypothesis testing, data pipeline resiliency, and actionable business intelligence.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Data Modeling Principles", "SQL / Python Analytics"],
            "resources": [
                {"title": f"Data Engineering & Architecture Guide for {canon}", "url": f"https://www.google.com/search?q={canon}+data+engineering+architecture", "type": "Documentation"},
                {"title": f"Dimensional Modeling & Pipeline Resiliency in {canon}", "url": f"https://www.google.com/search?q={canon}+data+pipeline+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Data Analytics Lab", "url": f"https://www.google.com/search?q={canon}+data+transformation+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Build an idempotent data transformation pipeline in {canon} with automated quality checks.",
            "study_guide": {
                "key_concepts": [
                    f"Dimensional Modeling: Architect Star and Snowflake schemas for high-speed analytical queries in {canon}.",
                    f"Pipeline Idempotence & ACID: Ensure safe retries and data consistency across batch and streaming ingestion.",
                    f"Data Quality & Anomaly Detection: Enforce schema contracts, null audits, and volume validation for {canon}.",
                    f"Statistical Validation & Modeling: Avoid data leakage, evaluate ROC-AUC/RMSE, and conduct hypothesis testing."
                ],
                "code_example": (
                    f"# Data Pipeline & Quality Validation for {canon}\n"
                    f"import pandas as pd\n"
                    f"def validate_data_pipeline_batch(df: pd.DataFrame) -> dict:\n"
                    f"    null_anomalies = df.isnull().sum().to_dict()\n"
                    f"    duplicates = int(df.duplicated().sum())\n"
                    f"    is_valid = duplicates == 0 and all(v == 0 for v in null_anomalies.values())\n"
                    f"    return {{\n"
                    f"        'pipeline': '{canon}',\n"
                    f"        'total_records': len(df),\n"
                    f"        'duplicates': duplicates,\n"
                    f"        'quality_passed': is_valid\n"
                    f"    }}\n"
                ),
                "code_language": "python",
                "common_pitfalls": [
                    f"Ingesting data in {canon} without schema validation and automated null checks.",
                    f"Creating unindexed Cartesian joins that cause runaway warehouse query costs in {canon}.",
                    f"Training predictive models in {canon} on features containing future target leakage."
                ],
                "practice_exercise": f"Build an idempotent data transformation pipeline in {canon} with automated quality checks."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"In analytical data warehousing for {canon}, why is a Star Schema generally preferred over fully normalized 3NF schemas?",
                    "options": [
                        "It minimizes complex multi-table joins, optimizing analytical query read performance and simplifying business reporting",
                        "It completely eliminates the need for primary keys",
                        "It requires zero disk storage by compressing data to zero bytes",
                        "It prevents users from querying historical data"
                    ],
                    "answer_idx": 0,
                    "explanation": "Star schemas denormalize dimensional attributes around fact tables, significantly accelerating analytical read queries compared to 3NF."
                },
                {
                    "id": "q2",
                    "question": f"What is the defining characteristic of an idempotent data pipeline in {canon}?",
                    "options": [
                        "Executing the pipeline multiple times on the same input data produces the exact same final result without creating duplicate records",
                        "Executing the pipeline once deletes all source tables",
                        "The pipeline produces different results on every execution",
                        "The pipeline can only process one row per hour"
                    ],
                    "answer_idx": 0,
                    "explanation": "Idempotence ensures safe retries and data consistency: re-running a pipeline batch never introduces duplicates or corrupts existing state."
                },
                {
                    "id": "q3",
                    "question": f"When training and evaluating predictive models in {canon}, what causes 'Data Leakage'?",
                    "options": [
                        "Using information from the test dataset or future target variables during feature engineering or model training",
                        "Using too many training samples",
                        "Normalizing numerical features using training set parameters",
                        "Splitting data chronologically into train and test splits"
                    ],
                    "answer_idx": 0,
                    "explanation": "Data leakage occurs when test data or future state inadvertently influences training features, producing unrealistically optimistic test metrics."
                },
                {
                    "id": "q4",
                    "question": f"In distributed query engines (e.g. Spark, BigQuery) processing {canon}, what strategy prevents performance bottlenecks from 'Data Skew'?",
                    "options": [
                        "Salting high-cardinality join keys or re-partitioning skewed partitions to distribute processing load evenly across workers",
                        "Routing all skewed records to a single worker node",
                        "Disabling query execution plans and caching",
                        "Converting all string columns into unstructured binary blobs"
                    ],
                    "answer_idx": 0,
                    "explanation": "Key salting and re-partitioning break up skewed key groups across multiple worker nodes, preventing single-worker stragglers."
                }
            ]
        }

    else:
        # Default: Technology & Software
        return {
            "title": f"Software Architecture & Production Engineering in {canon}",
            "objective": f"Develop deep practical proficiency in {canon}, covering modern design patterns, automated testing, performance profiling, and production deployment.",
            "effort_hours": 6.0,
            "difficulty_tier": "Intermediate",
            "prerequisites": ["Core Engineering Principles", "Automated Testing"],
            "resources": [
                {"title": f"Official {canon} Documentation & Guides", "url": f"https://www.google.com/search?q={canon}+documentation", "type": "Documentation"},
                {"title": f"Production Best Practices for {canon}", "url": f"https://www.google.com/search?q={canon}+production+best+practices", "type": "Article"},
                {"title": f"Interactive {canon} Tutorial", "url": f"https://www.google.com/search?q={canon}+hands+on+tutorial", "type": "Lab"}
            ],
            "mini_project": f"Build and deploy a functional, tested micro-feature or portfolio component demonstrating {canon} with clean architecture.",
            "study_guide": {
                "key_concepts": [
                    f"Core Syntax & Architecture: Understand {canon}'s primary execution model and standard idioms.",
                    f"Reliability & Error Handling: Implement robust exception management, boundary validation, and observability for {canon}.",
                    f"Performance & Resource Budgeting: Benchmark execution bottlenecks and optimize memory/CPU footprint.",
                    f"Testing & CI/CD: Write comprehensive unit and integration tests verifying edge cases."
                ],
                "code_example": (
                    f"// Production Implementation Pattern for {canon}\n"
                    f"// Demonstrates modular structure, input sanitization, and structured logging\n"
                    f"export async function execute{re.sub(r'[^A-Za-z0-9]', '', canon)}Workflow(inputData: Record<string, unknown>) {{\n"
                    f"  console.log('Initiating {canon} verified pipeline...');\n"
                    f"  // Validate state and execute domain logic\n"
                    f"  return {{ status: 'completed', skill: '{canon}', timestamp: new Date().toISOString() }};\n"
                    f"}}"
                ),
                "code_language": "typescript",
                "common_pitfalls": [
                    f"Neglecting automated error boundaries and logging when deploying {canon} to production environments.",
                    f"Skipping static analysis and type checks, resulting in preventable runtime failures.",
                    f"Failing to enforce rate limits or resource caps on {canon} integration points."
                ],
                "practice_exercise": f"Construct a clean, modular component implementing {canon} with at least 3 automated unit test assertions."
            },
            "quiz": [
                {
                    "id": "q1",
                    "question": f"What is a critical performance and reliability best practice when working with {canon} in production?",
                    "options": [
                        "Profiling bottlenecks, enforcing error handling, and configuring automated observability",
                        "Disabling all logging to maximize raw CPU throughput",
                        "Bypassing input validation in performance-critical code paths",
                        "Relying solely on in-memory storage without backups"
                    ],
                    "answer_idx": 0,
                    "explanation": "Production systems require continuous observability, proactive error boundaries, and profiling to detect resource regressions."
                },
                {
                    "id": "q2",
                    "question": f"When integrating {canon} into a modern CI/CD deployment pipeline, what should be validated first?",
                    "options": [
                        "Automated unit tests, static code quality linting, and security vulnerability scans",
                        "Immediate production deployment without staging verification",
                        "Sending emails to all developers on every commit",
                        "Deleting all historical artifacts to save disk space"
                    ],
                    "answer_idx": 0,
                    "explanation": "Automated test suites and linting catch defects early in the pipeline before code reaches staging or production environments."
                },
                {
                    "id": "q3",
                    "question": f"How should state and credential secrets be managed when configuring {canon} in cloud environments?",
                    "options": [
                        "Injected at runtime via secure environment secret stores rather than committed to source repositories",
                        "Hardcoded in plain text comments inside code files for ease of debugging",
                        "Sent in cleartext query strings in public API calls",
                        "Stored inside public client-side browser cookies"
                    ],
                    "answer_idx": 0,
                    "explanation": "Zero-trust security requires keeping secrets out of version control and loading them securely via runtime secret managers."
                },
                {
                    "id": "q4",
                    "question": f"What is the recommended design pattern for managing external dependencies and services in {canon}?",
                    "options": [
                        "Dependency injection and interface abstractions to allow seamless mocking and test isolation",
                        "Tight coupling of all external endpoints directly into business logic classes",
                        "Relying on global mutable variables across modules",
                        "Executing arbitrary remote shell commands without escaping inputs"
                    ],
                    "answer_idx": 0,
                    "explanation": "Dependency inversion and modular interfaces enable testability, resilience, and swapability without altering domain code."
                }
            ]
        }


# -----------------------------------------------------------------------------
# Role-Specific Learning Curve Calculator
# -----------------------------------------------------------------------------
def calculate_role_learning_curve(
    role_title: str,
    target_role_id: Optional[str] = None,
    weekly_hours: int = 6,
    tasks: Optional[List[Any]] = None
) -> Dict[str, Any]:
    """
    Computes a uniquely customized learning curve for any career role based on:
    - Seniority level (Level 1 Entry through Level 5 Executive)
    - Domain specialization (Tech, Finance, Healthcare, Legal, Data/AI, etc.)
    - Weekly available study hours
    - Task count and complexity
    """
    # 1. Match role in canonical registry
    matched_role = None
    if target_role_id and target_role_id in CAREER_ROLES:
        matched_role = CAREER_ROLES[target_role_id]
    if not matched_role:
        for r_id, r in CAREER_ROLES.items():
            if r["title"].lower() == role_title.lower() or r_id == role_title.lower():
                matched_role = r
                break
    if not matched_role:
        for r_id, r in CAREER_ROLES.items():
            if role_title.lower() in r["title"].lower() or r["title"].lower() in role_title.lower():
                matched_role = r
                break

    # 2. Extract or infer level and industry
    title_lower = role_title.lower()
    if matched_role:
        level = matched_role.get("level", 2)
        industry_id = matched_role.get("industry_id") or get_skill_industry(role_title)
        category = matched_role.get("category", "Specialized")
        core_skills = matched_role.get("core_skills", [])
        adv_skills = matched_role.get("advanced_skills", [])
    else:
        # Infer level from title
        if any(w in title_lower for w in ["junior", "associate", "intern", "entry"]):
            level = 1
        elif any(w in title_lower for w in ["senior", "lead", "staff", "architect", "manager"]):
            level = 3 if "senior" in title_lower else 4
        elif any(w in title_lower for w in ["director", "principal", "vp", "chief", "head"]):
            level = 5
        else:
            level = 2
        industry_id = get_skill_industry(role_title)
        category = "Specialized"
        core_skills = ["Core Methods", "Industry Tooling", "Applied Workflows"]
        adv_skills = ["Advanced Strategy", "Performance Governance"]

    # 3. Dynamic Curve Metadata based on Level & Industry
    industry_curve_titles = {
        "finance": {
            1: "Foundational Financial Analysis & Modeling Curve",
            2: "Analytical Valuation & Financial Strategy Curve",
            3: "Advanced Corporate Capital & Risk Architecture Curve",
            4: "Strategic Portfolio & Executive Deal Architecture Curve",
            5: "Executive Chief Financial Strategy & Governance Curve"
        },
        "healthcare": {
            1: "Foundational Clinical Informatics & Records Curve",
            2: "Applied Biomedical Data & Protocol Mastery Curve",
            3: "Advanced Clinical Systems & Health Informatics Curve",
            4: "Clinical Operations & Research Leadership Curve",
            5: "Executive Healthcare Governance & Informatics Curve"
        },
        "legal": {
            1: "Foundational Legal Operations & Compliance Curve",
            2: "Applied Corporate Compliance & Risk Mitigation Curve",
            3: "Senior Regulatory Architecture & Privacy Governance Curve",
            4: "Strategic Legal Risk & Regulatory Leadership Curve",
            5: "Chief Legal Counsel & Enterprise Governance Curve"
        },
        "marketing": {
            1: "Foundational Campaign Execution & Analytics Curve",
            2: "Performance Optimization & Acquisition Scaling Curve",
            3: "Advanced Growth Strategy & Brand Architecture Curve",
            4: "Cross-Channel Strategy & Marketing Leadership Curve",
            5: "Executive Chief Marketing & Brand Synthesis Curve"
        },
        "product": {
            1: "Foundational Product Research & UX Discovery Curve",
            2: "Core Product Strategy & Roadmapping Curve",
            3: "Advanced Product Architecture & Systems UX Curve",
            4: "Strategic Product Portfolio & Leadership Curve",
            5: "Chief Product Officer & Market Strategy Curve"
        },
        "operations": {
            1: "Foundational Workflow & Team Operations Curve",
            2: "Agile Process Optimization & Service Delivery Curve",
            3: "Senior Operational Scaling & SLA Architecture Curve",
            4: "Cross-Functional Operations & Organizational Leadership Curve",
            5: "Chief Operating Strategy & Systems Transformation Curve"
        },
        "engineering": {
            1: "Foundational CAD, Schematics & Prototyping Curve",
            2: "Precision Hardware Systems & Mechatronics Curve",
            3: "Advanced Autonomous Robotics & Signal Architecture Curve",
            4: "Staff Hardware Architect & System Integration Curve",
            5: "Principal Systems Engineering & Executive Hardware Curve"
        },
        "data": {
            1: "Foundational Data Analytics & SQL Curve",
            2: "Linear Data Engineering & Predictive Analytics Curve",
            3: "Advanced Data Lakehouse & Machine Learning Curve",
            4: "Staff Data & AI Platform Architecture Curve",
            5: "Principal Data Strategist & AI Synthesis Curve"
        },
        "tech": {
            1: "Foundational Acceleration Curve",
            2: "Linear Technical Growth Curve",
            3: "Steep Architectural Inflection Curve",
            4: "Multi-Dimensional Staff Engineering Curve",
            5: "Executive Mastery & Systems Synthesis Curve"
        }
    }

    curve_configs = {
        1: {
            "curve_type": industry_curve_titles.get(industry_id, industry_curve_titles["tech"]).get(1, "Foundational Acceleration Curve"),
            "curve_shape": "progressive_ramp",
            "difficulty_level": "Foundational (L1)",
            "difficulty_score": 2.0,
            "base_hours": 80,
            "trajectory_description": "Begins with an accessible ramp through fundamentals and domain standards, accelerating as practical milestone projects establish core competence."
        },
        2: {
            "curve_type": industry_curve_titles.get(industry_id, industry_curve_titles["tech"]).get(2, "Linear Technical Growth Curve"),
            "curve_shape": "linear_steady",
            "difficulty_level": "Intermediate (L2)",
            "difficulty_score": 3.0,
            "base_hours": 130,
            "trajectory_description": "Steady upward climb requiring consistent weekly execution across industry-standard tools, practical workflows, and scenario verification."
        },
        3: {
            "curve_type": industry_curve_titles.get(industry_id, industry_curve_titles["tech"]).get(3, "Steep Architectural Inflection Curve"),
            "curve_shape": "steep_inflection",
            "difficulty_level": "Advanced (L3)",
            "difficulty_score": 4.0,
            "base_hours": 190,
            "trajectory_description": "Presents a sharp inflection point transitioning from routine execution to high-impact strategy, governance, and complex multi-variable trade-offs."
        },
        4: {
            "curve_type": industry_curve_titles.get(industry_id, industry_curve_titles["tech"]).get(4, "Multi-Dimensional Staff Engineering Curve"),
            "curve_shape": "multi_tier_strategic",
            "difficulty_level": "Staff / Lead (L4)",
            "difficulty_score": 4.5,
            "base_hours": 250,
            "trajectory_description": "High-altitude dual-track progression balancing deep domain expertise with cross-functional strategic leadership and organizational mentoring."
        },
        5: {
            "curve_type": industry_curve_titles.get(industry_id, industry_curve_titles["tech"]).get(5, "Executive Mastery & Systems Synthesis Curve"),
            "curve_shape": "exponential_mastery",
            "difficulty_level": "Principal & Executive (L5)",
            "difficulty_score": 5.0,
            "base_hours": 310,
            "trajectory_description": "Exponential mastery curve demanding enterprise-scale governance, organizational vision, and industry-defining strategic impact."
        }
    }

    cfg = curve_configs.get(level, curve_configs[2])

    # 4. Total Effort & Weeks Calculation
    task_hours = sum(getattr(t, "estimated_effort_hours", 6.0) for t in (tasks or []))
    total_curriculum_hours = max(cfg["base_hours"], int(task_hours * 1.5))
    weekly_cadence = max(weekly_hours, 1)
    estimated_weeks = max(4, round(total_curriculum_hours / weekly_cadence))
    estimated_months = round(estimated_weeks / 4.33, 1)

    # 5. Phased Milestones Breakdown (Unique 4-Stage Pathway)
    task_count = len(tasks) if tasks else 6
    completed_task_count = sum(1 for t in (tasks or []) if getattr(t, "status", "") in ("completed", "assessed"))

    p1_total = max(1, round(task_count * 0.25))
    p2_total = max(1, round(task_count * 0.35))
    p3_total = max(1, round(task_count * 0.25))
    p4_total = max(1, task_count - (p1_total + p2_total + p3_total))

    # Phase statuses based on completed count
    p1_done = min(completed_task_count, p1_total)
    rem1 = completed_task_count - p1_done
    p2_done = min(rem1, p2_total) if rem1 > 0 else 0
    rem2 = rem1 - p2_done
    p3_done = min(rem2, p3_total) if rem2 > 0 else 0
    rem3 = rem2 - p3_done
    p4_done = min(rem3, p4_total) if rem3 > 0 else 0

    industry_phase_templates = {
        "finance": [
            ("Phase 1: Financial Statements & Modeling Foundations", f"Master financial accounting, dynamic Excel modeling, and core ratios ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: DCF Valuation & Scenario Forecasting", "Build dynamic DCF/LBO models, cost of capital (WACC), and variance analyses."),
            ("Phase 3: Capital Markets & Advanced Risk Modeling", f"Stress-test debt/equity capital structures, credit risk, and scenario sensitivities ({', '.join(adv_skills[:2]) if adv_skills else 'Advanced Valuation'})."),
            ("Phase 4: Executive Fiduciary & Deal Capstone", "Deliver investment thesis, board-ready valuation deck, and audit-ready models.")
        ],
        "healthcare": [
            ("Phase 1: Clinical Terminology & Regulatory Foundations", f"Master medical nomenclatures (SNOMED/ICD-10), GCP guidelines, and HIPAA mandates ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Health Informatics & EHR Workflows", "Build compliant EHR data pipelines, FHIR/HL7 interfaces, and EDC systems."),
            ("Phase 3: Clinical Protocols & Evidence Synthesis", f"Analyze clinical trial endpoints, protocol adherence, and observational quality metrics ({', '.join(adv_skills[:2]) if adv_skills else 'Clinical Evidence'})."),
            ("Phase 4: Clinical Systems & Quality Capstone", "Formulate comprehensive clinical informatics strategy and healthcare quality audit.")
        ],
        "legal": [
            ("Phase 1: Statutory Interpretation & Legal Operations", f"Master statutory frameworks, CLM tools (Ironclad), and contract metadata review ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Contract Architecture & Negotiation", "Draft indemnities, liability caps, vendor DPAs, and risk assessment matrices."),
            ("Phase 3: Regulatory Compliance & Privacy Governance", f"Execute GDPR/CCPA audits, cross-border data transfer assessments, and AML/KYC policies ({', '.join(adv_skills[:2]) if adv_skills else 'Regulatory Compliance'})."),
            ("Phase 4: Enterprise Compliance & Audit Defense Capstone", "Develop enterprise-level compliance governance policy and audit response playbook.")
        ],
        "marketing": [
            ("Phase 1: Audience Research & Content Foundations", f"Develop buyer personas, value propositions, and organic content strategies ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Performance Marketing & Acquisition Scaling", "Launch conversion-optimized paid campaigns, landing page A/B tests, and funnel analytics."),
            ("Phase 3: Multi-Touch Attribution & CRO", f"Deploy data-driven attribution models, cohort retention analysis, and lifecycle automation ({', '.join(adv_skills[:2]) if adv_skills else 'Attribution'})."),
            ("Phase 4: Omnichannel Growth Strategy Capstone", "Synthesize comprehensive Go-To-Market (GTM) playbook and executive marketing plan.")
        ],
        "product": [
            ("Phase 1: Discovery & User Research Foundations", f"Conduct qualitative interviews, card sorting, usability heuristics, and opportunity mapping ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Product Specifications & Agile Roadmaps", "Author rigorous PRDs, user stories, acceptance criteria, and prioritized feature backlogs."),
            ("Phase 3: Design Systems & Quantitative Experimentation", f"Architect scalable design tokens, WCAG 2.1 accessible UI, and A/B test experiments ({', '.join(adv_skills[:2]) if adv_skills else 'Design Systems'})."),
            ("Phase 4: Product Launch & Outcome Metrics Capstone", "Execute end-to-end product release strategy with North Star KPI dashboards.")
        ],
        "operations": [
            ("Phase 1: Process Mapping & Operating Standards", f"Map value stream workflows, document SOPs, and establish operational SLA baselines ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Agile Delivery & Workflow Optimization", "Orchestrate Scrum/Kanban cadences, capacity planning, and bottleneck removal."),
            ("Phase 3: Vendor Governance & SLA Management", f"Manage multi-vendor contracts, performance scorecard monitoring, and operational risk ({', '.join(adv_skills[:2]) if adv_skills else 'Governance'})."),
            ("Phase 4: Organizational Scaling & Systems Capstone", "Implement continuous process improvement framework and executive operations dashboard.")
        ],
        "engineering": [
            ("Phase 1: Schematics, CAD & Physical Fundamentals", f"Master 3D CAD modeling (SolidWorks), schematic capture, and engineering tolerances ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Prototyping & High-Speed Circuit Verification", "Fabricate prototype PCBs, simulate circuit SPICE models, and debug signals with oscilloscopes."),
            ("Phase 3: Kinematics, Sensor Fusion & Environmental Stress", f"Implement sensor fusion (Kalman filters), ROS2 path planning, and thermal dissipation simulations ({', '.join(adv_skills[:2]) if adv_skills else 'Systems Engineering'})."),
            ("Phase 4: Manufacturing Release & DFM Capstone", "Produce DFM/DFA documentation, compliance test reports, and production hardware release.")
        ],
        "data": [
            ("Phase 1: Relational Modeling & Analytical SQL", f"Master complex SQL window functions, star-schema data modeling, and business intelligence ({', '.join(core_skills[:3]) if core_skills else 'Foundations'})."),
            ("Phase 2: Data Pipeline Resiliency & Transformation", "Construct robust ETL/ELT pipelines using Python, dbt, Spark, and workflow orchestrators."),
            ("Phase 3: Statistical Inference & Predictive Modeling", f"Build predictive statistical models, regression frameworks, and hypothesis tests ({', '.join(adv_skills[:2]) if adv_skills else 'Statistical Modeling'})."),
            ("Phase 4: Enterprise Lakehouse & Production Capstone", "Architect petabyte-scale lakehouse infrastructure with automated data governance.")
        ],
        "tech": [
            ("Phase 1: Foundations & Toolchains", f"Master foundational syntax, design patterns, and core frameworks ({', '.join(core_skills[:3]) if core_skills else 'Core Tools'})."),
            ("Phase 2: Production Implementations", "Build practical modular services with automated testing and CI/CD pipelines."),
            ("Phase 3: High-Scale Architecture", f"Optimize performance bottlenecks, distributed resilience, and security invariants ({', '.join(adv_skills[:2]) if adv_skills else 'Scaling'})."),
            ("Phase 4: Capstone & Verified Evaluation", "Complete end-to-end portfolio capstone and demonstrate verified technical assessment competencies.")
        ]
    }

    chosen_template = industry_phase_templates.get(industry_id, industry_phase_templates["tech"])

    phases = [
        {
            "phase_number": 1,
            "phase_name": chosen_template[0][0],
            "focus": chosen_template[0][1],
            "milestone_count": p1_total,
            "completed_count": p1_done,
            "estimated_weeks": max(1, round(estimated_weeks * 0.25)),
            "status": "completed" if p1_done >= p1_total else ("in_progress" if p1_done > 0 or completed_task_count == 0 else "upcoming")
        },
        {
            "phase_number": 2,
            "phase_name": chosen_template[1][0],
            "focus": chosen_template[1][1],
            "milestone_count": p2_total,
            "completed_count": p2_done,
            "estimated_weeks": max(2, round(estimated_weeks * 0.35)),
            "status": "completed" if p2_done >= p2_total else ("in_progress" if p1_done >= p1_total else "upcoming")
        },
        {
            "phase_number": 3,
            "phase_name": chosen_template[2][0],
            "focus": chosen_template[2][1],
            "milestone_count": p3_total,
            "completed_count": p3_done,
            "estimated_weeks": max(2, round(estimated_weeks * 0.25)),
            "status": "completed" if p3_done >= p3_total else ("in_progress" if p2_done >= p2_total else "upcoming")
        },
        {
            "phase_number": 4,
            "phase_name": chosen_template[3][0],
            "focus": chosen_template[3][1],
            "milestone_count": p4_total,
            "completed_count": p4_done,
            "estimated_weeks": max(1, round(estimated_weeks * 0.15)),
            "status": "completed" if p4_done >= p4_total else ("in_progress" if p3_done >= p3_total else "upcoming")
        }
    ]

    # Visual curve coordinates (0 to 100 viewBox for SVG rendering)
    curve_points = [
        {"x": 0, "y": 90, "label": "Start"},
        {"x": 25, "y": 70 if level <= 2 else 75, "label": "P1"},
        {"x": 50, "y": 50 if level <= 2 else 45, "label": "P2"},
        {"x": 75, "y": 30 if level <= 2 else 20, "label": "P3"},
        {"x": 100, "y": 10, "label": "Mastery"}
    ]

    return {
        "role_title": role_title,
        "industry_id": industry_id,
        "category": category,
        "level": level,
        "curve_type": cfg["curve_type"],
        "curve_shape": cfg["curve_shape"],
        "difficulty_level": cfg["difficulty_level"],
        "difficulty_score": cfg["difficulty_score"],
        "estimated_weeks": estimated_weeks,
        "estimated_months": estimated_months,
        "total_curriculum_hours": total_curriculum_hours,
        "weekly_hours": weekly_hours,
        "trajectory_description": cfg["trajectory_description"],
        "phases": phases,
        "curve_points": curve_points,
        "core_competencies": core_skills[:4],
        "advanced_competencies": adv_skills[:3]
    }


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class GeneratePlanRequest(BaseModel):
    target_role: str
    target_role_id: Optional[str] = None
    weekly_hours: int = Field(default=6, ge=1, le=40)
    preferred_days: List[str] = Field(default_factory=lambda: ["Monday", "Wednesday", "Saturday"])
    focus_skills: Optional[List[str]] = None
    industry: Optional[str] = None


class UpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(planned|in_progress|completed|assessed)$")


class SubmitQuizRequest(BaseModel):
    answers: Dict[str, int]  # question_id -> chosen option index


class UpdateScheduleRequest(BaseModel):
    weekly_hours: int = Field(..., ge=1, le=40)
    preferred_days: List[str] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.get("/industries")
def get_learning_industries():
    """
    Returns the supported industries for filtering and exploring career roles.
    """
    return CareerGraphService.get_industries()


@router.get("/roles")
def get_learning_roles(
    industry: Optional[str] = Query(None, description="Industry domain filter (e.g. 'tech', 'data', 'finance', 'all')")
):
    """
    Returns available career roles with domain and industry metadata, filterable by industry.
    """
    graph = CareerGraphService.get_full_graph(industry_id=industry)
    roles = []
    for node in graph.get("nodes", []):
        level = node.get("level", 2)
        exp_min = 1.0 if level == 1 else (3.0 if level == 2 else 5.0)
        skills = node.get("required_skills") or (node.get("core_skills", []) + node.get("advanced_skills", []))
        roles.append({
            "id": node["id"],
            "title": node["title"],
            "domain": node.get("category") or node.get("domain") or "General",
            "industry": node.get("industry_id") or node.get("industry") or "tech",
            "industry_name": node.get("industry_name") or "Technology & Software",
            "seniority_tier": node.get("seniority_tier") or f"L{level}",
            "level": level,
            "experience_years_min": node.get("experience_years_min", exp_min),
            "required_skills": skills
        })
    return {"roles": roles}


@router.post("/generate")
def generate_learning_plan(
    req: GeneratePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a prioritized, structured learning plan tailored to the gap between
    the user's verified skills and target role requirements, complete with a unique learning curve.
    """
    # Deactivate existing active plans
    db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).update({"is_active": False})

    # Fetch user verified profile skills
    user_skills = [
        s.name.lower() for s in db.query(ProfileSkill).filter(ProfileSkill.user_id == current_user.id).all()
    ]

    # Find required skills and industry from canonical registry
    matched_role = None
    if req.target_role_id and req.target_role_id in CAREER_ROLES:
        matched_role = CAREER_ROLES[req.target_role_id]
    if not matched_role and req.target_role:
        clean_target = req.target_role.lower().strip()
        for r_id, r in CAREER_ROLES.items():
            if r["title"].lower().strip() == clean_target:
                matched_role = r
                break
        if not matched_role:
            for r_id, r in CAREER_ROLES.items():
                if clean_target in r["title"].lower() or r["title"].lower() in clean_target:
                    matched_role = r
                    break

    # If still not found, search full graph across all industries
    if not matched_role:
        graph = CareerGraphService.get_full_graph(industry_id="all")
        target_node = None
        if req.target_role_id:
            target_node = next((n for n in graph["nodes"] if n["id"] == req.target_role_id), None)
        if not target_node and req.target_role:
            target_node = next((n for n in graph["nodes"] if n["title"].lower() == req.target_role.lower()), None)
        if not target_node and req.target_role:
            target_node = next((n for n in graph["nodes"] if req.target_role.lower() in n["title"].lower() or n["title"].lower() in req.target_role.lower()), None)
        if target_node:
            matched_role = target_node

    req_skills = []
    role_industry = None
    if matched_role:
        role_industry = matched_role.get("industry_id")
        req_skills = list(matched_role.get("core_skills", [])) + list(matched_role.get("advanced_skills", []))

    if req.focus_skills:
        for s in req.focus_skills:
            if s not in req_skills:
                req_skills.append(s)

    if not req_skills:
        inferred_ind = req.industry if req.industry and req.industry != "all" else get_skill_industry(req.target_role or "tech")
        role_industry = inferred_ind
        domain_skill_defaults = {
            "finance": ["Financial Modeling", "Excel (DCF & LBO)", "Financial Statement Analysis", "Valuation Methods", "Corporate Finance", "Risk Management"],
            "healthcare": ["Health Informatics", "Clinical Data Management", "HIPAA Compliance", "Electronic Health Records (EHR)", "Biomedical Data Analysis", "Healthcare Quality & Safety"],
            "legal": ["Corporate Compliance", "Regulatory Auditing", "Contract Lifecycle Management", "GDPR / CCPA / CPRA", "Policy Drafting", "Risk Assessment"],
            "marketing": ["Growth & Performance Marketing", "SEO & Organic Growth", "Content & Brand Strategy", "A/B Testing Experimentation", "Customer Acquisition Cost (CAC)", "Marketing Analytics"],
            "product": ["Product Management", "UI/UX Design", "User Research", "Design Systems", "Product Strategy", "Agile Roadmap Execution"],
            "operations": ["Operations Management", "Agile & Scrum Methodologies", "Process Improvement", "Supply Chain Optimization", "SLA & KPI Governance", "Vendor Management"],
            "engineering": ["Mechanical CAD Design", "Hardware & PCB Layout", "Robotics Systems", "Sensor Fusion", "Finite Element Analysis (FEA)", "Rapid Prototyping"],
            "data": ["SQL & Data Warehousing", "Python for Analytics", "Machine Learning", "Data Pipeline Engineering", "Business Intelligence", "Statistical Modeling"],
            "tech": ["Python", "Docker", "Kubernetes", "System Design", "Cloud Architecture", "SQL"]
        }
        req_skills = domain_skill_defaults.get(inferred_ind, domain_skill_defaults["tech"])

    # Filter for missing skills
    missing_skills = [s for s in req_skills if s.lower() not in user_skills]
    if not missing_skills:
        first_s = req_skills[0] if req_skills else "Core Architecture"
        missing_skills = [f"Advanced {first_s} Architecture", "Strategic Systems & Resiliency", "High-Performance Governance"]

    # Deduplicate
    seen = set()
    deduped_missing = []
    for s in missing_skills:
        k = s.lower().strip()
        if k not in seen:
            seen.add(k)
            deduped_missing.append(s)

    # Link to active CareerGoal if present
    active_goal = db.query(CareerGoal).filter(
        CareerGoal.user_id == current_user.id,
        CareerGoal.is_active == True
    ).first()

    plan = LearningPlan(
        user_id=current_user.id,
        goal_id=active_goal.id if active_goal else None,
        target_role=req.target_role,
        weekly_hours=req.weekly_hours,
        preferred_days=req.preferred_days,
        progress_percent=0.0,
        is_active=True
    )
    db.add(plan)
    db.flush()

    for skill_name in deduped_missing[:6]:
        meta = get_skill_metadata(skill_name, industry_hint=role_industry)
        canon = canonical_skill(skill_name) or skill_name.title()
        task = LearningTask(
            plan_id=plan.id,
            skill_name=canon,
            skill_normalized=canon.lower(),
            title=meta["title"],
            learning_objective=meta["objective"],
            estimated_effort_hours=meta["effort_hours"],
            prerequisites=meta.get("prerequisites", []),
            resources=meta.get("resources", []),
            mini_project=meta.get("mini_project"),
            status="planned",
            assessment_quiz=meta.get("quiz")
        )
        db.add(task)

    db.commit()
    db.refresh(plan)

    record_user_activity(
        db, current_user.id, "learning_plan_created",
        f"Generated personalized learning plan for '{req.target_role}' with unique learning curve ({len(deduped_missing[:6])} milestones)",
        entity_type="learning_plan", entity_id=plan.id
    )

    return get_active_plan(current_user, db)


@router.get("/plan")
def get_active_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the user's active learning plan with tasks, study guides, schedule, progress,
    and a role-specific unique learning curve.
    """
    plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).order_by(LearningPlan.created_at.desc()).first()

    if not plan:
        return {"has_plan": False, "plan": None, "tasks": []}

    tasks = db.query(LearningTask).filter(
        LearningTask.plan_id == plan.id
    ).order_by(LearningTask.created_at.asc()).all()

    # Ensure every task has a quiz attached in the database
    updated_quiz = False
    for t in tasks:
        if not t.assessment_quiz:
            meta = get_skill_metadata(t.skill_name)
            t.assessment_quiz = meta.get("quiz")
            db.add(t)
            updated_quiz = True
    if updated_quiz:
        db.commit()

    # Calculate actual progress
    completed_count = sum(1 for t in tasks if t.status in ("completed", "assessed"))
    pct = round((completed_count / max(len(tasks), 1)) * 100, 1) if tasks else 0.0
    if plan.progress_percent != pct:
        plan.progress_percent = pct
        db.commit()

    # Calculate unique learning curve for this role
    learning_curve = calculate_role_learning_curve(
        role_title=plan.target_role,
        weekly_hours=plan.weekly_hours,
        tasks=tasks
    )

    # Enrich each task with study guide & metadata
    enriched_tasks = []
    for t in tasks:
        meta = get_skill_metadata(t.skill_name)
        quiz_data = t.assessment_quiz or meta.get("quiz")
        enriched_tasks.append({
            "id": t.id,
            "skill_name": t.skill_name,
            "title": t.title,
            "learning_objective": t.learning_objective,
            "estimated_effort_hours": t.estimated_effort_hours,
            "difficulty_tier": meta.get("difficulty_tier", "Intermediate"),
            "prerequisites": t.prerequisites or [],
            "resources": t.resources or [],
            "mini_project": t.mini_project,
            "study_guide": meta.get("study_guide"),
            "status": t.status,
            "assessment_score": t.assessment_score,
            "has_quiz": True,
            "completed_at": t.completed_at
        })

    return {
        "has_plan": True,
        "plan": {
            "id": plan.id,
            "target_role": plan.target_role,
            "weekly_hours": plan.weekly_hours,
            "preferred_days": plan.preferred_days,
            "progress_percent": plan.progress_percent,
            "created_at": plan.created_at,
            "learning_curve": learning_curve
        },
        "tasks": enriched_tasks
    }


@router.get("/tasks/{task_id}/quiz")
def get_task_quiz(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the quiz questions for a learning task (without revealing correct answer indices).
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Learning task not found.")

    if not task.assessment_quiz:
        meta = get_skill_metadata(task.skill_name)
        task.assessment_quiz = meta.get("quiz")
        db.add(task)
        db.commit()

    sanitized = []
    for q in (task.assessment_quiz or []):
        sanitized.append({
            "id": q.get("id"),
            "question": q.get("question"),
            "options": q.get("options")
        })

    return {
        "task_id": task.id,
        "skill_name": task.skill_name,
        "title": task.title,
        "total_questions": len(sanitized),
        "questions": sanitized
    }


@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    req: UpdateTaskStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the execution state of a task (planned, in_progress, completed).
    Note: 'assessed' status requires passing the quiz assessment.
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Learning task not found.")

    if req.status == "assessed" and task.assessment_score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To mark a task as assessed, submit and pass the verification assessment quiz."
        )

    task.status = req.status
    if req.status in ("completed", "assessed"):
        task.completed_at = datetime.now(timezone.utc)

    db.commit()

    record_user_activity(
        db, current_user.id, "learning_task_updated",
        f"Task '{task.title}' updated to {req.status}",
        entity_type="learning_task", entity_id=task.id
    )

    return {"status": "success", "task_id": task.id, "new_status": task.status}


@router.post("/tasks/{task_id}/quiz")
def submit_task_quiz(
    task_id: str,
    req: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits quiz answers for verification.
    If passed (score >= 66%): updates task to 'assessed' AND creates a new verified
    'demonstrated' UserSkillEvidence record in the user's unified profile!
    If failed: keeps task in progress and returns targeted revision advice and answer explanations.
    """
    task = db.query(LearningTask).join(LearningPlan).filter(
        LearningTask.id == task_id,
        LearningPlan.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if not task.assessment_quiz:
        meta = get_skill_metadata(task.skill_name)
        task.assessment_quiz = meta.get("quiz")
        db.add(task)
        db.commit()

    quiz = task.assessment_quiz
    correct_count = 0
    feedback = []

    for q in quiz:
        qid = q.get("id")
        correct_idx = q.get("answer_idx", 0)
        chosen_idx = req.answers.get(qid)
        is_correct = chosen_idx == correct_idx
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": qid,
            "question": q.get("question"),
            "is_correct": is_correct,
            "chosen_option": q.get("options", [])[chosen_idx] if chosen_idx is not None and chosen_idx < len(q.get("options", [])) else None,
            "correct_option": q.get("options", [])[correct_idx] if q.get("options") else None,
            "explanation": q.get("explanation", "Review the key concepts and official documentation for this competency.")
        })

    score_pct = round((correct_count / max(len(quiz), 1)) * 100, 1)
    passed = score_pct >= 66.0
    task.assessment_score = score_pct

    evidence_created = False
    if passed:
        task.status = "assessed"
        task.completed_at = datetime.now(timezone.utc)

        # Upgrade or insert ProfileSkill and UserSkillEvidence
        canon = canonical_skill(task.skill_name) or task.skill_name
        key = canon.lower()

        prof_skill = db.query(ProfileSkill).filter(
            ProfileSkill.user_id == current_user.id,
            ProfileSkill.name_normalized == key
        ).first()

        if not prof_skill:
            prof_skill = ProfileSkill(
                user_id=current_user.id,
                name=canon,
                name_normalized=key,
                source="assessment",
                proficiency_estimate="Intermediate",
                confidence=0.88,
                verification_status="demonstrated",
                user_confirmed=True
            )
            db.add(prof_skill)
            db.flush()
        else:
            prof_skill.verification_status = "demonstrated"
            prof_skill.confidence = max(prof_skill.confidence or 0.7, 0.88)
            prof_skill.user_confirmed = True

        evidence = UserSkillEvidence(
            user_id=current_user.id,
            skill_id=prof_skill.id,
            skill_name=canon,
            skill_normalized=key,
            source_type="coding_assessment",
            source_reference=f"Quiz Assessment: {task.title}",
            evidence_text=f"Scored {score_pct}% on technical verification assessment for {canon}.",
            confidence=0.88,
            proficiency_estimate="Intermediate",
            verification_status="demonstrated",
            user_confirmed=True
        )
        db.add(evidence)
        evidence_created = True

        record_user_activity(
            db, current_user.id, "skill_assessed_passed",
            f"Passed assessment for '{canon}' with {score_pct}%. Skill verified as Demonstrated.",
            entity_type="skill", entity_id=prof_skill.id
        )
    else:
        task.status = "in_progress"
        record_user_activity(
            db, current_user.id, "skill_assessed_revision",
            f"Completed assessment for '{task.skill_name}' ({score_pct}%). Targeted revision recommended.",
            entity_type="learning_task", entity_id=task.id
        )

    db.commit()

    return {
        "passed": passed,
        "score_percent": score_pct,
        "correct_answers": correct_count,
        "total_questions": len(quiz),
        "feedback": feedback,
        "skill_verified": evidence_created,
        "message": (
            f"Congratulations! You passed with {score_pct}%. Verified evidence added to your skill profile."
            if passed else
            f"You scored {score_pct}%. Review the study guide explanations and retry to prove mastery."
        )
    }


@router.patch("/schedule")
def update_learning_schedule(
    req: UpdateScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates available study hours per week and preferred learning days.
    """
    plan = db.query(LearningPlan).filter(
        LearningPlan.user_id == current_user.id,
        LearningPlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active learning plan found.")

    plan.weekly_hours = req.weekly_hours
    plan.preferred_days = req.preferred_days
    db.commit()

    return {
        "status": "success",
        "weekly_hours": plan.weekly_hours,
        "preferred_days": plan.preferred_days
    }
