FROM node:22-bookworm
ARG GRAFT_VERSION=0.18.0
ENV DO_NOT_TRACK=1
RUN npm install --global @nanonets/graft@${GRAFT_VERSION} \
    && npm cache clean --force \
    && git config --global --add safe.directory /workspace
WORKDIR /workspace
ENTRYPOINT ["graft"]
