FROM alpine:3.23@sha256:85fe1e81d6758c208f3e1eed4338a1997e19d4be002d4dd32d3100c9a8c010a0
RUN apk add --no-cache openssh-client && addgroup -g 10001 tunnel && adduser -D -u 10001 -G tunnel tunnel
USER 10001:10001
ENTRYPOINT ["ssh"]
CMD ["-N", "-T", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=/run/secrets/llm_known_hosts", "-o", "ExitOnForwardFailure=yes", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", "-i", "/run/secrets/llm_key", "-L", "0.0.0.0:11435:127.0.0.1:11435", "deep@192.168.0.230"]
