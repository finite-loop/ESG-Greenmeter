ALTER TABLE peer_organisations ADD COLUMN IF NOT EXISTS source_tenant_id UUID REFERENCES tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_peer_orgs_source_tenant ON peer_organisations(tenant_id, source_tenant_id) WHERE source_tenant_id IS NOT NULL;
