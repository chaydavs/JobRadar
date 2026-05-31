/**
 * Shared resume profiles — single source of truth for dashboard + email digest.
 * Edit keywords here; both systems read from this config.
 */

export const RESUME_PROFILES = {
  // Chay's strongest profile — 3 research roles, PyTorch/TF/NLP/RAG background
  "AI/ML Engineer": {
    color: "#8B5CF6",
    keywords: [
      "machine learning", "ml", "ai", "artificial intelligence", "deep learning",
      "neural network", "nlp", "natural language", "tensorflow", "pytorch",
      "scikit-learn", "computer vision", "llm", "large language model",
      "reinforcement learning", "generative ai", "agentic", "claude",
      "openai", "model", "inference", "training", "fine-tune", "prompt",
      "python", "classification", "transformer", "embedding", "vector",
      "spacy", "hugging face", "research", "perception", "robotics",
      "autonomous", "agent", "rl", "gpt", "diffusion", "vision",
      "rag", "retrieval", "semantic search", "vector database", "mcp",
      "lora", "fine tuning", "protein", "bioinformatics", "sequence"
    ],
    weight: 1.0
  },
  // Flask + Next.js + Supabase + AWS experience (Refr.store project)
  "SWE / Full-Stack": {
    color: "#3B82F6",
    keywords: [
      "software engineer", "software engineering", "full stack", "full-stack",
      "fullstack", "frontend", "front end", "front-end", "backend", "back end",
      "back-end", "react", "angular", "vue", "next.js", "node", "typescript",
      "javascript", "django", "flask", "express", "spring", "web developer",
      "web development", "mobile", "ios", "android", "flutter", "swift",
      "kotlin", "rest api", "graphql", "microservices", "devops", "cloud",
      "aws", "gcp", "azure", "docker", "kubernetes", "ci/cd", "supabase",
      "postgresql", "api development", "webhook"
    ],
    weight: 0.95
  },
  // Active data engineering role at Projectr Analytics — geospatial + ETL + AWS
  "Data Engineering": {
    color: "#06B6D4",
    keywords: [
      "data engineer", "data engineering", "etl", "spark", "airflow",
      "kafka", "dbt", "snowflake", "bigquery", "redshift", "databricks",
      "data platform", "data infrastructure", "data warehouse", "data lake",
      "orchestration", "streaming", "batch processing", "flink", "hadoop",
      "pipeline", "ingestion", "data ops", "postgres", "mysql",
      "nosql", "mongodb", "redis", "geospatial", "satellite", "aws",
      "ecs", "fargate", "docker", "timescaledb", "spatial data"
    ],
    weight: 0.95
  },
  // SQL + Power BI + CRM background from VT recruiting role
  "BI & Operations": {
    color: "#F59E0B",
    keywords: [
      "data analyst", "analytics", "business intelligence", "power bi",
      "tableau", "sql", "dashboard", "reporting", "crm", "salesforce",
      "operations", "data governance", "database", "visualization",
      "metrics", "kpi", "stakeholder", "admissions", "recruitment",
      "process", "automation", "workflow", "integration",
      "api", "supabase", "quality", "excel", "looker", "slate"
    ],
    weight: 0.9
  },
  // Multiple undergraduate research positions; strong stats/ML background
  "Data Science Research": {
    color: "#10B981",
    keywords: [
      "data science", "data scientist", "research", "statistical",
      "statistics", "hypothesis", "monte carlo", "optimization",
      "regression", "matlab", "scipy", "numpy", "pandas",
      "geospatial", "satellite", "computational", "modeling",
      "simulation", "numerical", "analysis", "quantitative",
      "experiment", "inference", "bayesian", "probability",
      "feature engineering", "prediction", "forecasting", "time series",
      "bioinformatics", "genomics", "scientific", "publication",
      "undergraduate research", "research assistant"
    ],
    weight: 0.95
  }
};

export const BONUS_KEYWORDS = [
  "remote", "python", "aws", "docker", "flask", "api",
  "supabase", "postgresql", "startup"
];

export const EDU_LABELS = { undergrad: "Undergrad", masters: "Master's", phd: "PhD" };
export const EDU_COLORS = { undergrad: "#10B981", masters: "#3B82F6", phd: "#A855F7" };

export const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied", color: "#8B5CF6" },
  { value: "phone_screen", label: "Phone Screen", color: "#3B82F6" },
  { value: "interview", label: "Interview", color: "#F59E0B" },
  { value: "offer", label: "Offer", color: "#10B981" },
  { value: "rejected", label: "Rejected", color: "#EF4444" },
  { value: "withdrawn", label: "Withdrawn", color: "#606078" },
];
