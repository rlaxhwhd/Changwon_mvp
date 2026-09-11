CREATE TABLE dc.idempotency (
    actor_uid text REFERENCES dc.person(intg_uid), route text NOT NULL, key text NOT NULL,
    request_hash text NOT NULL, response jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_uid,route,key)
);
GRANT SELECT,INSERT ON dc.idempotency TO dc_app;
