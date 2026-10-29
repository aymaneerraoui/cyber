CREATE TABLE IF NOT EXISTS cyber_server_config (
    guild_id TEXT NOT NULL,
    resource_key TEXT NOT NULL,
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, resource_key)
);
