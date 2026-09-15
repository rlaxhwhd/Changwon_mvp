FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-bookworm
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/frontend/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/frontend/entrypoint.sh /usr/local/bin/dreamcatch-entrypoint
RUN chmod +x /usr/local/bin/dreamcatch-entrypoint
ENTRYPOINT ["/usr/local/bin/dreamcatch-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
