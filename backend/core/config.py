from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    github_token: str = ""
    allowed_origins: str = "http://localhost:3000"
    port: int = 8000

    # Ensemble weights — must sum to 1.0
    # 6-signal ensemble calibrated on 61-PR labeled dataset
    # WhatsMissing gets highest weight (ablation: Δ-0.241 F1 when removed)
    weight_missing:    float = 0.20
    weight_dris:       float = 0.22
    weight_ecs:        float = 0.20
    weight_engagement: float = 0.12
    weight_alignment:  float = 0.12
    weight_dss:        float = 0.10
    weight_density:    float = 0.04

    # DRIS thresholds (cosine similarity to diff)
    dris_red_threshold:   float = 0.72  # clearly mirrors diff
    dris_green_threshold: float = 0.42  # novel content

    # DSS threshold (how well diff chunk is covered by description)
    dss_uncovered_threshold: float = 0.42

    # Sentence transformer model
    st_model: str = "paraphrase-MiniLM-L3-v2"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
