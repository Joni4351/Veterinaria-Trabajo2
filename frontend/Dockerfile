FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
# Same-origin API requests are forwarded by Nginx, without embedding host URLs or secrets.
ENV VITE_API_URL=""
RUN npm run build

FROM nginx:1.28-alpine@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236 AS runtime
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
USER nginx
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
