-- Optional HG snapshot columns per match pair (live list still computes from HG JSON on profiles).

CREATE TABLE "match_pair_hg_snapshot" (
    "match_id" TEXT NOT NULL,
    "children_unsure" BOOLEAN,
    "hg_children_status" TEXT,
    "hg_overall_status" TEXT,
    "hg_soft_pass_count" INTEGER,
    "hg_rank_penalty_applied" BOOLEAN,
    "hg_policy_version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_pair_hg_snapshot_pkey" PRIMARY KEY ("match_id")
);
